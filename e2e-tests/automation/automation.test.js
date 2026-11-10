'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const APPS = require('./apps');
const { openStore, getDigest, detect } = require('./deploy-watch');
const { runCycle } = require('./cycle');
const { runApp, assertIdle, cleanupBuildnivo } = require('./app-runner');
const { createMailer, redact } = require('./mailer');
const { main, options } = require('./run-cycle');

const digestA = `sha256:${'a'.repeat(64)}`;
const digestB = `sha256:${'b'.repeat(64)}`;
const quiet = () => {};

function memoryStore(previous = {}) {
  const acknowledgements = [];
  return {
    acknowledgements, checked: async () => {},
    read: async app => previous[app.key] || null,
    acknowledge: async (app, digest) => acknowledgements.push([app.key, digest]),
  };
}

test('registre : route, Accept, Authorization, digest et rejet des réponses invalides', async () => {
  let cancelled = false;
  const fake = async (url, options) => {
    assert.equal(url, 'https://registry.bluevaloris.com/v2/app-buildnivo-dev/manifests/latest');
    assert.equal(options.headers.Accept, 'application/vnd.docker.distribution.manifest.v2+json');
    assert.equal(options.headers.Authorization, 'Bearer valeur-simulée');
    assert.equal(options.redirect, 'error');
    return { ok: true, headers: new Headers({ 'Docker-Content-Digest': digestA }), body: { cancel: async () => { cancelled = true; } } };
  };
  assert.equal(await getDigest(APPS[0], { auth: 'Bearer valeur-simulée', fetchImpl: fake }), digestA);
  assert.ok(cancelled);
  for (const response of [
    new Response('', { status: 401 }), new Response('', { headers: { 'Docker-Content-Digest': 'invalide' } }),
  ]) await assert.rejects(getDigest(APPS[0], { fetchImpl: async () => response }));
});

test('détection : digest changé, identique, premier passage, erreur isolée et DB absente', async () => {
  const store = memoryStore({
    buildnivo: { image_name: APPS[0].image, last_digest: digestB },
    bvtech: { image_name: APPS[1].image, last_digest: digestA },
  });
  const rows = await detect(APPS.slice(0, 4), {
    store, log: quiet, digest: async app => { if (app.key === 'bvinvest') throw new Error(); return digestA; },
  });
  assert.deepEqual(rows.map(row => row.changed), [true, false, true, undefined]);
  assert.deepEqual(store.acknowledgements, []);
  const offline = await detect(APPS.slice(0, 3), { store: null, digest: async () => digestA, log: quiet });
  assert.ok(offline.every(row => !row.changed && row.state.includes('indéterminé')));
});

test('verrou PostgreSQL : acquisition immédiate, tour ignoré, libération et dry-run sans DDL', async () => {
  for (const locked of [false, true]) {
    const queries = [];
    let released = false;
    let ended = false;
    const client = new EventEmitter();
    client.query = async (sql, params) => {
      queries.push([sql, params]);
      return { rows: [{ locked }] };
    };
    client.release = destroy => { assert.equal(destroy, true); released = true; };
    const pool = { connect: async () => client, end: async () => { ended = true; } };
    const store = await openStore({ dryRun: true, signal: new AbortController(), pool });
    if (locked) {
      assert.ok(store);
      await store.checked(APPS[0]);
      await store.acknowledge(APPS[0], digestA);
      await store.close();
      assert.equal(queries.length, 2);
      assert.match(queries[1][0], /pg_advisory_unlock/);
    } else assert.equal(store, null);
    assert.match(queries[0][0], /pg_try_advisory_lock/);
    assert.ok(released && ended);
    assert.ok(queries.every(([sql]) => !/CREATE|INSERT|UPDATE/.test(sql)));
  }
});

