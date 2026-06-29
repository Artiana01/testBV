/**
 * database/history.js
 * ───────────────────
 * Service d'accès aux données d'historisation.
 * Toutes les fonctions sont async et gèrent silencieusement les erreurs
 * (si la DB est indisponible, les tests continuent normalement).
 *
 * API exportée :
 *   startRun(appKey, appLabel, testFiles)  → runId (integer) | null
 *   finishRun(runId, exitCode, stats)
 *   saveLog(runId, level, message)
 *   saveTestResult(runId, result)
 *   parseTestLine(line)                    → { testName, status, durationMs } | null
 *   getRuns({ app, status, limit, offset }) → [...]
 *   getRunById(id)                          → { run, results, logs }
 *   getStats(app?)                          → { totalRuns, passRate, byApp, trend }
 *   deleteRun(id)                           → boolean
 */

'use strict';

const { query } = require('./db');

// ── Niveaux de log à sauvegarder (lignes significatives uniquement) ───────────
const SAVE_LEVELS = new Set(['pass', 'fail', 'warn', 'summary', 'cmd', 'start', 'done']);

// ── Regex pour parser les lignes Playwright ──────────────────────────────────
// Format list reporter :
//   ok 1 › Suite › Test name  (123ms)
//   ✓  1 › Suite › Test name  (123ms)
//    x 2 › Suite › Test name  (456ms)  ← failed
// Format alternatif :
//   ✅ test name
//   ❌ test name
const RE_PLAYWRIGHT_OK   = /^\s*(?:ok|\u2713|\u2714|✓|✅)\s+\d+\s+(.+?)(?:\s+\((\d+(?:\.\d+)?)(ms|s|m)\))?\s*$/;
const RE_PLAYWRIGHT_FAIL = /^\s*(?:x|X|\u2717|✗|❌)\s+\d+\s+(.+?)(?:\s+\((\d+(?:\.\d+)?)(ms|s|m)\))?\s*$/;
const RE_LINE_ARROW_OK   = /^\s*✓\s+(.+?)(?:\s+\((\d+(?:\.\d+)?)(ms|s|m)\))?\s*$/;
const RE_LINE_ARROW_FAIL = /^\s*✘\s+(.+?)(?:\s+\((\d+(?:\.\d+)?)(ms|s|m)\))?\s*$/;
const RE_SUMMARY_PASSED  = /(\d+)\s+passed/;
const RE_SUMMARY_FAILED  = /(\d+)\s+failed/;
const RE_SUMMARY_SKIPPED = /(\d+)\s+skipped/;
const RE_DURATION_TOTAL  = /(\d+(?:\.\d+)?)(ms|s|m)\)/;

/**
 * Tente de parser une ligne Playwright pour en extraire le nom et le statut du test.
 * @param {string} line
 * @returns {{ testName: string, status: 'passed'|'failed', durationMs: number|null } | null}
 */
function parseTestLine(line) {
  const clean = line.trim();

  // Test réussi
  let m = RE_PLAYWRIGHT_OK.exec(clean) || RE_LINE_ARROW_OK.exec(clean);
  if (m) {
    const durationMs = m[2] ? parseDuration(m[2], m[3]) : null;
    return { testName: m[1].trim(), status: 'passed', durationMs };
  }

  // Test échoué
  m = RE_PLAYWRIGHT_FAIL.exec(clean) || RE_LINE_ARROW_FAIL.exec(clean);
  if (m) {
    const durationMs = m[2] ? parseDuration(m[2], m[3]) : null;
    return { testName: m[1].trim(), status: 'failed', durationMs };
  }

  return null;
}

function parseDuration(value, unit) {
  const n = parseFloat(value);
  if (unit === 's') return Math.round(n * 1000);
  if (unit === 'm') return Math.round(n * 60 * 1000);
  return Math.round(n); // ms
}

/**
 * Parse le résumé final Playwright (ex: "65 passed (6.7m)")
 */
