'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const APPS = require('./apps');
const { openStore, getDigest } = require('./deploy-watch');
const { runApp, cleanupBuildnivo, assertIdle } = require('./app-runner');
const { createMailer } = require('./mailer');
const { runCycle } = require('./cycle');

function options(args) {
  let dryRun = false;
  let mock = false;
  let keys;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--mock') mock = true;
    else if (args[i] === '--apps') keys = (args[++i] || '').split(',');
    else throw new Error('Arguments : --dry-run [--mock] [--apps appKey,appKey].');
  }
  if (mock && !dryRun) throw new Error('--mock exige --dry-run.');
  if (keys && keys.some(key => !APPS.some(app => app.key === key))) throw new Error('appKey inconnu dans --apps.');
  return { dryRun, mock, apps: keys ? APPS.filter(app => keys.includes(app.key)) : APPS };
}

async function main(args = process.argv.slice(2)) {
  const { dryRun, mock, apps } = options(args);
  const log = message => console.log(`[automation] ${message}`);
  const controller = new AbortController();
  const mailer = createMailer({ dryRun, log });
  let store;
  let digest = app => getDigest(app, { auth: process.env.REGISTRY_AUTH });
  if (mock) {
    log('[dry-run] SIMULATION HORS LIGNE : PostgreSQL et registre simulés, aucun appel réseau ni écriture.');
    const fixed = `sha256:${'a'.repeat(64)}`;
    digest = async () => fixed;
    store = {
      read: async app => app.key === 'bvtech' ? { image_name: app.image, last_digest: fixed }
        : app.key === 'buildnivo' ? { image_name: app.image, last_digest: `sha256:${'b'.repeat(64)}` } : null,
      checked: async () => {},
      close: async () => {},
    };
  } else {
    if (!process.env.DATABASE_URL) log('AVERTISSEMENT : DATABASE_URL absent ; mode dégradé, aucune suite ne sera lancée.');
    else {
      try { store = await openStore({ dryRun, signal: controller }); }
      catch { log('AVERTISSEMENT : PostgreSQL indisponible ; mode dégradé, aucune suite ne sera lancée.'); }
      if (store === null) { log('Cycle ignoré : verrou déjà détenu par un autre cycle.'); return []; }
    }
  }
  try {
    const timeoutMs = Number(process.env.AUTOMATION_RUN_TIMEOUT_MS || 14400000);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 86400000) throw new Error('AUTOMATION_RUN_TIMEOUT_MS invalide.');
    return await runCycle({
      apps, store, digest, dryRun, mailer, log, signal: controller.signal,
      assertIdle, runApp: app => runApp(app, { signal: controller.signal, timeoutMs }), cleanup: cleanupBuildnivo,
    });
  } finally {
    if (store) await store.close().catch(() => log('AVERTISSEMENT : fermeture PostgreSQL interrompue.'));
  }
}

if (require.main === module) main().catch(() => {
  console.error('[automation] Cycle interrompu : vérifier les arguments et la configuration (voir automation/README.md).');
  process.exitCode = 1;
});

module.exports = { main, options };
