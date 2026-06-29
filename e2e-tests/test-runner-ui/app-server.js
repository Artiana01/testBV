/**
 * app-server.js
 * Serveur générique pour une seule app Playwright.
 * Lancé par start-all.js avec APP_KEY et PORT en variables d'environnement.
 * Chaque instance est totalement isolée — aucun partage de state entre apps.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { spawn } = require('child_process');
// url.parse remplacé par WHATWG URL API (évite DEP0169)

// ── Historisation PostgreSQL ───────────────────────────────────────────────────
const { connect: dbConnect } = require('../database/db');
const history = require('../database/history');
// Initialise la connexion DB au démarrage (non-bloquant)
dbConnect().then(ok => {
  if (ok) console.log(`[${process.env.APP_KEY || '?'}] DB connectée ✓`);
}).catch(() => {});

// ── Config injectée par start-all.js ──────────────────────────────────────────
const APP_KEY  = process.env.APP_KEY;
const PORT     = parseInt(process.env.PORT, 10);

if (!APP_KEY || !PORT) {
  console.error('❌ APP_KEY et PORT sont requis.');
  process.exit(1);
}

// ── Registry des apps ─────────────────────────────────────────────────────────
const REGISTRY = {
  bvtech: {
    label:  'BV Tech',
    url:    'https://dev.bluevaloristech.com',
    config: 'playwright.bvtech.config.ts',
    color:  '#6366f1',
    tests: {
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
    },
  },
  bvbusiness: {
    label:  'BV Business',
    url:    'https://staging.bluevalorisbusiness.com',
    config: 'playwright.bvbusiness.config.ts',
    color:  '#0ea5e9',
    tests: {
      'e2e-01-signup':     { file: 'apps/bvbusiness/tests/e2e-01-signup.spec.ts',           label: 'SC-01 — Inscription (Signup)' },
      'e2e-02-login':      { file: 'apps/bvbusiness/tests/e2e-02-login-dashboard.spec.ts',  label: 'SC-02 — Login & Dashboard' },
      'e2e-03-packages':   { file: 'apps/bvbusiness/tests/e2e-03-packages.spec.ts',         label: 'SC-03 — Packages & Pricing' },
      'e2e-04-navigation': { file: 'apps/bvbusiness/tests/e2e-04-navigation.spec.ts',       label: 'SC-04 — Navigation Admin' },
      'e2e-05-content':    { file: 'apps/bvbusiness/tests/e2e-05-admin-content.spec.ts',    label: 'SC-05 — Content Management' },
      'e2e-06-media':      { file: 'apps/bvbusiness/tests/e2e-06-admin-media.spec.ts',      label: 'SC-06 — Media Library' },
      'e2e-07-regional':   { file: 'apps/bvbusiness/tests/e2e-07-regional-content.spec.ts', label: 'SC-07 — Contenu Régional' },
      'e2e-08-users':      { file: 'apps/bvbusiness/tests/e2e-08-admin-users.spec.ts',      label: 'SC-08 — Gestion Utilisateurs' },
      'e2e-09-payments':   { file: 'apps/bvbusiness/tests/e2e-09-admin-payments.spec.ts',   label: 'SC-09 — Paiements Admin' },
      'regression':        { file: 'apps/bvbusiness/tests/regression.spec.ts',              label: 'Régression Complète' },
    },
  },
  bvinvest: {
    label:  'BV Invest',
    url:    'https://dev.bluevalorisinvest.com',
    config: 'playwright.bvinvest.config.ts',
    color:  '#10b981',
    tests: {
      'e2e-01-login':           { file: 'apps/bvinvest/tests/e2e-01-login.spec.ts',           label: 'SC-01 — Connexion utilisateur' },
      'e2e-02-member':          { file: 'apps/bvinvest/tests/e2e-02-member-space.spec.ts',     label: 'SC-02 — Espace Membre' },
      'e2e-03-packages':        { file: 'apps/bvinvest/tests/e2e-03-packages.spec.ts',         label: 'SC-03 — Packages & Souscription' },
      'e2e-04-opportunities':   { file: 'apps/bvinvest/tests/e2e-04-opportunities.spec.ts',    label: "SC-04/07 — Opportunités & Documents" },
      'e2e-05-kyc':             { file: 'apps/bvinvest/tests/e2e-05-kyc-pipeline.spec.ts',     label: 'SC-05 — Pipeline KYC/AML' },
      'e2e-06-profile':         { file: 'apps/bvinvest/tests/e2e-06-profile.spec.ts',          label: 'SC-06 — Profil Utilisateur' },
      'e2e-08-admin-access':    { file: 'apps/bvinvest/tests/e2e-08-admin-access.spec.ts',     label: "SC-08 — Demandes d'Accès (Admin)" },
      'e2e-09-admin-dashboard': { file: 'apps/bvinvest/tests/e2e-09-admin-dashboard.spec.ts',  label: 'SC-09 — Dashboard Admin' },
      'e2e-10-navigation':      { file: 'apps/bvinvest/tests/e2e-10-navigation.spec.ts',       label: 'SC-10 — Navigation Globale' },
      'e2e-11-analytics':       { file: 'apps/bvinvest/tests/e2e-11-analytics.spec.ts',        label: 'SC-11 — Analytics & Stats' },
      'regression':             { file: 'apps/bvinvest/tests/regression.spec.ts',              label: 'Régression Complète' },
    },
  },
  emiragate: {
    label:  'Emiragate',
    url:    'https://dev.bluevalorisinstall.com',
    config: 'playwright.emiragate.config.ts',
    color:  '#f59e0b',
    tests: {
      'e2e-01-login':      { file: 'apps/emiragate/tests/e2e-01-admin-login.spec.ts',    label: 'SC-01 — Connexion Admin' },
      'e2e-02-dashboard':  { file: 'apps/emiragate/tests/e2e-02-admin-dashboard.spec.ts',label: 'SC-02 — Dashboard Admin' },
      'e2e-03-conduit':    { file: 'apps/emiragate/tests/e2e-03-conduit.spec.ts',        label: 'SC-03 — Leads / Conduit' },
      'e2e-04-signup':     { file: 'apps/emiragate/tests/e2e-04-signup.spec.ts',         label: 'SC-04 — Inscription Client' },
      'e2e-05-client':     { file: 'apps/emiragate/tests/e2e-05-client-login.spec.ts',   label: 'SC-05 — Connexion Client' },
      'e2e-06-profile':    { file: 'apps/emiragate/tests/e2e-06-profile.spec.ts',        label: 'SC-06 — Profil Utilisateur' },
      'e2e-07-users':      { file: 'apps/emiragate/tests/e2e-07-admin-users.spec.ts',    label: 'SC-07 — Gestion Utilisateurs' },
      'e2e-08-contacts':   { file: 'apps/emiragate/tests/e2e-08-contacts.spec.ts',       label: 'SC-08 — Gestion Contacts' },
      'e2e-09-analytics':  { file: 'apps/emiragate/tests/e2e-09-analytics.spec.ts',      label: 'SC-09 — Analytique' },
      'e2e-10-navigation': { file: 'apps/emiragate/tests/e2e-10-navigation.spec.ts',     label: 'SC-10/11 — Navigation & Déconnexion' },
      'regression':        { file: 'apps/emiragate/tests/regression.spec.ts',            label: 'Régression Complète' },
    },
  },
  bvportage: {
    label:  'BV Portage',
    url:    'https://dev.bluevalorisportage.com',
    config: 'playwright.bvportage.config.ts',
    color:  '#ec4899',
    tests: {
      'e2e-01-signup-activation':     { file: 'apps/bvportage/tests/e2e-01-signup-activation.spec.ts',       label: 'E2E-01 — Inscription + OTP (Agence)' },
      'e2e-02-login-pack-subscription':{ file: 'apps/bvportage/tests/e2e-02-login-pack-subscription.spec.ts', label: 'E2E-02 — Login + Pack 159€' },
      'e2e-03-client-creation':       { file: 'apps/bvportage/tests/e2e-03-client-creation.spec.ts',          label: 'E2E-03 — Client + Projet' },
      'e2e-04-mission-contract-kyc':  { file: 'apps/bvportage/tests/e2e-04-mission-contract-kyc.spec.ts',     label: 'E2E-04 — Mission + Contrat + KYC' },
      'e2e-05-contract-signature':    { file: 'apps/bvportage/tests/e2e-05-contract-signature.spec.ts',       label: 'E2E-05 — Signature Contrat' },
      'e2e-06-invoice-payment':       { file: 'apps/bvportage/tests/e2e-06-invoice-payment.spec.ts',          label: 'E2E-06 — Facturation + Paiement' },
      'e2e-07-team-invitation':       { file: 'apps/bvportage/tests/e2e-07-team-invitation.spec.ts',          label: 'E2E-07 — Invitation Équipe' },
      'e2e-08-reversal':              { file: 'apps/bvportage/tests/e2e-08-reversal.spec.ts',                 label: 'E2E-08 — Reversement' },
    },
  },
  bvportageFreelance: {
    label:  'BV Portage Freelance',
    url:    'https://dev.bluevalorisportage.com',
    config: 'playwright.bvportage-freelance.config.ts',
    color:  '#d946ef',
    tests: {
      'e2e-01-signup-otp':              { file: 'apps/bvportage-freelance/tests/e2e-01-signup-otp.spec.ts',                label: 'E2E-01 — Inscription Freelance + OTP' },
      'e2e-02-pack-subscription':        { file: 'apps/bvportage-freelance/tests/e2e-02-pack-subscription.spec.ts',        label: 'E2E-02 — Souscription Pack (79€)' },
      'e2e-03-project-client':           { file: 'apps/bvportage-freelance/tests/e2e-03-project-client.spec.ts',           label: 'E2E-03 — Création Projet + Client' },
      'e2e-04-mission-contract-signature':{ file: 'apps/bvportage-freelance/tests/e2e-04-mission-contract-signature.spec.ts', label: 'E2E-04 — Mission + Contrat + Signature' },
      'e2e-05-kyc-admin-validation':     { file: 'apps/bvportage-freelance/tests/e2e-05-kyc-admin-validation.spec.ts',     label: 'E2E-05 — KYC + Validation Admin' },
      'e2e-06-invoice-payment':          { file: 'apps/bvportage-freelance/tests/e2e-06-invoice-payment.spec.ts',          label: 'E2E-06 — Facturation + Paiement' },
      'e2e-07-reset-password':           { file: 'apps/bvportage-freelance/tests/e2e-07-reset-password.spec.ts',           label: 'E2E-07 — Reset Mot de passe' },
      'e2e-08-profile':                  { file: 'apps/bvportage-freelance/tests/e2e-08-profile.spec.ts',                  label: 'E2E-08 — Gestion Profil' },
      'e2e-09-edge-cases':               { file: 'apps/bvportage-freelance/tests/e2e-09-edge-cases.spec.ts',               label: 'E2E-09 — Cas limites & comptes' },
    },
  },
  creerailleurs: {
    label:  'Créer Ailleurs',
    url:    'https://dev.creerailleurs.com',
    config: 'playwright.creerailleurs.config.ts',
    color:  '#f97316',
    tests: {
      'e2e-01-navigation':  { file: 'apps/creerailleurs/tests/e2e-01-navigation.spec.ts',       label: 'SC-01 — Navigation & Accessibilité' },
      'e2e-02-cta':         { file: 'apps/creerailleurs/tests/e2e-02-cta-redirections.spec.ts',  label: 'SC-02 — CTAs & Redirections' },
      'e2e-03-signup':      { file: 'apps/creerailleurs/tests/e2e-03-signup.spec.ts',            label: 'SC-03 — Inscription' },
      'e2e-04-login':       { file: 'apps/creerailleurs/tests/e2e-04-login.spec.ts',             label: 'SC-04 — Connexion' },
      'e2e-05-tunnel':      { file: 'apps/creerailleurs/tests/e2e-05-tunnel-vente.spec.ts',      label: 'SC-05 — Tunnel de Vente' },
      'e2e-06-guest':       { file: 'apps/creerailleurs/tests/e2e-06-achat-sans-compte.spec.ts', label: 'SC-06 — Achat sans Compte' },
      'e2e-07-dashboard':   { file: 'apps/creerailleurs/tests/e2e-07-dashboard-user.spec.ts',    label: 'SC-07 — Dashboard Utilisateur' },
      'e2e-08-admin':       { file: 'apps/creerailleurs/tests/e2e-08-admin.spec.ts',             label: 'SC-08 — Dashboard Admin' },
      'e2e-09-multilingue': { file: 'apps/creerailleurs/tests/e2e-09-multilingue.spec.ts',       label: 'SC-09 — Multilingue FR/EN' },
    },
  },
  launchpad: {
    label:  'Launchpad BV TECH',
    url:    'https://staging.bluevaloristech.com',
    config: 'playwright.launchpad.config.ts',
    color:  '#14b8a6',
    tests: {
      'e2e-01-signup':       { file: 'apps/launchpad/tests/e2e-01-signup-activation.spec.ts',  label: 'E2E-01 — Activation & Inscription (P0)' },
      'e2e-02-login':        { file: 'apps/launchpad/tests/e2e-02-login-dashboard.spec.ts',    label: 'E2E-02 — Connexion & Dashboard (P0)' },
      'e2e-03-packs':        { file: 'apps/launchpad/tests/e2e-03-pack-purchase.spec.ts',      label: 'E2E-03 — Achat Pack + Paiement (P0)' },
      'e2e-04-profile':      { file: 'apps/launchpad/tests/e2e-04-profile.spec.ts',            label: 'E2E-04 — Profil Utilisateur (P1)' },
      'e2e-05-security':     { file: 'apps/launchpad/tests/e2e-05-security.spec.ts',           label: 'E2E-05 — Sécurité / Mot de passe (P1)' },
      'e2e-06-notifications':{ file: 'apps/launchpad/tests/e2e-06-notifications.spec.ts',      label: 'E2E-06 — Notifications & Emails (P1)' },
      'e2e-07-messaging':    { file: 'apps/launchpad/tests/e2e-07-messaging.spec.ts',          label: 'E2E-07 — Messagerie Client ↔ Admin (P2)' },
      'regression':          { file: 'apps/launchpad/tests/regression.spec.ts',               label: 'Régression Complète' },
    },
  },
};

const APP    = REGISTRY[APP_KEY];
if (!APP) {
  console.error(`❌ APP_KEY inconnu: "${APP_KEY}". Valeurs valides: ${Object.keys(REGISTRY).join(', ')}`);
  process.exit(1);
}

const ROOT_DIR        = path.join(__dirname, '..');
const TEST_RESULTS_DIR = path.join(ROOT_DIR, 'test-results');
const HTML_FILE       = path.join(__dirname, 'app.html');

// ── State ──────────────────────────────────────────────────────────────────────
let sseClients     = [];
let runningProcess = null;
let isRunning      = false;
let testsStopped   = false;
let currentRunId   = null;   // ID PostgreSQL du run en cours
let runStats       = { passed: 0, failed: 0, skipped: 0, durationMs: null };
let runStartedAt   = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function send(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => { try { res.write(payload); } catch (_) {} });
}

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '');
}

function classifyLine(line) {
  const c = stripAnsi(line).trim();
  if (/^ok\s+\d+\s/.test(c))                                          return 'pass';
  if (/^x\s+\d+\s/.test(c))                                           return 'fail';
  if (/^\d+\s+passed/.test(c) || /^\d+\s+failed/.test(c))            return 'summary';
  if (/✓|✅/.test(c))                                                  return 'pass';
  if (/✗|×|❌/.test(c))                                               return 'fail';
  if (/^Running \d+ test|^Finished|workers|suite/i.test(c))           return 'summary';
  if (/passed.*failed|failed.*passed|\d+ (passed|failed|skipped)/i.test(c)) return 'summary';
  if (/Error:|⚠|warn|WARN|rate limit/i.test(c))                       return 'warn';
  if (/✅\s*Session|sauvegardée|🚀|Sessions prêtes/i.test(c))         return 'pass';
  if (/⚠️|Connexion.*échouée|❌/i.test(c))                            return 'warn';
  return 'info';
}

function appKeyToSlug(k) {
  return k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// ── Runner ────────────────────────────────────────────────────────────────────
function runTests(selectedKeys) {
  if (isRunning) {
    send({ type: 'error', message: '⛔ Un test est déjà en cours. Arrêtez-le avant de relancer.' });
    return;
  }

  if (runningProcess) {
    try { runningProcess.kill('SIGKILL'); } catch (_) {}
    runningProcess = null;
  }

  isRunning    = true;
  testsStopped = false;
  runStats     = { passed: 0, failed: 0, skipped: 0, durationMs: null };
  runStartedAt = Date.now();

  const slug      = appKeyToSlug(APP_KEY);
  const outputDir = path.join('test-results', `ui-run-${slug}-${Date.now()}`);

  // Collecter les fichiers sélectionnés pour la persistance
  const selectedFiles = [];
  if (selectedKeys && selectedKeys.length > 0 && !selectedKeys.includes('all')) {
    selectedKeys.forEach(key => {
      const t = APP.tests[key];
      if (t && t.file) selectedFiles.push(t.file);
    });
  }

  // Démarrer le run en base
  history.startRun(APP_KEY, APP.label, selectedFiles).then(id => { currentRunId = id; });

  const args = ['playwright', 'test', '--config', APP.config, '--reporter=list', '--output', outputDir];

  if (selectedKeys && selectedKeys.length > 0 && !selectedKeys.includes('all')) {
    selectedKeys.forEach(key => {
      const t = APP.tests[key];
      if (t && t.file) args.push(t.file);
    });
  }

  send({ type: 'start',  message: `🚀 Démarrage des tests ${APP.label}...` });
  send({ type: 'cmd',    message: `npx ${args.join(' ')}` });
  history.saveLog(currentRunId, 'start', `🚀 Démarrage des tests ${APP.label}...`);
  history.saveLog(currentRunId, 'cmd',   `npx ${args.join(' ')}`);

  // shell:false + npx.cmd sur Windows évite DEP0190
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  runningProcess = spawn(npxCmd, args, {
    cwd: ROOT_DIR,
    shell: false,
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  const onData = (data) => {
    data.toString().split('\n').forEach(line => {
      if (!line.trim()) return;
      const type = classifyLine(line);
      const clean = stripAnsi(line);
      send({ type, message: clean });

      // ── Persistance des logs significatifs ──────────────────────────────
      if (['pass','fail','warn','summary','done'].includes(type)) {
        history.saveLog(currentRunId, type, clean);
      }

      // ── Parser les résultats individuels ────────────────────────────────
      if (type === 'pass' || type === 'fail') {
        const parsed = history.parseTestLine(clean);
        if (parsed) {
          if (parsed.status === 'passed') runStats.passed++;
          else if (parsed.status === 'failed') runStats.failed++;
          history.saveTestResult(currentRunId, parsed);
        }
      }

      // ── Mettre à jour les stats depuis la ligne résumé finale ───────────
      if (type === 'summary') {
        const summ = history.parseSummaryLine(clean);
        if (summ) {
          if (summ.passed  !== null) runStats.passed  = summ.passed;
          if (summ.failed  !== null) runStats.failed  = summ.failed;
          if (summ.skipped !== null) runStats.skipped = summ.skipped;
          if (summ.durationMs) runStats.durationMs    = summ.durationMs;
        }
      }
    });
  };

  runningProcess.stdout.on('data', onData);
  runningProcess.stderr.on('data', onData);

  runningProcess.on('close', (code) => {
    if (testsStopped) {
      history.finishRun(currentRunId, null, runStats);
      currentRunId = null;
      isRunning = false; runningProcess = null; testsStopped = false;
      return;
    }
    const doneMsg = code === 0 ? '✅ Tous les tests ont réussi !' : `❌ Des tests ont échoué (code: ${code})`;
    if (!runStats.durationMs) runStats.durationMs = Date.now() - runStartedAt;
    history.saveLog(currentRunId, 'done', doneMsg);
    history.finishRun(currentRunId, code, runStats);
    currentRunId = null;
    isRunning = false;
    runningProcess = null;
    const ok = code === 0;
    send({ type: 'done', success: ok, code, message: ok ? '✅ Tous les tests ont réussi !' : `❌ Des tests ont échoué (code: ${code})` });
  });

  runningProcess.on('error', (err) => {
    history.finishRun(currentRunId, -1, runStats);
    currentRunId = null;
    isRunning = false; runningProcess = null;
    send({ type: 'error', message: `Erreur de démarrage : ${err.message}` });
  });
}

function stopTests() {
  if (!runningProcess) return;
  testsStopped = true;
  runningProcess.stdout?.removeAllListeners();
  runningProcess.stderr?.removeAllListeners();
  try { runningProcess.kill('SIGKILL'); } catch (_) {}
  isRunning = false;
  history.saveLog(currentRunId, 'done', '⛔ Tests arrêtés par l\'utilisateur.');
  setTimeout(() => { if (runningProcess) { try { runningProcess.kill('SIGKILL'); } catch (_) {} runningProcess = null; } }, 500);
  send({ type: 'warn', message: '⛔ Tests arrêtés par l\'utilisateur.' });
  send({ type: 'done', success: false, message: 'Tests arrêtés.' });
}

// ── Failures helpers ──────────────────────────────────────────────────────────
function getSlugPattern() {
  return new RegExp(`^ui-run-${appKeyToSlug(APP_KEY)}-\\d`);
}

function listFailures() {
  if (!fs.existsSync(TEST_RESULTS_DIR)) return [];
  const pattern = getSlugPattern();
  const found   = [];

  fs.readdirSync(TEST_RESULTS_DIR).forEach(runDir => {
    if (!pattern.test(runDir)) return;
    const runPath = path.join(TEST_RESULTS_DIR, runDir);
    if (!fs.statSync(runPath).isDirectory()) return;

    fs.readdirSync(runPath).forEach(child => {
      const childPath = path.join(runPath, child);
      if (!fs.statSync(childPath).isDirectory()) return;
      const files    = fs.readdirSync(childPath);
      const hasPng   = files.find(f => f.endsWith('.png'));
      const hasVideo = files.find(f => f.endsWith('.webm'));
      const hasMd    = files.find(f => f.endsWith('.md'));
      if (!hasPng && !hasVideo) return;
      found.push({ name: `${runDir}/${child}`, hasPng: !!hasPng, hasVideo: !!hasVideo, hasMd: !!hasMd });
    });
  });

  return found.reverse();
}

function clearHistory() {
  if (!fs.existsSync(TEST_RESULTS_DIR)) return 0;
  const pattern = getSlugPattern();
  let deleted   = 0;

  fs.readdirSync(TEST_RESULTS_DIR).forEach(name => {
    if (!pattern.test(name)) return;
    fs.rmSync(path.join(TEST_RESULTS_DIR, name), { recursive: true, force: true });
    deleted++;
  });

  return deleted;
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const reqUrl  = new URL(req.url, `http://localhost:${PORT}`);
  const parsed  = { pathname: reqUrl.pathname, query: Object.fromEntries(reqUrl.searchParams) };

  // SSE
  if (parsed.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*' });
    res.write(`data: ${JSON.stringify({ type: 'connected', running: isRunning })}\n\n`);
    sseClients.push(res);
    req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
    return;
  }

  // POST /run
  if (req.method === 'POST' && parsed.pathname === '/run') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      let selected = [];
      try { selected = JSON.parse(body).tests || []; } catch (_) {}
      runTests(selected);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // POST /stop
  if (req.method === 'POST' && parsed.pathname === '/stop') {
    stopTests();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // GET /status
  if (parsed.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ appKey: APP_KEY, label: APP.label, url: APP.url, color: APP.color, running: isRunning, tests: APP.tests }));
    return;
  }

  // GET /history — liste paginée des runs de cette app
  if (parsed.pathname === '/history' && req.method === 'GET') {
    const limit  = parseInt(parsed.query.limit  || '20');
    const offset = parseInt(parsed.query.offset || '0');
    const status = parsed.query.status || null;
    const data   = await history.getRuns({ app: APP_KEY, status, limit, offset });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
    return;
  }

  // GET /history/:id — détail d'un run
  const matchDetail = parsed.pathname.match(/^\/history\/(\d+)$/);
  if (matchDetail && req.method === 'GET') {
    const data = await history.getRunById(parseInt(matchDetail[1]));
    if (!data) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // DELETE /history/:id — suppression d'un run
  const matchDel = parsed.pathname.match(/^\/history\/(\d+)$/);
  if (matchDel && req.method === 'DELETE') {
    const ok = await history.deleteRun(parseInt(matchDel[1]));
    res.writeHead(ok ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok }));
    return;
  }

  // GET /history-stats — statistiques de l'app
  if (parsed.pathname === '/history-stats') {
    const data = await history.getStats(APP_KEY);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // GET /failures
  if (parsed.pathname === '/failures') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(listFailures()));
    return;
  }

  // DELETE /clear-history
  if (req.method === 'DELETE' && parsed.pathname === '/clear-history') {
    const deleted = clearHistory();
    console.log(`[clear-history] ${APP_KEY} → ${deleted} dossier(s) supprimé(s)`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, deleted }));
    return;
  }

  // GET /failure-file
  if (parsed.pathname === '/failure-file') {
    const dir  = parsed.query.dir;
    const file = parsed.query.file;
    if (!dir || !file || dir.includes('..') || file.includes('..')) { res.writeHead(400); res.end('Bad request'); return; }
    const filePath = path.join(TEST_RESULTS_DIR, dir, file);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
    const mime = { '.png': 'image/png', '.webm': 'video/webm', '.md': 'text/plain; charset=utf-8' };
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // GET / → app.html avec APP_CONFIG injecté
  if (parsed.pathname === '/' || parsed.pathname === '/index.html') {
    fs.readFile(HTML_FILE, 'utf8', (err, html) => {
      if (err) { res.writeHead(500); res.end('app.html introuvable'); return; }
      // Injecter la config de l'app dans le HTML
      const injected = html.replace(
        '/* __APP_CONFIG__ */',
        `const APP_CONFIG = ${JSON.stringify({ appKey: APP_KEY, label: APP.label, url: APP.url, color: APP.color, tests: APP.tests, port: PORT })};`
      );
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(injected);
    });
    return;
  }

  // === GET /history-page : interface historique ===
  if (parsed.pathname === '/history-page' || parsed.pathname === '/history.html') {
    const histFile = path.join(__dirname, 'history.html');
    fs.readFile(histFile, 'utf8', (err, html) => {
      if (err) { res.writeHead(500); res.end('history.html introuvable'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`🎭 ${APP.label} → http://localhost:${PORT}`);
});
