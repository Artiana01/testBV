'use strict';

const { detect } = require('./deploy-watch');

async function runCycle({ apps, store, digest, runApp, cleanup, assertIdle, mailer, dryRun, signal, log }) {
  const rows = await detect(apps, { store, digest, log });
  let interrupted = false;
  for (const row of rows) {
    if (!row.changed) continue;
    if (interrupted || signal?.aborted) {
      row.state = 'différée : file interrompue ; digest conservé';
      continue;
    }
    if (dryRun) {
      log(`[dry-run] ${row.app.key} : POST /run sur 127.0.0.1:${row.app.port}, attente de fin, puis app suivante.`);
      if (row.app.key === 'buildnivo') log('[dry-run] BuildNivo : nettoyage dédié prévu et attendu après le run.');
      log(`[dry-run] ${row.app.key} : alerte MAIL_ALERT_TO prévue si échec ; digest non modifié.`);
      row.state = 'simulation : serait testée (digest nouveau ou changé)';
      continue;
    }
    try {
      await assertIdle();
      if (signal?.aborted) throw new Error('Verrou perdu');
      const result = await runApp(row.app);
      row.result = result;
      row.state = `${result.state}${row.incomplete ? ' ; vérification partielle, digests conservés' : ''}`;
      log(`${row.app.key} : ${row.state}.`);
      if (result.failed) await mailer.alert(row.app, result);
      if (row.app.key === 'buildnivo' && result.started && result.stopped) {
        row.cleanup = (await cleanup()) ? 'réussi' : 'échoué';
        log(`buildnivo : nettoyage ${row.cleanup}.`);
      }
      if (result.completed && row.cleanup !== 'échoué' && !signal?.aborted) {
        if (row.incomplete) log(`${row.app.key} : vérification partielle ; tous les digests restent à reprendre.`);
        else await store.acknowledge(row.app, row.images);
      }
      if (result.abortQueue || row.cleanup === 'échoué') interrupted = true;
    } catch {
      row.state = 'différée : file interrompue ; digest conservé';
      log(`${row.app.key} : erreur d’orchestration ou suite active ; file interrompue.`);
      interrupted = true;
    }
  }
  await mailer.summary(rows);
  return rows;
}

module.exports = { runCycle };
