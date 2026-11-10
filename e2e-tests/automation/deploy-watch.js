'use strict';

const LOCK_KEY = 742019631;
const DDL = `CREATE TABLE IF NOT EXISTS deploy_watch (
  app_key TEXT PRIMARY KEY,
  image_name TEXT NOT NULL,
  last_digest TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

async function openStore({ dryRun, signal, pool = require('../database/db').pool }) {
  let client;
  const lost = () => signal.abort();
  try {
    client = await pool.connect();
    client.on('error', lost);
    const res = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [LOCK_KEY]);
    if (!res.rows[0].locked) {
      client.removeListener('error', lost);
      client.release(true);
      client = null;
      await pool.end();
      return null;
    }
    if (!dryRun) await client.query(DDL);
    return {
      async read(app) {
        const res = await client.query('SELECT image_name, last_digest FROM deploy_watch WHERE app_key = $1', [app.key]);
        return res.rows[0] || null;
      },
      async checked(app) {
        if (dryRun) return;
        await client.query(`INSERT INTO deploy_watch (app_key, image_name) VALUES ($1, $2)
          ON CONFLICT (app_key) DO UPDATE SET checked_at = NOW(), image_name = EXCLUDED.image_name,
          last_digest = CASE WHEN deploy_watch.image_name = EXCLUDED.image_name
                            THEN deploy_watch.last_digest ELSE NULL END`, [app.key, app.image]);
      },
      async acknowledge(app, digest) {
        if (dryRun) return;
        await client.query('UPDATE deploy_watch SET last_digest = $2 WHERE app_key = $1', [app.key, digest]);
      },
      async close() {
        try { await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]); }
        finally {
          client.removeListener('error', lost);
          client.release(true);
          await pool.end();
        }
      },
    };
  } catch {
    if (client) client.release(true);
    await pool.end();
    throw new Error('PostgreSQL indisponible ou schéma deploy_watch absent ; cycle sans exécution.');
  }
}

async function getDigest(app, { auth, fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const headers = { Accept: 'application/vnd.docker.distribution.manifest.v2+json' };
  if (auth) headers.Authorization = auth;
  const response = await fetchImpl(`https://registry.bluevaloris.com/v2/${app.image}/manifests/latest`, {
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
  });
  try {
    if (!response.ok) throw new Error(`Registre HTTP ${response.status}`);
    const digest = response.headers.get('Docker-Content-Digest');
    if (!digest || !/^sha256:[a-f0-9]{64}$/i.test(digest)) throw new Error('Digest absent ou invalide');
    return digest;
  } finally {
    if (response.body) await response.body.cancel();
  }
}

async function detect(apps, { store, digest, log }) {
  const rows = [];
  for (const app of apps) {
    try {
      const current = await digest(app);
      if (!store) {
        rows.push({ app, state: 'indéterminé : PostgreSQL indisponible' });
        log(`${app.key} : digest lu, comparaison impossible sans PostgreSQL.`);
        continue;
      }
      const previous = await store.read(app);
      await store.checked(app);
      const changed = !previous || previous.image_name !== app.image || previous.last_digest !== current;
      rows.push({ app, digest: current, changed, state: changed ? 'à tester : digest nouveau ou changé' : 'ignorée : digest inchangé' });
      log(`${app.key} : ${rows.at(-1).state}.`);
    } catch {
      rows.push({ app, state: 'indéterminé : registre ou PostgreSQL indisponible' });
      log(`${app.key} : vérification impossible (registre, authentification ou PostgreSQL) ; aucune exécution.`);
    }
  }
  return rows;
}

module.exports = { openStore, getDigest, detect };
