'use strict';

const LOCK_KEY = 742019631;
const DDL = `CREATE TABLE IF NOT EXISTS deploy_watch (
  app_key TEXT NOT NULL,
  role TEXT NOT NULL,
  image_name TEXT NOT NULL,
  last_digest TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_key, role)
)`;
const MIGRATION = `ALTER TABLE deploy_watch ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'front';
DO $$
DECLARE legacy_key TEXT;
BEGIN
  SELECT conname INTO legacy_key FROM pg_constraint
    WHERE conrelid = 'deploy_watch'::regclass AND contype = 'p'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
        WHERE attrelid = 'deploy_watch'::regclass AND attname = 'app_key')];
  IF legacy_key IS NOT NULL THEN
    EXECUTE format('ALTER TABLE deploy_watch DROP CONSTRAINT %I', legacy_key);
    ALTER TABLE deploy_watch ADD PRIMARY KEY (app_key, role);
  END IF;
END; $$;
ALTER TABLE deploy_watch ALTER COLUMN role DROP DEFAULT`;

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
    await client.query('BEGIN');
    try {
      await client.query(DDL);
      await client.query(MIGRATION);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    return {
      async read(app, image) {
        const res = await client.query('SELECT image_name, last_digest FROM deploy_watch WHERE app_key = $1 AND role = $2', [app.key, image.role]);
        return res.rows[0] || null;
      },
      async checked(app, image) {
        if (dryRun) return;
        await client.query(`INSERT INTO deploy_watch (app_key, role, image_name) VALUES ($1, $2, $3)
          ON CONFLICT (app_key, role) DO UPDATE SET checked_at = NOW(), image_name = EXCLUDED.image_name,
          last_digest = CASE WHEN deploy_watch.image_name = EXCLUDED.image_name
                            THEN deploy_watch.last_digest ELSE NULL END`, [app.key, image.role, image.image]);
      },
      async acknowledge(app, images) {
        if (dryRun) return;
        await client.query(`INSERT INTO deploy_watch (app_key, role, image_name, last_digest)
          SELECT $1, role, image, digest FROM jsonb_to_recordset($2::jsonb) AS images(role TEXT, image TEXT, digest TEXT) WHERE TRUE
          ON CONFLICT (app_key, role) DO UPDATE SET image_name = EXCLUDED.image_name, last_digest = EXCLUDED.last_digest`,
          [app.key, JSON.stringify(images)]);
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

async function getDigest(image, { auth, fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  // Les images buildx sont poussees en manifest-list/OCI index ; sans ces
  // types dans Accept, le registre repond quand meme 200 mais omet l'en-tete
  // Docker-Content-Digest.
  const headers = {
    Accept: [
      'application/vnd.oci.image.index.v1+json',
      'application/vnd.docker.distribution.manifest.list.v2+json',
      'application/vnd.docker.distribution.manifest.v2+json',
      'application/vnd.oci.image.manifest.v1+json',
    ].join(', '),
  };
  if (auth) headers.Authorization = auth;
  const response = await fetchImpl(`https://registry.bluevaloris.com/v2/${image.image}/manifests/latest`, {
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
    const images = [];
    let changed = false;
    let incomplete = false;
    for (const image of app.images) {
      try {
        const current = await digest(image);
        if (!store) {
          incomplete = true;
          log(`${app.key}/${image.role} (${image.image}) : digest lu, comparaison impossible sans PostgreSQL.`);
          continue;
        }
        const previous = await store.read(app, image);
        await store.checked(app, image);
        const imageChanged = !previous || previous.image_name !== image.image || previous.last_digest !== current;
        changed ||= imageChanged;
        images.push({ ...image, digest: current });
        log(`${app.key}/${image.role} (${image.image}) : digest ${imageChanged ? 'nouveau ou changé' : 'inchangé'}.`);
      } catch {
        incomplete = true;
        log(`${app.key}/${image.role} (${image.image}) : vérification impossible (registre, authentification ou PostgreSQL) ; poursuite des autres images.`);
      }
    }
    const state = changed
      ? `à tester : digest nouveau ou changé${incomplete ? ' ; vérification partielle, digests conservés' : ''}`
      : incomplete ? 'indéterminé : registre ou PostgreSQL indisponible' : 'ignorée : digests inchangés';
    rows.push({ app, images, changed, incomplete, state });
    log(`${app.key} : ${state}.`);
  }
  return rows;
}

module.exports = { openStore, getDigest, detect };
