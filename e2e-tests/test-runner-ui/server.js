/**
 * test-runner-ui/server.js
 * -------------------------
 * Interface web pour lancer les tests Playwright BV Tech & BV Business.
 * Accessible sur http://localhost:4000
 *
 * Démarrage : node test-runner-ui/server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const url = require('url');

const TEST_RESULTS_DIR = path.join(__dirname, '..', 'test-results');

const PORT         = process.env.PORT || 4000;
const HTML_FILE    = path.join(__dirname, 'index.html');
const APP_HTML_FILE = path.join(__dirname, 'app.html');
const ROOT_DIR     = path.join(__dirname, '..');

// Configs Playwright disponibles
const CONFIGS = {
  bvtech:     'playwright.bvtech.config.ts',
  bvbusiness: 'playwright.bvbusiness.config.ts',
  bvinvest:   'playwright.bvinvest.config.ts',
  emiragate:  'playwright.emiragate.config.ts',
  bvportage:  'playwright.bvportage.config.ts',
  bvportageFreelance: 'playwright.bvportage-freelance.config.ts',
  creerailleurs: 'playwright.creerailleurs.config.ts',
  launchpad: 'playwright.launchpad.config.ts',
};

// Tests BV Tech
const TESTS_BVTECH = {
  'e2e-01-signup':         { file: 'apps/bvtech/tests/e2e-01-signup.spec.ts',           label: 'E2E-01 — Inscription (Signup)' },
  'e2e-02-login':          { file: 'apps/bvtech/tests/e2e-02-login-navigation.spec.ts',  label: 'E2E-02 — Connexion & Navigation' },
  'e2e-03-profile':        { file: 'apps/bvtech/tests/e2e-03-profile.spec.ts',           label: 'E2E-03 — Profil Client' },
  'e2e-04-dashboard':      { file: 'apps/bvtech/tests/e2e-04-dashboard.spec.ts',         label: 'E2E-04 — Dashboard Client' },
  'e2e-05-admin-login':    { file: 'apps/bvtech/tests/e2e-05-admin-login.spec.ts',       label: 'E2E-05 — Connexion Admin' },
  'e2e-06-admin-users':    { file: 'apps/bvtech/tests/e2e-06-admin-users.spec.ts',       label: 'E2E-06 — Gestion Utilisateurs (Admin)' },
  'e2e-07-admin-packs':    { file: 'apps/bvtech/tests/e2e-07-admin-packs.spec.ts',       label: 'E2E-07 — Gestion Packs (Admin)' },
  'e2e-08-admin-payments': { file: 'apps/bvtech/tests/e2e-08-admin-payments.spec.ts',    label: 'E2E-08 — Paiements (Admin)' },
  'e2e-09-admin-contacts': { file: 'apps/bvtech/tests/e2e-09-admin-contacts.spec.ts',    label: 'E2E-09 — Contacts (Admin)' },
  'regression':            { file: 'apps/bvtech/tests/regression.spec.ts',               label: 'Régression Complète' },
};

// Tests BV Business
const TESTS_BVBUSINESS = {
  'e2e-01-signup':    { file: 'apps/bvbusiness/tests/e2e-01-signup.spec.ts',           label: 'SC-01 — Inscription (Signup)' },
  'e2e-02-login':     { file: 'apps/bvbusiness/tests/e2e-02-login-dashboard.spec.ts',  label: 'SC-02 — Login & Dashboard' },
  'e2e-03-packages':  { file: 'apps/bvbusiness/tests/e2e-03-packages.spec.ts',         label: 'SC-03 — Packages & Pricing' },
  'e2e-04-navigation':{ file: 'apps/bvbusiness/tests/e2e-04-navigation.spec.ts',       label: 'SC-04 — Navigation Admin' },
  'e2e-05-content':   { file: 'apps/bvbusiness/tests/e2e-05-admin-content.spec.ts',    label: 'SC-05 — Content Management' },
  'e2e-06-media':     { file: 'apps/bvbusiness/tests/e2e-06-admin-media.spec.ts',      label: 'SC-06 — Media Library' },
  'e2e-07-regional':  { file: 'apps/bvbusiness/tests/e2e-07-regional-content.spec.ts', label: 'SC-07 — Contenu Régional' },
  'e2e-08-users':     { file: 'apps/bvbusiness/tests/e2e-08-admin-users.spec.ts',      label: 'SC-08 — Gestion Utilisateurs' },
  'e2e-09-payments':  { file: 'apps/bvbusiness/tests/e2e-09-admin-payments.spec.ts',   label: 'SC-09 — Paiements Admin' },
  'regression':       { file: 'apps/bvbusiness/tests/regression.spec.ts',              label: 'Régression Complète' },
};

// Tests BV Invest
const TESTS_BVINVEST = {
  'e2e-01-login':          { file: 'apps/bvinvest/tests/e2e-01-login.spec.ts',           label: 'SC-01 — Connexion utilisateur' },
  'e2e-02-member':         { file: 'apps/bvinvest/tests/e2e-02-member-space.spec.ts',     label: 'SC-02 — Espace Membre' },
  'e2e-03-packages':       { file: 'apps/bvinvest/tests/e2e-03-packages.spec.ts',         label: 'SC-03 — Packages & Souscription' },
  'e2e-04-opportunities':  { file: 'apps/bvinvest/tests/e2e-04-opportunities.spec.ts',    label: 'SC-04/07 — Opportunités & Documents' },
  'e2e-05-kyc':            { file: 'apps/bvinvest/tests/e2e-05-kyc-pipeline.spec.ts',     label: 'SC-05 — Pipeline KYC/AML' },
  'e2e-06-profile':        { file: 'apps/bvinvest/tests/e2e-06-profile.spec.ts',          label: 'SC-06 — Profil Utilisateur' },
  'e2e-08-admin-access':   { file: 'apps/bvinvest/tests/e2e-08-admin-access.spec.ts',     label: 'SC-08 — Demandes d\'Accès (Admin)' },
  'e2e-09-admin-dashboard':{ file: 'apps/bvinvest/tests/e2e-09-admin-dashboard.spec.ts',  label: 'SC-09 — Dashboard Admin' },
  'e2e-10-navigation':     { file: 'apps/bvinvest/tests/e2e-10-navigation.spec.ts',       label: 'SC-10 — Navigation Globale' },
  'e2e-11-analytics':      { file: 'apps/bvinvest/tests/e2e-11-analytics.spec.ts',        label: 'SC-11 — Analytics & Stats' },
  'regression':            { file: 'apps/bvinvest/tests/regression.spec.ts',              label: 'Régression Complète' },
};

// Tests Emiragate (BV Install)
const TESTS_EMIRAGATE = {
  'e2e-01-login':     { file: 'apps/emiragate/tests/e2e-01-admin-login.spec.ts',    label: 'SC-01 — Connexion Admin' },
  'e2e-02-dashboard': { file: 'apps/emiragate/tests/e2e-02-admin-dashboard.spec.ts',label: 'SC-02 — Dashboard Admin' },
  'e2e-03-conduit':   { file: 'apps/emiragate/tests/e2e-03-conduit.spec.ts',        label: 'SC-03 — Leads / Conduit' },
  'e2e-04-signup':    { file: 'apps/emiragate/tests/e2e-04-signup.spec.ts',         label: 'SC-04 — Inscription Client' },
  'e2e-05-client':    { file: 'apps/emiragate/tests/e2e-05-client-login.spec.ts',   label: 'SC-05 — Connexion Client' },
  'e2e-06-profile':   { file: 'apps/emiragate/tests/e2e-06-profile.spec.ts',        label: 'SC-06 — Profil Utilisateur' },
  'e2e-07-users':     { file: 'apps/emiragate/tests/e2e-07-admin-users.spec.ts',    label: 'SC-07 — Gestion Utilisateurs' },
  'e2e-08-contacts':  { file: 'apps/emiragate/tests/e2e-08-contacts.spec.ts',       label: 'SC-08 — Gestion Contacts' },
  'e2e-09-analytics': { file: 'apps/emiragate/tests/e2e-09-analytics.spec.ts',      label: 'SC-09 — Analytique' },
  'e2e-10-navigation':{ file: 'apps/emiragate/tests/e2e-10-navigation.spec.ts',     label: 'SC-10/11 — Navigation & Déconnexion' },
  'regression':       { file: 'apps/emiragate/tests/regression.spec.ts',            label: 'Régression Complète' },
};

// Tests BV Portage (Portage Salarial - Agence)
const TESTS_BVPORTAGE = {
  'e2e-01-signup-activation': { file: 'apps/bvportage/tests/e2e-01-signup-activation.spec.ts',       label: 'E2E-01 — Inscription + OTP (Agence)' },
  'e2e-02-login-pack-subscription': { file: 'apps/bvportage/tests/e2e-02-login-pack-subscription.spec.ts', label: 'E2E-02 — Login + Pack 159€' },
  'e2e-03-client-creation': { file: 'apps/bvportage/tests/e2e-03-client-creation.spec.ts',           label: 'E2E-03 — Client + Projet' },
  'e2e-04-mission-contract-kyc': { file: 'apps/bvportage/tests/e2e-04-mission-contract-kyc.spec.ts', label: 'E2E-04 — Mission + Contrat + KYC' },
  'e2e-05-contract-signature': { file: 'apps/bvportage/tests/e2e-05-contract-signature.spec.ts',     label: 'E2E-05 — Signature Contrat' },
  'e2e-06-invoice-payment': { file: 'apps/bvportage/tests/e2e-06-invoice-payment.spec.ts',           label: 'E2E-06 — Facturation + Paiement' },
  'e2e-07-team-invitation': { file: 'apps/bvportage/tests/e2e-07-team-invitation.spec.ts',           label: 'E2E-07 — Invitation Équipe' },
  'e2e-08-reversal': { file: 'apps/bvportage/tests/e2e-08-reversal.spec.ts',                          label: 'E2E-08 — Reversement' },
};

// Tests BV Portage (Portage Salarial - Freelance)
const TESTS_BVPORTAGE_FREELANCE = {
  'e2e-01-signup-otp': { file: 'apps/bvportage-freelance/tests/e2e-01-signup-otp.spec.ts',           label: 'E2E-01 — Inscription Freelance + OTP' },
  'e2e-02-pack-subscription': { file: 'apps/bvportage-freelance/tests/e2e-02-pack-subscription.spec.ts', label: 'E2E-02 — Souscription Pack (79€)' },
  'e2e-03-project-client': { file: 'apps/bvportage-freelance/tests/e2e-03-project-client.spec.ts',   label: 'E2E-03 — Création Projet + Client' },
  'e2e-04-mission-contract-signature': { file: 'apps/bvportage-freelance/tests/e2e-04-mission-contract-signature.spec.ts', label: 'E2E-04 — Mission + Contrat + Signature' },
  'e2e-05-kyc-admin-validation': { file: 'apps/bvportage-freelance/tests/e2e-05-kyc-admin-validation.spec.ts', label: 'E2E-05 — KYC + Validation Admin' },
  'e2e-06-invoice-payment': { file: 'apps/bvportage-freelance/tests/e2e-06-invoice-payment.spec.ts',     label: 'E2E-06 — Facturation + Paiement' },
  'e2e-07-reset-password': { file: 'apps/bvportage-freelance/tests/e2e-07-reset-password.spec.ts',       label: 'E2E-07 — Reset Mot de passe' },
  'e2e-08-profile': { file: 'apps/bvportage-freelance/tests/e2e-08-profile.spec.ts',                     label: 'E2E-08 — Gestion Profil' },
  'e2e-09-edge-cases': { file: 'apps/bvportage-freelance/tests/e2e-09-edge-cases.spec.ts',               label: 'E2E-09 — Cas limites & comptes' },
};

// Tests Launchpad BV TECH
const TESTS_LAUNCHPAD = {
  'e2e-01-signup':        { file: 'apps/launchpad/tests/e2e-01-signup-activation.spec.ts',  label: 'E2E-01 — Activation & Inscription (P0)' },
  'e2e-02-login':         { file: 'apps/launchpad/tests/e2e-02-login-dashboard.spec.ts',    label: 'E2E-02 — Connexion & Dashboard (P0)' },
  'e2e-03-packs':         { file: 'apps/launchpad/tests/e2e-03-pack-purchase.spec.ts',      label: 'E2E-03 — Achat Pack + Paiement (P0)' },
  'e2e-04-profile':       { file: 'apps/launchpad/tests/e2e-04-profile.spec.ts',            label: 'E2E-04 — Profil Utilisateur (P1)' },
  'e2e-05-security':      { file: 'apps/launchpad/tests/e2e-05-security.spec.ts',           label: 'E2E-05 — Sécurité / Mot de passe (P1)' },
  'e2e-06-notifications': { file: 'apps/launchpad/tests/e2e-06-notifications.spec.ts',      label: 'E2E-06 — Notifications & Emails (P1)' },
  'e2e-07-messaging':     { file: 'apps/launchpad/tests/e2e-07-messaging.spec.ts',          label: 'E2E-07 — Messagerie Client ↔ Admin (P2)' },
  'regression':           { file: 'apps/launchpad/tests/regression.spec.ts',               label: 'Régression Complète' },
};

// Tests Créer Ailleurs
const TESTS_CREERAILLEURS = {
  'e2e-01-navigation':  { file: 'apps/creerailleurs/tests/e2e-01-navigation.spec.ts',      label: 'SC-01 — Navigation & Accessibilité' },
  'e2e-02-cta':         { file: 'apps/creerailleurs/tests/e2e-02-cta-redirections.spec.ts', label: 'SC-02 — CTAs & Redirections' },
  'e2e-03-signup':      { file: 'apps/creerailleurs/tests/e2e-03-signup.spec.ts',           label: 'SC-03 — Inscription' },
  'e2e-04-login':       { file: 'apps/creerailleurs/tests/e2e-04-login.spec.ts',            label: 'SC-04 — Connexion' },
  'e2e-05-tunnel':      { file: 'apps/creerailleurs/tests/e2e-05-tunnel-vente.spec.ts',     label: 'SC-05 — Tunnel de Vente' },
  'e2e-06-guest':       { file: 'apps/creerailleurs/tests/e2e-06-achat-sans-compte.spec.ts',label: 'SC-06 — Achat sans Compte' },
  'e2e-07-dashboard':   { file: 'apps/creerailleurs/tests/e2e-07-dashboard-user.spec.ts',   label: 'SC-07 — Dashboard Utilisateur' },
  'e2e-08-admin':       { file: 'apps/creerailleurs/tests/e2e-08-admin.spec.ts',            label: 'SC-08 — Dashboard Admin' },
  'e2e-09-multilingue': { file: 'apps/creerailleurs/tests/e2e-09-multilingue.spec.ts',      label: 'SC-09 — Multilingue FR/EN' },
};

// ── Registry des apps (pour le hub et le rendu de app.html) ──────────────────
const APP_REGISTRY = {
  bvtech:             { label: 'BV Tech',              url: 'https://dev.bluevaloristech.com',          color: '#6366f1', tests: TESTS_BVTECH },
  bvbusiness:         { label: 'BV Business',           url: 'https://staging.bluevalorisbusiness.com',  color: '#0ea5e9', tests: TESTS_BVBUSINESS },
  bvinvest:           { label: 'BV Invest',             url: 'https://dev.bluevalorisinvest.com',        color: '#10b981', tests: TESTS_BVINVEST },
  emiragate:          { label: 'Emiragate',             url: 'https://dev.bluevalorisinstall.com',       color: '#f59e0b', tests: TESTS_EMIRAGATE },
  bvportage:          { label: 'BV Portage',            url: 'https://dev.bluevalorisportage.com',      color: '#ec4899', tests: TESTS_BVPORTAGE },
  bvportageFreelance: { label: 'BV Portage Freelance',  url: 'https://dev.bluevalorisportage.com',      color: '#d946ef', tests: TESTS_BVPORTAGE_FREELANCE },
  creerailleurs:      { label: 'Créer Ailleurs',        url: 'https://www.creerailleurs.com',            color: '#f97316', tests: TESTS_CREERAILLEURS },
  launchpad:          { label: 'Launchpad BV TECH',     url: 'https://staging.bluevaloristech.com',      color: '#14b8a6', tests: TESTS_LAUNCHPAD },
};

function generateHubHTML() {
  const cards = Object.entries(APP_REGISTRY).map(([key, app]) => `
    <a href="/?app=${key}" class="card" style="--c:${app.color}">
      <div class="dot"></div>
      <div class="info">
        <div class="name">${app.label}</div>
        <div class="url">${app.url.replace('https://', '')}</div>
      </div>
      <div class="arrow">→</div>
    </a>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Tests E2E — Hub</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px;padding:40px 20px}
    h1{font-size:24px;font-weight:700;display:flex;align-items:center;gap:12px}
    h1 span{font-size:28px}
    .subtitle{font-size:13px;color:#64748b;margin-top:4px;text-align:center}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;width:100%;max-width:960px}
    .card{display:flex;align-items:center;gap:14px;padding:18px 20px;background:#1a1d27;border:1px solid #2e3349;border-left:4px solid var(--c);border-radius:10px;text-decoration:none;color:#e2e8f0;transition:all .15s}
    .card:hover{background:#22263a;border-color:var(--c);transform:translateX(3px)}
    .dot{width:10px;height:10px;border-radius:50%;background:var(--c);flex-shrink:0;box-shadow:0 0 8px var(--c)}
    .info{flex:1;min-width:0}
    .name{font-weight:600;font-size:15px}
    .url{font-size:11px;color:#64748b;margin-top:3px;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .arrow{color:#64748b;font-size:18px;transition:color .15s;flex-shrink:0}
    .card:hover .arrow{color:var(--c)}
    .footer{font-size:11px;color:#334155;margin-top:8px}
  </style>
</head>
<body>
  <div>
    <h1><span>🎭</span> Tests E2E — Hub</h1>
    <p class="subtitle">Cliquez sur une app pour ouvrir son interface de test dédiée</p>
  </div>
  <div class="grid">${cards}</div>
  <div class="footer">Toutes les apps tournent sur le même serveur — aucune interférence possible</div>
</body>
</html>`;
}

// Clients SSE actifs
let sseClients = [];

// Processus Playwright en cours
let runningProcess = null;
let isRunning = false;
let lastApp = 'bvtech';
let testsStopped = false;  // Flag pour tracker si l'arrêt a été demandé

function sendToAllClients(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => {
    try { res.write(payload); } catch (_) {}
  });
}

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '');
}

function classifyLine(line) {
  const clean = stripAnsi(line).trim();
  if (/^ok\s+\d+\s/.test(clean)) return 'pass';
  if (/^x\s+\d+\s/.test(clean)) return 'fail';
  // Lignes résumé final : "65 passed (6.7m)", "3 failed" → 'summary' pour que les KPIs se mettent à jour
  if (/^\d+\s+passed/.test(clean) || /^\d+\s+failed/.test(clean)) return 'summary';
  if (/✓|✅/.test(clean)) return 'pass';
  if (/✗|×|❌/.test(clean)) return 'fail';
  if (/^Running \d+ test|^Finished|workers|suite/i.test(clean)) return 'summary';
  if (/passed.*failed|failed.*passed|\d+ (passed|failed|skipped)/i.test(clean)) return 'summary';
  if (/Error:|⚠|warn|WARN|rate limit|limite/i.test(clean)) return 'warn';
  if (/✅\s*Session|sauvegardée|🚀|Sessions prêtes/i.test(clean)) return 'pass';
  if (/⚠️|Connexion.*échouée|❌/i.test(clean)) return 'warn';
  return 'info';
}

function appKeyToSlug(appKey) {
  // Convertir camelCase en kebab-case : bvportageFreelance → bvportage-freelance
  return appKey.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function makeRunOutputDir(appKey) {
  const slug = appKeyToSlug(appKey);
  const runName = `ui-run-${slug}-${Date.now()}`;
  return path.join('test-results', runName);
}

function runTests(selectedTests, app) {
  if (isRunning && runningProcess) {
    sendToAllClients({ type: 'error', message: '⛔ Un test est déjà en cours (app: ' + lastApp + '). Arrêtez-le avant de relancer.' });
    return;
  }

  const appKey = ['bvbusiness', 'bvinvest', 'emiragate', 'bvportage', 'bvportageFreelance', 'creerailleurs', 'launchpad'].includes(app) ? app : 'bvtech';
  const config = CONFIGS[appKey];
  
  if (!config) {
    sendToAllClients({ type: 'error', message: '❌ Configuration invalide pour l\'app: ' + appKey });
    return;
  }

  const testsMap = { bvbusiness: TESTS_BVBUSINESS, bvinvest: TESTS_BVINVEST, emiragate: TESTS_EMIRAGATE, bvportage: TESTS_BVPORTAGE, bvportageFreelance: TESTS_BVPORTAGE_FREELANCE, creerailleurs: TESTS_CREERAILLEURS, launchpad: TESTS_LAUNCHPAD }[appKey] ?? TESTS_BVTECH;
  const appLabel = { bvbusiness: 'BV Business', bvinvest: 'BV Invest', emiragate: 'Emiragate', bvportage: 'BV Portage', bvportageFreelance: 'BV Portage Freelance', creerailleurs: 'Créer Ailleurs', launchpad: 'Launchpad BV TECH' }[appKey] ?? 'BV Tech';

  // Tuer tout processus précédent
  if (runningProcess) {
    try {
      runningProcess.kill('SIGKILL');
    } catch (e) {
      console.log('Impossible de tuer le processus précédent:', e.message);
    }
    runningProcess = null;
  }

  isRunning = true;
  lastApp = appKey;
  testsStopped = false;  // Réinitialiser le flag
  sendToAllClients({ type: 'start', message: `🚀 Démarrage des tests ${appLabel}...` });

  const outputDir = makeRunOutputDir(appKey);
  const args = [
    'playwright', 'test',
    '--config', config,
    '--reporter=list',
    '--output', outputDir,
  ];

  // IMPORTANT: Passer les fichiers de tests AVEC des chemins relatifs corrects
  // pour que Playwright les découvre dans le bon testDir de la config.
  // Ne JAMAIS passer le chemin sans le dossier app.
  if (selectedTests && selectedTests.length > 0 && !selectedTests.includes('all')) {
    const testFiles = [];
    selectedTests.forEach(key => {
      const t = testsMap[key];
      if (t && t.file) {
        testFiles.push(t.file);
      }
    });
    
    // Ajouter tous les fichiers comme arguments positionnels
    args.push(...testFiles);
  }
  // Si aucun test sélectionné, ne pas ajouter d'args spécifiques
  // Playwright utilisera testDir du config

  sendToAllClients({ type: 'cmd', message: `npx ${args.join(' ')}` });

  runningProcess = spawn('npx', args, {
    cwd: ROOT_DIR,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  runningProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (!line.trim()) return;
      const type = classifyLine(line);
      sendToAllClients({ type, message: stripAnsi(line) });
    });
  });

  runningProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (!line.trim()) return;
      const type = classifyLine(line);
      sendToAllClients({ type, message: stripAnsi(line) });
    });
  });

  runningProcess.on('close', (code) => {
    // Si l'arrêt a été demandé manuellement, ne pas envoyer de notification 'done'
    // (on l'a déjà envoyée dans stopTests)
    if (testsStopped) {
      isRunning = false;
      runningProcess = null;
      testsStopped = false;
      return;
    }
    
    isRunning = false;
    runningProcess = null;
    const success = code === 0;
    sendToAllClients({
      type: 'done',
      success,
      code,
      message: success
        ? '✅ Tous les tests ont réussi !'
        : `❌ Des tests ont échoué (code: ${code})`,
    });
  });

  runningProcess.on('error', (err) => {
    isRunning = false;
    runningProcess = null;
    sendToAllClients({ type: 'error', message: `Erreur de démarrage : ${err.message}` });
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  // === SSE : connexion temps réel ===
  if (parsed.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', running: isRunning })}\n\n`);
    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  // === POST /run : lancer les tests ===
  if (req.method === 'POST' && parsed.pathname === '/run') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let selected = [];
      let app = 'bvtech';
      try {
        const parsed = JSON.parse(body);
        selected = parsed.tests || [];
        app = parsed.app || 'bvtech';
      } catch (_) {}
      runTests(selected, app);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // === POST /stop : arrêter les tests ===
  if (req.method === 'POST' && parsed.pathname === '/stop') {
    if (runningProcess) {
      try {
        // Marquer comme arrêté avant de tuer le processus
        testsStopped = true;
        
        // Supprimer les listeners immédiatement pour éviter les logs après arrêt
        runningProcess.removeAllListeners('data');
        runningProcess.stdout?.removeAllListeners();
        runningProcess.stderr?.removeAllListeners();
        
        // Tuer le processus avec force
        runningProcess.kill('SIGKILL');
        isRunning = false;
        
        // Nettoyer la référence après un timeout court
        setTimeout(() => {
          if (runningProcess) {
            try { runningProcess.kill('SIGKILL'); } catch (_) {}
            runningProcess = null;
          }
        }, 500);
        
        sendToAllClients({ type: 'warn', message: '⛔ Tests arrêtés par l\'utilisateur.' });
        sendToAllClients({ type: 'done', success: false, message: 'Tests arrêtés.' });
      } catch (e) {
        console.error('Erreur lors de l\'arrêt des tests:', e.message);
        isRunning = false;
        testsStopped = false;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // === GET /status : état courant ===
  if (parsed.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ running: isRunning, tests: { bvtech: TESTS_BVTECH, bvbusiness: TESTS_BVBUSINESS, bvinvest: TESTS_BVINVEST, emiragate: TESTS_EMIRAGATE, bvportage: TESTS_BVPORTAGE, bvportageFreelance: TESTS_BVPORTAGE_FREELANCE, creerailleurs: TESTS_CREERAILLEURS, launchpad: TESTS_LAUNCHPAD } }));
    return;
  }

  // === GET /failures?app=bvtech|bvbusiness : liste des dossiers d'échec filtrés par app ===
  if (parsed.pathname === '/failures') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (!fs.existsSync(TEST_RESULTS_DIR)) {
      res.end(JSON.stringify([]));
      return;
    }
    const appFilter = parsed.query.app || null; // 'bvtech' | 'bvbusiness' | null

    const found = [];

    // Vérifie si un dossier ui-run-* correspond à l'app filtrée
    // Le nom du dossier est maintenant : ui-run-{appKey}-{timestamp}
    // ou pour l'ancien format (rétro-compat) : ui-run-{timestamp}
    function runDirMatchesApp(runDirName, filter) {
      if (!filter) return true;
      const n = runDirName.replace(/\\/g, '/');
      // Format : ui-run-{appSlug}-{timestamp} (ex: ui-run-bvportage-freelance-1234567)
      if (filter === 'bvportageFreelance') return /^ui-run-bvportage-freelance-\d/.test(n);
      if (filter === 'bvportage')          return /^ui-run-bvportage-\d/.test(n);
      if (filter === 'bvtech')             return /^ui-run-bvtech-\d/.test(n);
      if (filter === 'bvbusiness')         return /^ui-run-bvbusiness-\d/.test(n);
      if (filter === 'bvinvest')           return /^ui-run-bvinvest-\d/.test(n);
      if (filter === 'emiragate')          return /^ui-run-emiragate-\d/.test(n);
      if (filter === 'creerailleurs')      return /^ui-run-creerailleurs-\d/.test(n);
      if (filter === 'launchpad')          return /^ui-run-launchpad-\d/.test(n);
      return false;
    }

    // Pour rétro-compatibilité : ancien format ui-run-{timestamp} sans appKey
    function legacyNameMatchesApp(name, filter) {
      if (!filter) return true;
      const n = name.replace(/\\/g, '/');
      if (filter === 'bvtech'            && n.includes('-bvtech-'))            return true;
      if (filter === 'bvbusiness'         && n.includes('-bvbusiness-'))         return true;
      if (filter === 'bvinvest'           && n.includes('-bvinvest-'))           return true;
      if (filter === 'emiragate'          && n.includes('-emiragate-'))          return true;
      if (filter === 'bvportage'          && n.includes('-bvportage-') && !n.includes('-bvportage-freelance-')) return true;
      if (filter === 'bvportageFreelance' && n.includes('-bvportage-freelance-')) return true;
      if (filter === 'launchpad'          && n.includes('-launchpad-'))           return true;
      return false;
    }

    fs.readdirSync(TEST_RESULTS_DIR).forEach(runDirName => {
      const runDir = path.join(TEST_RESULTS_DIR, runDirName);
      if (!fs.statSync(runDir).isDirectory()) return;

      const isNewFormat = /^ui-run-[a-z]/.test(runDirName); // ui-run-bvtech-... vs ui-run-1234567...
      const parentMatches = !appFilter || runDirMatchesApp(runDirName, appFilter);

      // Parcourir les sous-dossiers (dossiers de tests en échec)
      fs.readdirSync(runDir).forEach(child => {
        const childDir = path.join(runDir, child);
        if (!fs.existsSync(childDir) || !fs.statSync(childDir).isDirectory()) return;

        const files = fs.readdirSync(childDir);
        const hasPng   = files.find(f => f.endsWith('.png'));
        const hasVideo  = files.find(f => f.endsWith('.webm'));
        const hasMd     = files.find(f => f.endsWith('.md'));
        if (!hasPng && !hasVideo) return;

        const relName = path.join(runDirName, child).replace(/\\/g, '/');

        // Appliquer le filtre :
        // - Nouveau format (ui-run-{appSlug}-{timestamp}) → afficher seulement si l'app correspond
        // - Ancien format (ui-run-{timestamp}) → sans info d'app, masquer si un filtre est actif
        if (appFilter && (!isNewFormat || !parentMatches)) return;

        found.push({ name: relName, hasPng: !!hasPng, hasVideo: !!hasVideo, hasMd: !!hasMd });
      });
    });

    res.end(JSON.stringify(found.reverse()));
    return;
  }

  // === DELETE /clear-history?app=... : supprimer l'historique filtré par app ===
  if (req.method === 'DELETE' && parsed.pathname === '/clear-history') {
    const appFilter = parsed.query.app || null;
    const ALLOWED_APPS = ['bvtech', 'bvbusiness', 'bvinvest', 'emiragate', 'bvportage', 'bvportageFreelance', 'creerailleurs', 'launchpad', 'all'];

    if (!appFilter || !ALLOWED_APPS.includes(appFilter)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Paramètre app invalide' }));
      return;
    }

    if (!fs.existsSync(TEST_RESULTS_DIR)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, deleted: 0 }));
      return;
    }

    function matchesApp(name, filter) {
      if (filter === 'all') return true;
      const n = name.replace(/\\/g, '/');
      // Nouveau format : ui-run-{appSlug}-{timestamp}
      if (filter === 'bvportageFreelance' && /^ui-run-bvportage-freelance-\d/.test(n)) return true;
      if (filter === 'bvportage'          && /^ui-run-bvportage-\d/.test(n))           return true;
      if (filter === 'bvtech'             && /^ui-run-bvtech-\d/.test(n))              return true;
      if (filter === 'bvbusiness'         && /^ui-run-bvbusiness-\d/.test(n))          return true;
      if (filter === 'bvinvest'           && /^ui-run-bvinvest-\d/.test(n))            return true;
      if (filter === 'emiragate'          && /^ui-run-emiragate-\d/.test(n))           return true;
      if (filter === 'creerailleurs'      && /^ui-run-creerailleurs-\d/.test(n))       return true;
      if (filter === 'launchpad'          && /^ui-run-launchpad-\d/.test(n))           return true;
      // Ancien format (rétro-compat) : nom contenant le pattern d'app
      if (filter === 'bvtech'            && n.includes('-bvtech-') && !n.includes('-bvbusiness-') && !n.includes('-bvinvest-')) return true;
      if (filter === 'bvbusiness'         && n.includes('-bvbusiness-'))         return true;
      if (filter === 'bvinvest'           && n.includes('-bvinvest-'))           return true;
      if (filter === 'emiragate'          && n.includes('-emiragate-'))          return true;
      if (filter === 'bvportage'          && n.includes('-bvportage-') && !n.includes('-bvportage-freelance-')) return true;
      if (filter === 'bvportageFreelance' && n.includes('-bvportage-freelance-')) return true;
      if (filter === 'launchpad'          && n.includes('-launchpad-'))           return true;
      return false;
    }

    let deleted = 0;
    try {
      const entries = fs.readdirSync(TEST_RESULTS_DIR);
      entries.forEach(name => {
        const dir = path.join(TEST_RESULTS_DIR, name);
        if (!fs.statSync(dir).isDirectory()) return;

        // Vérifier le dossier racine
        if (matchesApp(name, appFilter)) {
          fs.rmSync(dir, { recursive: true, force: true });
          deleted++;
          return;
        }

        // Vérifier les sous-dossiers (ui-run-* contient des sous-dossiers par test)
        if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
          const children = fs.readdirSync(dir);
          let allChildrenDeleted = true;
          let childDeletedCount = 0;

          children.forEach(child => {
            const childDir = path.join(dir, child);
            if (!fs.existsSync(childDir) || !fs.statSync(childDir).isDirectory()) {
              allChildrenDeleted = false;
              return;
            }
            const childRelName = path.join(name, child);
            if (matchesApp(childRelName, appFilter)) {
              fs.rmSync(childDir, { recursive: true, force: true });
              childDeletedCount++;
            } else {
              allChildrenDeleted = false;
            }
          });

          deleted += childDeletedCount;

          // Si le dossier parent est maintenant vide, le supprimer aussi
          if (allChildrenDeleted && childDeletedCount > 0 && fs.existsSync(dir)) {
            const remaining = fs.readdirSync(dir);
            if (remaining.length === 0) {
              fs.rmSync(dir, { recursive: true, force: true });
            }
          }
        }
      });

      console.log(`[clear-history] app=${appFilter} → ${deleted} dossier(s) supprimé(s)`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, deleted }));
    } catch (e) {
      console.error('[clear-history] Erreur:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // === GET /failure-file?dir=...&file=... : servir un fichier d'échec ===
  if (parsed.pathname === '/failure-file') {
    const dir = parsed.query.dir;
    const file = parsed.query.file;
    if (!dir || !file || dir.includes('..') || file.includes('..')) {
      res.writeHead(400); res.end('Bad request'); return;
    }
    const filePath = path.join(TEST_RESULTS_DIR, dir, file);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }

    const ext = path.extname(file).toLowerCase();
    const mimeTypes = { '.png': 'image/png', '.webm': 'video/webm', '.md': 'text/plain; charset=utf-8', '.zip': 'application/zip' };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // === GET / : hub ou interface app ===
  if (parsed.pathname === '/' || parsed.pathname === '/index.html') {
    const appKey = parsed.query.app;
    const appCfg = appKey && APP_REGISTRY[appKey];

    if (appCfg) {
      // Servir app.html avec la config de l'app injectée
      fs.readFile(APP_HTML_FILE, 'utf8', (err, html) => {
        if (err) { res.writeHead(500); res.end('app.html introuvable'); return; }
        const injected = html.replace(
          '/* __APP_CONFIG__ */',
          `const APP_CONFIG = ${JSON.stringify({ appKey, label: appCfg.label, url: appCfg.url, color: appCfg.color, tests: appCfg.tests, port: PORT })};`
        );
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(injected);
      });
    } else {
      // Servir le hub
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateHubHTML());
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🎭 Interface de tests E2E démarrée`);
  console.log(`   → http://localhost:${PORT}\n`);
});
