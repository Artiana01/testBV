/**
 * start-all.js
 * -------------
 * Lance un serveur isolé par app (ports internes 4001-4008).
 * Port 4000 = proxy Node.js qui route vers chaque app par chemin :
 *   /          → Hub
 *   /bvtech/   → localhost:4001
 *   /bvinvest/ → localhost:4003
 *   etc.
 *
 * Un seul port exposé vers l'extérieur (4000).
 * Chaque app reste un processus Node.js totalement isolé.
 */

const { spawn, execSync } = require('child_process');
const http                = require('http');
const fs                  = require('fs');
const path                = require('path');

// ── Apps ────────────────────────────────────────────────────────────────────
const APPS = [
  { key: 'bvtech',             port: 4001, label: 'BV Tech',              color: '#6366f1', url: 'dev.bluevaloristech.com' },
  { key: 'bvbusiness',         port: 4002, label: 'BV Business',          color: '#0ea5e9', url: 'staging.bluevalorisbusiness.com' },
  { key: 'bvinvest',           port: 4003, label: 'BV Invest',            color: '#10b981', url: 'dev.bluevalorisinvest.com' },
  { key: 'emiragate',          port: 4004, label: 'Emiragate',            color: '#f59e0b', url: 'dev.bluevalorisinstall.com' },
  { key: 'bvportage',          port: 4005, label: 'BV Portage',           color: '#ec4899', url: 'dev.bluevalorisportage.com' },
  { key: 'bvportageFreelance', port: 4006, label: 'BV Portage Freelance', color: '#d946ef', url: 'dev.bluevalorisportage.com' },
  { key: 'creerailleurs',      port: 4007, label: 'Créer Ailleurs',       color: '#f97316', url: 'creerailleurs.com' },
  { key: 'launchpad',          port: 4008, label: 'Launchpad BV TECH',    color: '#14b8a6', url: 'staging.bluevaloristech.com' },
];

const PROXY_PORT = parseInt(process.env.PORT || '4000', 10);
const SERVER_JS  = path.join(__dirname, 'app-server.js');
const children   = [];

// ── Libérer un port occupé (Windows) ────────────────────────────────────────
function freePort(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port} "`, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    out.split('\n').filter(l => l.includes('LISTENING')).forEach(line => {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && pid !== '0') {
        try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' }); } catch (_) {}
      }
    });
  } catch (_) {}
}

// ── Démarrer les serveurs d'app (ports internes) ─────────────────────────────
console.log('\n🔓 Libération des ports...');
[PROXY_PORT, ...APPS.map(a => a.port)].forEach(freePort);

APPS.forEach(({ key, port, label }) => {
  const child = spawn('node', [SERVER_JS], {
    env:   { ...process.env, APP_KEY: key, PORT: String(port) },
    shell: false,
    stdio: 'pipe',
  });
  child.stdout.on('data', d => process.stdout.write(`[${label}] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[${label}] ${d}`));
  child.on('exit', code => console.log(`[${label}] arrêté (code ${code})`));
  children.push(child);
});

// ── Hub HTML ─────────────────────────────────────────────────────────────────
function generateHubHTML() {
  const cards = APPS.map(({ key, label, color, url }) => `
    <a href="/${key}/" class="card" style="--c:${color}">
      <div class="dot"></div>
      <div class="info">
        <div class="name">${label}</div>
        <div class="url">${url}</div>
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
  <div class="footer">Chaque app est un processus isolé — aucune interférence possible</div>
</body>
</html>`;
}

// ── Proxy HTTP sur port 4000 ──────────────────────────────────────────────────
// Route /{appKey}/* → localhost:{port}/*
const appByKey = Object.fromEntries(APPS.map(a => [a.key, a]));

function proxyRequest(req, res, targetPort, targetPath) {
  const options = {
    hostname: '127.0.0.1',
    port:     targetPort,
    path:     targetPath,
    method:   req.method,
    headers:  { ...req.headers, host: `localhost:${targetPort}` },
  };

  const proxyReq = http.request(options, proxyRes => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) { res.writeHead(502); }
    res.end('App server not ready yet — retry in a second');
  });

  req.pipe(proxyReq, { end: true });
}

const proxy = http.createServer((req, res) => {
  const reqPath = req.url || '/';

  // Racine → Hub
  if (reqPath === '/' || reqPath === '') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(generateHubHTML());
  }

  // /{appKey} ou /{appKey}/* → proxy vers le bon port
  const match = reqPath.match(/^\/([^/]+)(\/.*)?$/);
  if (match) {
    const key     = match[1];
    const rest    = match[2] || '/';
    const app     = appByKey[key];
    if (app) {
      return proxyRequest(req, res, app.port, rest);
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

proxy.on('error', err => {
  console.error('Erreur proxy:', err.message);
  children.forEach(c => { try { c.kill('SIGKILL'); } catch (_) {} });
  process.exit(1);
});

proxy.listen(PROXY_PORT, () => {
  console.log('\n🎭 Tests E2E — Proxy démarré\n');
  console.log(`   Hub  → http://localhost:${PROXY_PORT}`);
  APPS.forEach(({ key, label }) => {
    console.log(`   ${label.padEnd(22)} → http://localhost:${PROXY_PORT}/${key}/`);
  });
  console.log('');
});

// ── Arrêt propre ─────────────────────────────────────────────────────────────
function shutdown() {
  console.log('\n⛔ Arrêt...');
  children.forEach(c => { try { c.kill('SIGKILL'); } catch (_) {} });
  proxy.close();
  process.exit(0);
}
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
