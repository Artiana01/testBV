'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const APPS = require('./apps');

async function status(app, fetchImpl = fetch) {
  const response = await fetchImpl(`http://127.0.0.1:${app.port}/status`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Statut HTTP indisponible');
  const value = await response.json();
  if (value.appKey !== app.key || typeof value.running !== 'boolean') throw new Error('Serveur inattendu');
  return value;
}

async function assertIdle(fetchImpl = fetch, apps = APPS) {
  for (const app of apps) {
    const value = await status(app, fetchImpl);
    if (value.running) throw new Error('Une suite est déjà active ; file interrompue sans lancement.');
  }
}

async function runApp(app, { signal, timeoutMs = 14400000, fetchImpl = fetch, pollMs = 2000 } = {}) {
  const { parseTestLine, parseSummaryLine } = require('../database/history');
  const controller = new AbortController();
  const deadline = AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
  const base = `http://127.0.0.1:${app.port}`;
  let started = false;
  let dispatched = false;
  let terminal = false;
  let stopped = false;
  let done;
  let streamError = false;
  const failures = new Set();
  const counts = { passed: 0, failed: 0, skipped: 0 };
  try {
    const current = await status(app, fetchImpl);
    if (current.running) return { state: 'différée : suite déjà active', completed: false };
    const response = await fetchImpl(`${base}/events`, { signal: deadline });
    if (!response.ok || !response.body) throw new Error('Flux SSE indisponible');
    const reader = response.body.getReader();
    let readyResolve;
    let readyReject;
    const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
    const consume = (async () => {
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r/g, '');
          if (buffer.length > 4 * 1024 * 1024) throw new Error('Événement SSE trop volumineux');
          let end;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
            if (!data) continue;
            const event = JSON.parse(data);
            if (event.type === 'connected') {
              if (event.running) readyReject(new Error('Suite déjà active'));
              else readyResolve();
            }
            if (event.type === 'start') started = true;
            if (event.type === 'fail-detail' && event.title) failures.add(event.title);
            if (event.type === 'pass' || event.type === 'fail') {
              const test = parseTestLine(event.message || '');
              if (test) {
                counts[test.status]++;
                if (test.status === 'failed') failures.add(test.testName);
              }
            }
            if (event.type === 'summary') {
              const summary = parseSummaryLine(event.message || '');
              if (summary) for (const key of Object.keys(counts)) if (summary[key] !== null) counts[key] = summary[key];
            }
            if (event.type === 'done' || event.type === 'error') {
              terminal = true;
              done = event;
              return;
            }
          }
        }
        throw new Error('Flux SSE interrompu');
      } catch {
        streamError = true;
        readyReject(new Error('Flux SSE indisponible'));
      } finally {
        await reader.cancel().catch(() => {});
      }
    })();
    await Promise.race([
      ready,
      delay(10000, undefined, { signal: deadline }).then(() => { throw new Error('Connexion SSE expirée'); }),
    ]);
    dispatched = true;
    const launched = await fetchImpl(`${base}/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tests: ['all'] }),
      signal: AbortSignal.any([deadline, AbortSignal.timeout(10000)]),
    });
    if (!launched.ok || !(await launched.json()).ok) throw new Error('Lancement refusé');
    while (!terminal) {
      if (streamError) throw new Error('Flux SSE interrompu');
      await delay(pollMs, undefined, { signal: deadline });
      const currentStatus = await status(app, fetchImpl);
      if (!currentStatus.running) {
        stopped = true;
        if (!terminal) throw new Error('Suite arrêtée sans résultat SSE');
      }
    }
    await consume;
    const finalStatus = await status(app, fetchImpl);
    stopped = !finalStatus.running;
    if (!stopped) throw new Error('Fin de suite non confirmée');
    const failed = counts.failed > 0 || done.success !== true;
    return {
      completed: started && done.type === 'done' && Number.isInteger(done.code),
      started, stopped, counts, failures: [...failures], failed,
      state: failed ? 'échec' : 'succès',
    };
  } catch {
    if (dispatched && !stopped) {
      try { stopped = !(await status(app, fetchImpl)).running; } catch {}
    }
    return {
      completed: false, started, stopped, failed: true, counts, failures: [...failures],
      abortQueue: !stopped && dispatched,
      state: 'résultat indéterminé : lancement, SSE ou délai ; digest conservé',
    };
  } finally {
    controller.abort();
  }
}

async function cleanupBuildnivo({ spawnImpl = spawn } = {}) {
  const root = path.resolve(__dirname, '..');
  const cli = require.resolve('@playwright/test/cli', { paths: [root] });
  return new Promise(resolve => {
    const child = spawnImpl(process.execPath, [cli, 'test', '--config=playwright.buildnivo.cleanup.config.ts'], {
      cwd: root, env: { ...process.env, FORCE_COLOR: '0' }, stdio: 'ignore', shell: false,
    });
    child.once('error', () => resolve(false));
    child.once('close', code => resolve(code === 0));
  });
}

module.exports = { status, assertIdle, runApp, cleanupBuildnivo };
