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

const PORT = process.env.PORT || 4000;
const HTML_FILE = path.join(__dirname, 'index.html');
const ROOT_DIR = path.join(__dirname, '..');

// Configs Playwright disponibles
const CONFIGS = {
  bvtech:     'playwright.bvtech.config.ts',
  bvbusiness: 'playwright.bvbusiness.config.ts',
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

// Clients SSE actifs
let sseClients = [];

// Processus Playwright en cours
let runningProcess = null;
let isRunning = false;

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

function runTests(selectedTests, app) {
  if (isRunning) {
    sendToAllClients({ type: 'error', message: 'Un test est déjà en cours. Attendez la fin avant de relancer.' });
    return;
  }

  const appKey = app === 'bvbusiness' ? 'bvbusiness' : 'bvtech';
  const config = CONFIGS[appKey];
  const testsMap = appKey === 'bvbusiness' ? TESTS_BVBUSINESS : TESTS_BVTECH;

  isRunning = true;
  sendToAllClients({ type: 'start', message: `🚀 Démarrage des tests ${appKey === 'bvbusiness' ? 'BV Business' : 'BV Tech'}...` });

  const args = [
    'playwright', 'test',
    '--config', config,
    '--reporter=list',
  ];

  if (selectedTests && selectedTests.length > 0 && !selectedTests.includes('all')) {
    selectedTests.forEach(key => {
      const t = testsMap[key];
      if (t) args.push(t.file);
    });
  }

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
      runningProcess.kill('SIGTERM');
      isRunning = false;
      sendToAllClients({ type: 'warn', message: '⛔ Tests arrêtés par l\'utilisateur.' });
      sendToAllClients({ type: 'status', running: false });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // === GET /status : état courant ===
  if (parsed.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ running: isRunning, tests: { bvtech: TESTS_BVTECH, bvbusiness: TESTS_BVBUSINESS } }));
    return;
  }

  // === GET /failures : liste des dossiers d'échec ===
  if (parsed.pathname === '/failures') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (!fs.existsSync(TEST_RESULTS_DIR)) {
      res.end(JSON.stringify([]));
      return;
    }
    const folders = fs.readdirSync(TEST_RESULTS_DIR).map(name => {
      const dir = path.join(TEST_RESULTS_DIR, name);
      if (!fs.statSync(dir).isDirectory()) return null;
      const files = fs.readdirSync(dir);
      const hasPng = files.find(f => f.endsWith('.png'));
      const hasVideo = files.find(f => f.endsWith('.webm'));
      const hasMd = files.find(f => f.endsWith('.md'));
      return { name, hasPng: !!hasPng, hasVideo: !!hasVideo, hasMd: !!hasMd };
    }).filter(f => f && (f.hasPng || f.hasVideo));
    res.end(JSON.stringify(folders.reverse()));
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

  // === GET / : page HTML ===
  if (parsed.pathname === '/' || parsed.pathname === '/index.html') {
    fs.readFile(HTML_FILE, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Erreur : index.html introuvable');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🎭 Interface de tests E2E démarrée`);
  console.log(`   → http://localhost:${PORT}\n`);
});
