'use strict';

function redact(value, env = process.env) {
  let result = String(value);
  const secrets = Object.entries(env).filter(([key, val]) => val && /PASSWORD|SECRET|TOKEN|AUTH|DATABASE_URL/i.test(key)).map(([, val]) => val);
  if (env.REGISTRY_AUTH?.startsWith('Basic ')) {
    const decoded = Buffer.from(env.REGISTRY_AUTH.slice(6), 'base64').toString();
    secrets.push(decoded, decoded.slice(decoded.indexOf(':') + 1));
  }
  for (const secret of secrets.sort((a, b) => b.length - a.length)) if (secret) result = result.split(secret).join('[masqué]');
  return result;
}

function createMailer({ env = process.env, dryRun = false, log = console.log, transportFactory } = {}) {
  let transport;
  async function send(recipientKey, subject, text) {
    const to = (env[recipientKey] || '').split(',').map(value => value.trim()).filter(Boolean);
    if (!to.length) { log(`AVERTISSEMENT : ${recipientKey} absent ou vide ; aucun mail envoyé.`); return; }
    if (dryRun) { log(`[dry-run] Mail prévu : ${subject} (${recipientKey}), aucun envoi.`); return; }
    if (!env.SMTP_HOST || !env.SMTP_FROM || !env.SMTP_PORT) {
      log('AVERTISSEMENT : SMTP_HOST, SMTP_PORT ou SMTP_FROM absent ; aucun mail envoyé.'); return;
    }
    try {
      if (!transport) {
        const port = Number(env.SMTP_PORT);
        if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port SMTP invalide');
        transport = (transportFactory || require('nodemailer').createTransport)({
          host: env.SMTP_HOST, port, secure: env.SMTP_SECURE === 'true',
          auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
          connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 30000,
          logger: false, debug: false,
        });
      }
      await transport.sendMail({ from: env.SMTP_FROM, to, subject: redact(subject, env), text: redact(text, env) });
      log(`Mail envoyé (${recipientKey}).`);
    } catch { log(`AVERTISSEMENT : envoi SMTP impossible (${recipientKey}) ; cycle poursuivi.`); }
  }
  return {
    alert(app, result) {
      return send('MAIL_ALERT_TO', `[E2E] Échec ${app.key}`, [
        `Application : ${app.key}`, `Résultat : ${result.state}`,
        ...result.failures.map(name => `- ${name}`),
        ...(result.failures.length ? [] : ['Liste des tests indisponible (erreur de lancement ou flux incomplet).']),
      ].join('\n'));
    },
    summary(rows) {
      return send('MAIL_SUMMARY_TO', '[E2E] Récapitulatif du cycle', rows.map(row => {
        const counts = row.result?.counts;
        return `${row.app.key} : ${row.state}${counts ? ` ; ${counts.passed} réussis, ${counts.failed} échoués, ${counts.skipped} ignorés (${counts.passed + counts.failed + counts.skipped} tests)` : ''}${row.cleanup ? ` ; nettoyage ${row.cleanup}` : ''}`;
      }).join('\n'));
    },
  };
}

module.exports = { createMailer, redact };
