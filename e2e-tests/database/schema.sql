-- ============================================================
-- schema.sql — Historisation des tests E2E Playwright
-- Référence documentaire — appliqué programmatiquement par db.js
-- ============================================================

-- ── Campagnes d'exécution ────────────────────────────────────
-- Une ligne par lancement de tests (via UI ou CLI)
CREATE TABLE IF NOT EXISTS campaign_runs (
  id          SERIAL PRIMARY KEY,
  app_key     TEXT    NOT NULL,                       -- 'bvtech', 'bvbusiness', etc.
  app_label   TEXT    NOT NULL,                       -- 'BV Tech', 'BV Business', etc.
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),     -- heure de début
  finished_at TIMESTAMPTZ,                            -- NULL si toujours en cours
  status      TEXT    NOT NULL DEFAULT 'running'      -- état courant
              CHECK (status IN ('running','passed','failed','stopped')),
  exit_code   INTEGER,                                -- code retour Playwright
  total_tests INTEGER NOT NULL DEFAULT 0,             -- nb total de tests
  passed      INTEGER NOT NULL DEFAULT 0,
  failed      INTEGER NOT NULL DEFAULT 0,
  skipped     INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,                                -- durée totale en ms
  test_files  JSONB,                                  -- tableau des fichiers sélectionnés
  trigger     TEXT    NOT NULL DEFAULT 'manual'       -- 'manual'|'ci'|'scheduled'
);

-- ── Résultats individuels par test ───────────────────────────
-- Un test Playwright = une ligne (relation N→1 vers campaign_runs)
CREATE TABLE IF NOT EXISTS test_results (
  id          SERIAL PRIMARY KEY,
  run_id      INTEGER NOT NULL REFERENCES campaign_runs(id) ON DELETE CASCADE,
  test_name   TEXT    NOT NULL,                       -- nom du test (extrait de Playwright)
  test_file   TEXT,                                   -- fichier .spec.ts source
  status      TEXT    NOT NULL                        -- résultat individuel
              CHECK (status IN ('passed','failed','skipped')),
  duration_ms INTEGER,
  error_msg   TEXT,                                   -- message d'erreur (si failed)
  retry_count INTEGER NOT NULL DEFAULT 0
);

-- ── Logs bruts filtrés ───────────────────────────────────────
-- Seulement les lignes significatives (pass/fail/warn/summary/cmd/done)
-- Les lignes 'info' verbeux sont exclues pour limiter la taille
CREATE TABLE IF NOT EXISTS run_logs (
  id      SERIAL PRIMARY KEY,
  run_id  INTEGER NOT NULL REFERENCES campaign_runs(id) ON DELETE CASCADE,
  ts      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level   TEXT NOT NULL                               -- niveau de log
          CHECK (level IN ('pass','fail','warn','summary','cmd','start','done')),
  message TEXT NOT NULL
);

-- ── Index de performance ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_runs_app_key     ON campaign_runs(app_key);
CREATE INDEX IF NOT EXISTS idx_runs_started_at  ON campaign_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status       ON campaign_runs(status);
CREATE INDEX IF NOT EXISTS idx_results_run_id    ON test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_results_status    ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_logs_run_id       ON run_logs(run_id);
