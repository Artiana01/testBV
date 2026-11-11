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
    read: async (app, image) => previous[app.key]?.[image.role] || null,
    acknowledge: async (app, images) => {
      acknowledgements.push([app.key, images]);
      previous[app.key] = Object.fromEntries(images.map(image => [image.role, { image_name: image.image, last_digest: image.digest }]));
    },
  };
}

function snapshot(app, digest = digestA) {
  return Object.fromEntries(app.images.map(image => [image.role, { image_name: image.image, last_digest: digest }]));
}

test('configuration : neuf projets, images nommées et rôles uniques sans champ image singulier', () => {
  assert.equal(APPS.length, 9);
  for (const app of APPS) {
    assert.equal(Object.hasOwn(app, 'image'), false);
    assert.ok(app.images.length > 0);
    assert.equal(new Set(app.images.map(image => image.role)).size, app.images.length);
    assert.ok(app.images.every(image => image.role && image.image));
  }
});

test('registre : route, Accept, Authorization, digest et rejet des réponses invalides', async () => {
  let cancelled = false;
  const fake = async (url, options) => {
    assert.equal(url, 'https://registry.bluevaloris.com/v2/app-buildnivo-dev/manifests/latest');
    for (const mediaType of [
      'application/vnd.oci.image.index.v1+json', 'application/vnd.docker.distribution.manifest.list.v2+json',
      'application/vnd.docker.distribution.manifest.v2+json', 'application/vnd.oci.image.manifest.v1+json',
    ]) assert.ok(options.headers.Accept.split(', ').includes(mediaType));
    assert.equal(options.headers.Authorization, 'Bearer valeur-simulée');
    assert.equal(options.redirect, 'error');
    return { ok: true, headers: new Headers({ 'Docker-Content-Digest': digestA }), body: { cancel: async () => { cancelled = true; } } };
  };
  assert.equal(await getDigest(APPS[0].images[0], { auth: 'Bearer valeur-simulée', fetchImpl: fake }), digestA);
  assert.ok(cancelled);
  for (const response of [
    new Response('', { status: 401 }), new Response('', { status: 404 }),
    new Response(''), new Response('', { headers: { 'Docker-Content-Digest': 'invalide' } }),
  ]) await assert.rejects(getDigest(APPS[0].images[0], { fetchImpl: async () => response }));
  await assert.rejects(getDigest(APPS[0].images[1], { timeoutMs: 1, fetchImpl: async (url, { signal }) => {
    assert.ok(url.includes('/api-buildnivo-dev/'));
    await delay(100, undefined, { signal });
  } }));
});

test('détection : digest changé, identique, premier passage, erreur isolée et DB absente', async () => {
  const store = memoryStore({
    buildnivo: snapshot(APPS[0], digestB),
    bvtech: snapshot(APPS[1]),
  });
  const rows = await detect(APPS.slice(0, 4), {
    store, log: quiet, digest: async image => { if (APPS[3].images.some(item => item.image === image.image)) throw new Error(); return digestA; },
  });
  assert.deepEqual(rows.map(row => row.changed), [true, false, true, false]);
  assert.equal(rows[3].incomplete, true);
  assert.deepEqual(store.acknowledgements, []);
  const offline = await detect(APPS.slice(0, 3), { store: null, digest: async () => digestA, log: quiet });
  assert.ok(offline.every(row => !row.changed && row.state.includes('indéterminé')));
});

test('détection : changement isolé front ou API, image absente ou renommée, et projet à une image', async () => {
  const app = APPS[0];
  for (const role of ['front', 'api']) {
    for (const reason of ['digest', 'absente', 'renommée']) {
      const previous = snapshot(app);
      if (reason === 'digest') previous[role].last_digest = digestB;
      if (reason === 'absente') delete previous[role];
      if (reason === 'renommée') previous[role].image_name = 'ancienne-image';
      const [row] = await detect([app], { store: memoryStore({ [app.key]: previous }), digest: async () => digestA, log: quiet });
      assert.equal(row.changed, true, `${role} : ${reason}`);
      assert.equal(row.images.length, 2);
      assert.equal(row.incomplete, false);
    }
  }
  const single = { ...app, images: [app.images[0]] };
  const [unchanged] = await detect([single], { store: memoryStore({ [app.key]: snapshot(single) }), digest: async () => digestA, log: quiet });
  assert.equal(unchanged.changed, false);
  assert.equal(unchanged.images.length, 1);
});

