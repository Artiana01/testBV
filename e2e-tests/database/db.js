/**
 * database/db.js
 * ─────────────
 * Pool PostgreSQL singleton + initialisation automatique du schéma.
 * Utilise la variable d'environnement DATABASE_URL (standard Railway).
 *
 * Usage :
 *   const { pool, query } = require('./database/db');
 *   const rows = await query('SELECT * FROM campaign_runs ORDER BY id DESC LIMIT 10');
 */

'use strict';

const { Pool } = require('pg');
require('dotenv').config();

// ── Pool de connexions ────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Erreur inattendue sur un client inactif :', err.message);
});

// ── Helper query ──────────────────────────────────────────────────────────────
async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// ── Initialisation du schéma ──────────────────────────────────────────────────
async function initSchema() {
  const ddl = `
    -- ── Table : campagnes d'exécution ───────────────────────────────────────
    CREATE TABLE IF NOT EXISTS campaign_runs (
      id          SERIAL PRIMARY KEY,
      app_key     TEXT    NOT NULL,
      app_label   TEXT    NOT NULL,
      started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      status      TEXT    NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running','passed','failed','stopped')),
      exit_code   INTEGER,
      total_tests INTEGER NOT NULL DEFAULT 0,
      passed      INTEGER NOT NULL DEFAULT 0,
      failed      INTEGER NOT NULL DEFAULT 0,
      skipped     INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER,
      test_files  JSONB,
      trigger     TEXT    NOT NULL DEFAULT 'manual'
    );

    -- ── Index pour requêtes courantes ────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_runs_app_key    ON campaign_runs(app_key);
    CREATE INDEX IF NOT EXISTS idx_runs_started_at ON campaign_runs(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runs_status      ON campaign_runs(status);

    -- ── Table : résultats individuels par test ───────────────────────────────
    CREATE TABLE IF NOT EXISTS test_results (
      id          SERIAL PRIMARY KEY,
      run_id      INTEGER NOT NULL REFERENCES campaign_runs(id) ON DELETE CASCADE,
      test_name   TEXT    NOT NULL,
      test_file   TEXT,
      status      TEXT    NOT NULL CHECK (status IN ('passed','failed','skipped')),
      duration_ms INTEGER,
      error_msg   TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_results_run_id ON test_results(run_id);
    CREATE INDEX IF NOT EXISTS idx_results_status  ON test_results(status);

    -- ── Table : logs bruts (lignes significatives uniquement) ────────────────
    CREATE TABLE IF NOT EXISTS run_logs (
      id      SERIAL PRIMARY KEY,
      run_id  INTEGER NOT NULL REFERENCES campaign_runs(id) ON DELETE CASCADE,
      ts      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      level   TEXT NOT NULL CHECK (level IN ('pass','fail','warn','summary','cmd','start','done')),
      message TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_logs_run_id ON run_logs(run_id);
  `;

  try {
    await query(ddl);
    console.log('[DB] Schéma PostgreSQL initialisé ✓');
  } catch (err) {
    console.error('[DB] Erreur lors de l\'initialisation du schéma :', err.message);
    throw err;
  }
}

// ── Vérification de connexion + init au démarrage ────────────────────────────
async function connect() {
  if (!process.env.DATABASE_URL) {
    console.warn('[DB] ⚠️  DATABASE_URL non défini — historisation désactivée.');
    return false;
  }
  try {
    await query('SELECT 1');
    await initSchema();
    return true;
  } catch (err) {
    console.error('[DB] ❌ Impossible de se connecter à PostgreSQL :', err.message);
    return false;
  }
}

module.exports = { pool, query, connect };