function parseSummaryLine(line) {
  const mp = RE_SUMMARY_PASSED.exec(line);
  const mf = RE_SUMMARY_FAILED.exec(line);
  const ms = RE_SUMMARY_SKIPPED.exec(line);
  const md = RE_DURATION_TOTAL.exec(line);
  const passed  = mp ? parseInt(mp[1]) : null;
  const failed  = mf ? parseInt(mf[1]) : null;
  const skipped = ms ? parseInt(ms[1]) : null;
  const durationMs = md ? parseDuration(md[1], md[2]) : null;
  if (passed === null && failed === null && skipped === null && durationMs === null) return null;
  return { passed, failed, skipped, durationMs };
}

// ── Écriture ──────────────────────────────────────────────────────────────────

/**
 * Crée un nouveau run en base et retourne son ID.
 */
async function startRun(appKey, appLabel, testFiles = []) {
  try {
    const res = await query(
      `INSERT INTO campaign_runs (app_key, app_label, status, test_files, trigger)
       VALUES ($1, $2, 'running', $3::jsonb, 'manual')
       RETURNING id`,
      [appKey, appLabel, JSON.stringify(testFiles)]
    );
    return res.rows[0].id;
  } catch (err) {
    console.error('[DB] startRun error:', err.message);
    return null;
  }
}

/**
 * Clôture un run avec son code de sortie et ses statistiques agrégées.
 * @param {object} stats  { passed, failed, skipped, durationMs }
 */
async function finishRun(runId, exitCode, stats = {}) {
  if (!runId) return;
  const { passed = 0, failed = 0, skipped = 0, durationMs = null } = stats;
  const total  = passed + failed + skipped;
  const status = exitCode === 0 ? 'passed' : (exitCode === null ? 'stopped' : 'failed');

  try {
    await query(
      `UPDATE campaign_runs
       SET finished_at = NOW(),
           status      = $2,
           exit_code   = $3,
           total_tests = $4,
           passed      = $5,
           failed      = $6,
           skipped     = $7,
           duration_ms = $8
       WHERE id = $1`,
      [runId, status, exitCode, total, passed, failed, skipped, durationMs]
    );
  } catch (err) {
    console.error('[DB] finishRun error:', err.message);
  }
}

/**
 * Sauvegarde une ligne de log si son niveau est significatif.
 */
async function saveLog(runId, level, message) {
  if (!runId || !SAVE_LEVELS.has(level)) return;
  if (!message || message.trim().length === 0) return;
  try {
    await query(
      'INSERT INTO run_logs (run_id, level, message) VALUES ($1, $2, $3)',
      [runId, level, message.substring(0, 2000)]
    );
  } catch (err) {
    console.error('[DB] saveLog error:', err.message);
  }
}

/**
 * Sauvegarde le résultat d'un test individuel.
 */
async function saveTestResult(runId, { testName, testFile = null, status, durationMs = null, errorMsg = null }) {
  if (!runId) return;
  try {
    await query(
      `INSERT INTO test_results (run_id, test_name, test_file, status, duration_ms, error_msg)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [runId, testName, testFile, status, durationMs, errorMsg]
    );
  } catch (err) {
    console.error('[DB] saveTestResult error:', err.message);
  }
}

// ── Lecture ───────────────────────────────────────────────────────────────────

/**
 * Liste paginée des runs avec filtres optionnels.
 */
async function getRuns({ app = null, status = null, limit = 50, offset = 0 } = {}) {
  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (app && app !== 'all') {
      conditions.push(`app_key = $${idx++}`);
      params.push(app);
    }
    if (status && status !== 'all') {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);

    const sql = `
      SELECT id, app_key, app_label, started_at, finished_at,
             status, exit_code, total_tests, passed, failed, skipped, duration_ms, test_files
      FROM campaign_runs
      ${where}
      ORDER BY started_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const countSql = `SELECT COUNT(*) FROM campaign_runs ${where}`;
    const [rows, countRes] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, -2)),
    ]);
    return { runs: rows.rows, total: parseInt(countRes.rows[0].count) };
  } catch (err) {
    console.error('[DB] getRuns error:', err.message);
    return { runs: [], total: 0 };
  }
}

/**
 * Détail complet d'un run : métadonnées + résultats individuels + logs.
 */