test('détection partielle : erreur isolée par image, changement connu maintenu, aucun acquittement incomplet', async () => {
  for (const failedRole of ['front', 'api']) {
    for (const changed of [false, true]) {
      const calls = [];
      const logs = [];
      const runs = [];
      const app = APPS[0];
      const store = memoryStore({ [app.key]: snapshot(app) });
      const rows = await runCycle({
        apps: APPS.slice(0, 2), store, log: message => logs.push(message),
        digest: async image => {
          calls.push(image.image);
          if (image.image === app.images.find(item => item.role === failedRole).image) throw new Error('erreur simulée confidentielle');
          return changed ? digestB : digestA;
        },
        assertIdle: async () => {}, runApp: async app => { runs.push(app.key); return { completed: true, state: 'terminé' }; },
        mailer: { summary: async () => {} },
      });
      assert.deepEqual(calls, APPS.slice(0, 2).flatMap(app => app.images.map(image => image.image)));
      assert.equal(rows[0].changed, changed);
      assert.equal(rows[0].incomplete, true);
      assert.ok(rows[0].state.includes(changed ? 'vérification partielle' : 'indéterminé'));
      assert.equal(rows[1].changed, true);
      assert.deepEqual(runs, changed ? ['buildnivo', 'bvtech'] : ['bvtech']);
      assert.deepEqual(store.acknowledgements.map(([key]) => key), ['bvtech']);
      assert.ok(logs.some(line => line.includes(`buildnivo/${failedRole}`) && line.includes('vérification impossible')));
      assert.ok(logs.every(line => !line.includes('confidentielle')));
    }
  }
});

test('verrou PostgreSQL : acquisition immédiate, migration transactionnelle, libération et dry-run sans écriture de digest', async () => {
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
      await store.checked(APPS[0], APPS[0].images[0]);
      await store.acknowledge(APPS[0], APPS[0].images.map(image => ({ ...image, digest: digestA })));
      await store.close();
      assert.equal(queries[1][0], 'BEGIN');
      assert.match(queries[2][0], /PRIMARY KEY \(app_key, role\)/);
      assert.match(queries[3][0], /ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'front'/);
      assert.equal(queries[4][0], 'COMMIT');
      assert.match(queries[5][0], /pg_advisory_unlock/);
    } else assert.equal(store, null);
    assert.match(queries[0][0], /pg_try_advisory_lock/);
    assert.ok(released && ended);
    assert.ok(queries.every(([sql]) => !/INSERT|UPDATE|DELETE|TRUNCATE/.test(sql)));
  }
});

test('PostgreSQL : lectures par rôle, changement de nom et acquittement atomique de toutes les images', async () => {
  const queries = [];
  const client = new EventEmitter();
  client.query = async (sql, params) => { queries.push([sql, params]); return { rows: [{ locked: true }] }; };
  client.release = () => {};
  const store = await openStore({ pool: { connect: async () => client, end: async () => {} }, signal: new AbortController() });
  const app = APPS[0];
  for (const image of app.images) {
    await store.read(app, image);
    const [readSql, readParams] = queries.at(-1);
    assert.match(readSql, /app_key = \$1 AND role = \$2/);
    assert.deepEqual(readParams, [app.key, image.role]);
    await store.checked(app, image);
    const [checkedSql, checkedParams] = queries.at(-1);
    assert.match(checkedSql, /ON CONFLICT \(app_key, role\)/);
    assert.match(checkedSql, /THEN deploy_watch.last_digest ELSE NULL END/);
    assert.deepEqual(checkedParams, [app.key, image.role, image.image]);
  }
  const images = app.images.map((image, index) => ({ ...image, digest: index ? digestB : digestA }));
  const before = queries.length;
  await store.acknowledge(app, images);
  assert.equal(queries.length, before + 1);
  const [sql, params] = queries.at(-1);
  assert.match(sql, /jsonb_to_recordset/);
  assert.match(sql, /ON CONFLICT \(app_key, role\)/);
  assert.deepEqual(params, [app.key, JSON.stringify(images)]);
  await store.close();
});

test('PostgreSQL : migration échouée annulée et connexion libérée', async () => {
  const queries = [];
  let released = false;
  let ended = false;
  const client = new EventEmitter();
  client.query = async sql => {
    queries.push(sql);
    if (sql.includes('ADD COLUMN')) throw new Error('erreur simulée confidentielle');
    return { rows: [{ locked: true }] };
  };
  client.release = () => { released = true; };
  await assert.rejects(openStore({ pool: { connect: async () => client, end: async () => { ended = true; } }, signal: new AbortController() }),
    { message: 'PostgreSQL indisponible ou schéma deploy_watch absent ; cycle sans exécution.' });
  assert.equal(queries.at(-1), 'ROLLBACK');
  assert.ok(!queries.includes('COMMIT'));
  assert.ok(released && ended);
});

test('cycle : API seule modifiée, deux digests acquittés après le run, puis projet ignoré', async () => {
  const app = APPS[0];
  const previous = snapshot(app);
  previous.api.last_digest = digestB;
  const store = memoryStore({ [app.key]: previous });
  let runs = 0;
  const settings = {
    apps: [app], store, digest: async () => digestA, log: quiet,
    assertIdle: async () => {}, runApp: async () => { runs++; return { completed: true, state: 'terminé' }; },
    mailer: { summary: async () => {} },
  };
  await runCycle(settings);
  assert.deepEqual(store.acknowledgements, [[app.key, app.images.map(image => ({ ...image, digest: digestA }))]]);
  const [next] = await runCycle(settings);
  assert.equal(next.changed, false);
  assert.equal(runs, 1);
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