test('file sérielle : alerte immédiate, nettoyage seulement BuildNivo, puis récapitulatif', async () => {
  const order = [];
  let active = 0;
  const store = memoryStore();
  const rows = await runCycle({
    apps: APPS.slice(0, 3), store, digest: async () => digestA, log: quiet,
    assertIdle: async () => {},
    runApp: async app => {
      assert.equal(active++, 0);
      order.push(`start:${app.key}`);
      await delay(5);
      active--;
      order.push(`end:${app.key}`);
      return { started: true, stopped: true, completed: true, failed: app.key === 'buildnivo', failures: ['Test simulé'], state: 'terminé', counts: { passed: 2, failed: 1, skipped: 0 } };
    },
    cleanup: async () => { assert.equal(active++, 0); await delay(5); active--; order.push('cleanup'); return true; },
    mailer: { alert: async app => order.push(`alert:${app.key}`), summary: async () => order.push('summary') },
  });
  assert.deepEqual(order, ['start:buildnivo', 'end:buildnivo', 'alert:buildnivo', 'cleanup', 'start:bvtech', 'end:bvtech', 'start:bvbusiness', 'end:bvbusiness', 'summary']);
  assert.equal(rows[0].cleanup, 'réussi');
  assert.equal(store.acknowledgements.length, 3);
});

test('run indéterminé ou nettoyage échoué : arrêt de file et aucun digest acquitté', async () => {
  for (const cleanupFailure of [false, true]) {
    const store = memoryStore();
    let runs = 0;
    const rows = await runCycle({
      apps: APPS.slice(0, 3), store, digest: async () => digestA, log: quiet,
      assertIdle: async () => {},
      runApp: async () => { runs++; return {
        started: true, stopped: cleanupFailure, completed: cleanupFailure, abortQueue: !cleanupFailure,
        failed: true, failures: [], state: 'échec',
      }; },
      cleanup: async () => false, mailer: { alert: async () => {}, summary: async () => {} },
    });
    assert.equal(runs, 1);
    assert.equal(store.acknowledgements.length, 0);
    assert.ok(rows[1].state.includes('file interrompue'));
  }
});