async function getRunById(id) {
  try {
    const [runRes, resultsRes, logsRes] = await Promise.all([
      query('SELECT * FROM campaign_runs WHERE id = $1', [id]),
      query('SELECT * FROM test_results WHERE run_id = $1 ORDER BY id', [id]),
      query('SELECT * FROM run_logs WHERE run_id = $1 ORDER BY id', [id]),
    ]);
    if (runRes.rows.length === 0) return null;
    return {
      run:     runRes.rows[0],
      results: resultsRes.rows,
      logs:    logsRes.rows,
    };
  } catch (err) {
    console.error('[DB] getRunById error:', err.message);
    return null;
  }
}

/**
 * Statistiques globales ou par application.
 */
async function getStats(app = null) {
  try {
    const appFilter = app && app !== 'all' ? `WHERE app_key = '${app.replace(/'/g, "''")}'` : '';
    const trendAppFilter = app && app !== 'all' ? `AND app_key = '${app.replace(/'/g, "''")}'` : '';

    const globalSql = `
      SELECT
        COUNT(*)                                          AS total_runs,
        COUNT(*) FILTER (WHERE status = 'passed')        AS passed_runs,
        COUNT(*) FILTER (WHERE status = 'failed')        AS failed_runs,
        COUNT(*) FILTER (WHERE status = 'stopped')       AS stopped_runs,
        AVG(duration_ms)                                 AS avg_duration_ms,
        SUM(passed)                                      AS total_passed_tests,
        SUM(failed)                                      AS total_failed_tests
      FROM campaign_runs ${appFilter}
    `;

    const byAppSql = `
      SELECT
        app_key, app_label,
        COUNT(*)                                          AS runs,
        COALESCE(SUM(passed), 0)                          AS passed,
        COALESCE(SUM(failed), 0)                          AS failed,
        ROUND(
          100.0 * COALESCE(SUM(passed), 0)
          / NULLIF(COALESCE(SUM(passed), 0) + COALESCE(SUM(failed), 0), 0), 1
        )                                                 AS pass_rate
      FROM campaign_runs
      GROUP BY app_key, app_label
      ORDER BY runs DESC
    `;

    const trendSql = `
      SELECT
        DATE_TRUNC('day', started_at) AS day,
        app_key,
        COALESCE(SUM(passed), 0) + COALESCE(SUM(failed), 0) AS total,
        COALESCE(SUM(passed), 0)                            AS passed
      FROM campaign_runs
      WHERE started_at > NOW() - INTERVAL '30 days' ${trendAppFilter}
      GROUP BY day, app_key
      ORDER BY day ASC
    `;

    const [globalRes, byAppRes, trendRes] = await Promise.all([
      query(globalSql),
      query(byAppSql),
      query(trendSql),
    ]);

    const g = globalRes.rows[0];
    return {
      totalRuns:          parseInt(g.total_runs),
      passedRuns:         parseInt(g.passed_runs),
      failedRuns:         parseInt(g.failed_runs),
      stoppedRuns:        parseInt(g.stopped_runs),
      avgDurationMs:      g.avg_duration_ms ? Math.round(parseFloat(g.avg_duration_ms)) : null,
      totalPassedTests:   parseInt(g.total_passed_tests) || 0,
      totalFailedTests:   parseInt(g.total_failed_tests) || 0,
      passRate:           ((parseInt(g.total_passed_tests) || 0) + (parseInt(g.total_failed_tests) || 0)) > 0
        ? Math.round(100 * (parseInt(g.total_passed_tests) || 0) / ((parseInt(g.total_passed_tests) || 0) + (parseInt(g.total_failed_tests) || 0)))
        : 0,
      byApp:              byAppRes.rows,
      trend:              trendRes.rows,
    };
  } catch (err) {
    console.error('[DB] getStats error:', err.message);
    return { totalRuns: 0, passedRuns: 0, failedRuns: 0, passRate: 0, byApp: [], trend: [] };
  }
}

/**
 * Supprime un run et ses données associées (CASCADE).
 */
async function deleteRun(id) {
  try {
    const res = await query('DELETE FROM campaign_runs WHERE id = $1 RETURNING id', [id]);
    return res.rowCount > 0;
  } catch (err) {
    console.error('[DB] deleteRun error:', err.message);
    return false;
  }
}

module.exports = {
  parseTestLine,
  parseSummaryLine,
  startRun,
  finishRun,
  saveLog,
  saveTestResult,
  getRuns,
  getRunById,
  getStats,
  deleteRun,
};