function fakeApp({ drop = false, busy = false, failed = false } = {}) {
  let stream;
  let running = busy;
  let posts = 0;
  const emit = value => stream.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`));
  const fetchImpl = async (url, options = {}) => {
    const route = new URL(url).pathname;
    if (route === '/status') return Response.json({ appKey: 'buildnivo', running });
    if (route === '/events') {
      const body = new ReadableStream({
        start(controller) { stream = controller; emit({ type: 'connected', running }); },
      });
      options.signal.addEventListener('abort', () => { try { stream.error(new Error('fermé')); } catch {} }, { once: true });
      return new Response(body);
    }
    if (route === '/run') {
      posts++;
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), { tests: ['all'] });
      running = true;
      emit({ type: 'start' });
      if (drop) { stream.close(); return Response.json({ ok: true }); }
      emit({ type: failed ? 'fail' : 'pass', message: `${failed ? 'x' : 'ok'} 1 Test simulé (10ms)` });
      if (failed) emit({ type: 'fail-detail', title: 'Test simulé' });
      emit({ type: 'summary', message: failed ? '1 failed (1s)' : '1 passed (1s)' });
      running = false;
      emit({ type: 'done', success: !failed, code: failed ? 1 : 0 });
      return Response.json({ ok: true });
    }
    throw new Error('Route inattendue');
  };
  return { fetchImpl, posts: () => posts };
}

test('API existante : SSE ouvert avant POST, résultats succès/échec et compteurs', async () => {
  for (const failed of [false, true]) {
    const server = fakeApp({ failed });
    const result = await runApp(APPS[0], { fetchImpl: server.fetchImpl, pollMs: 1, timeoutMs: 1000 });
    assert.equal(result.completed, true);
    assert.equal(result.failed, failed);
    assert.equal(result.stopped, true);
    assert.equal(result.counts[failed ? 'failed' : 'passed'], 1);
    assert.equal(server.posts(), 1);
    if (failed) assert.ok(result.failures.includes('Test simulé'));
  }
});

test('suite active ou flux perdu : aucun lancement concurrent, interruption de file', async () => {
  const busy = fakeApp({ busy: true });
  const result = await runApp(APPS[0], { fetchImpl: busy.fetchImpl });
  assert.equal(result.completed, false);
  assert.equal(busy.posts(), 0);
  await assert.rejects(assertIdle(busy.fetchImpl, [APPS[0]]));
  const drop = fakeApp({ drop: true });
  const lost = await runApp(APPS[0], { fetchImpl: drop.fetchImpl, pollMs: 1, timeoutMs: 1000 });
  assert.equal(lost.abortQueue, true);
  assert.equal(lost.completed, false);
});

test('nettoyage : sous-processus asynchrone existant, sortie ignorée et attente de fermeture', async () => {
  const child = new EventEmitter();
  let resolved = false;
  const result = cleanupBuildnivo({ spawnImpl: (executable, args, settings) => {
    assert.equal(executable, process.execPath);
    assert.ok(args.includes('--config=playwright.buildnivo.cleanup.config.ts'));
    assert.equal(settings.stdio, 'ignore');
    return child;
  } }).then(value => { resolved = true; return value; });
  await delay(1);
  assert.equal(resolved, false);
  child.emit('close', 0);
  assert.equal(await result, true);
});

test('SMTP : destinataires distincts, absents, erreurs et dry-run sans transport', async () => {
  const messages = [];
  const warnings = [];
  const env = {
    SMTP_HOST: 'smtp.invalid', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_FROM: 'sender@example.invalid',
    MAIL_ALERT_TO: 'alert@example.invalid, second@example.invalid', MAIL_SUMMARY_TO: 'summary@example.invalid',
  };
  const factory = config => {
    assert.equal(config.secure, true);
    return { sendMail: async message => messages.push(message) };
  };
  const mailer = createMailer({ env, log: value => warnings.push(value), transportFactory: factory });
  await mailer.alert(APPS[0], { state: 'échec', failures: ['Test simulé'] });
  await mailer.summary([{ app: APPS[0], state: 'échec' }]);
  assert.equal(messages.length, 2);
  assert.deepEqual(messages[0].to, ['alert@example.invalid', 'second@example.invalid']);
  assert.deepEqual(messages[1].to, ['summary@example.invalid']);
  assert.match(messages[0].text, /Test simulé/);
  const dry = createMailer({ env, dryRun: true, log: quiet, transportFactory: () => assert.fail('Transport interdit') });
  await dry.alert(APPS[0], { state: 'échec', failures: [] });
  const absent = createMailer({ env: {}, log: value => warnings.push(value) });
  await absent.alert(APPS[0], { state: 'échec', failures: [] });
  await absent.summary([]);
  assert.ok(warnings.some(value => value.includes('MAIL_ALERT_TO absent')));
  assert.ok(warnings.some(value => value.includes('MAIL_SUMMARY_TO absent')));
  const broken = createMailer({ env, log: value => warnings.push(value), transportFactory: () => { throw new Error('erreur simulée'); } });
  await broken.summary([]);
  assert.ok(warnings.some(value => value.includes('envoi SMTP impossible')));
  assert.equal(redact('valeur-simulée', { TEST_PASSWORD: 'valeur-simulée' }), '[masqué]');
});

test('dry-run : aucune exécution, aucun nettoyage, aucune écriture, mode mock réservé', async () => {
  const store = memoryStore();
  const rows = await runCycle({
    apps: APPS.slice(0, 3), store, digest: async () => digestA, log: quiet, dryRun: true,
    runApp: () => assert.fail('Run interdit'), cleanup: () => assert.fail('Nettoyage interdit'),
    assertIdle: () => assert.fail('API serveur interdite'), mailer: { summary: async () => {} },
  });
  assert.equal(rows.length, 3);
  assert.equal(store.acknowledgements.length, 0);
  assert.throws(() => options(['--mock']));
  assert.throws(() => options(['--apps', 'inconnu']));
  const simulated = await main(['--dry-run', '--mock', '--apps', 'buildnivo,bvtech,bvbusiness']);
  assert.deepEqual(simulated.map(row => row.changed), [true, false, true]);
});
