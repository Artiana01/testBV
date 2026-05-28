/**
 * start-all.js
 * Lance un serveur isolé par app, chacun sur son propre port.
 * Démarrage : node test-runner-ui/start-all.js
 *
 *   Port 4001 → BV Tech
 *   Port 4002 → BV Business
 *   Port 4003 → BV Invest
 *   Port 4004 → Emiragate
 *   Port 4005 → BV Portage
 *   Port 4006 → BV Portage Freelance
 *   Port 4007 → Créer Ailleurs
 *   Port 4000 → Hub central
 */

const { spawn, execSync } = require('child_process');
const http                = require('http');
const fs                  = require('fs');
const path                = require('path');

// Libère un port occupé (Windows uniquement)
function freePort(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port} "`, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    const lines = out.split('\n').filter(l => l.includes('LISTENING'));
    lines.forEach(line => {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && pid !== '0') {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
          console.log(`   🔓 Port ${port} libéré (PID ${pid})`);
        } catch (_) {}
      }
    });
  } catch (_) {}
}

const APPS = [
  { key: 'bvtech',             port: 4001, label: 'BV Tech',              color: '#6366f1' },
  { key: 'bvbusiness',         port: 4002, label: 'BV Business',          color: '#0ea5e9' },
  { key: 'bvinvest',           port: 4003, label: 'BV Invest',            color: '#10b981' },
  { key: 'emiragate',          port: 4004, label: 'Emiragate',            color: '#f59e0b' },
  { key: 'bvportage',          port: 4005, label: 'BV Portage',           color: '#ec4899' },
  { key: 'bvportageFreelance', port: 4006, label: 'BV Portage Freelance', color: '#d946ef' },
  { key: 'creerailleurs',      port: 4007, label: 'Créer Ailleurs',       color: '#f97316' },
  { key: 'launchpad',          port: 4008, label: 'Launchpad BV TECH',     color: '#14b8a6' },
];

const HUB_PORT   = 4000;
const SERVER_JS  = path.join(__dirname, 'app-server.js');

// En prod : définir PUBLIC_HOST avec l'IP ou le domaine du serveur
// Ex: PUBLIC_HOST=187.124.95.146 ou PUBLIC_HOST=p7y8lcey15e26zdvoguol9qw.187.124.95.146.sslip.io
const PUBLIC_HOST = process.env.PUBLIC_HOST || 'localhost';
const children   = [];

// ── Libérer tous les ports au démarrage ──────────────────────────────────────
console.log('\n🔓 Libération des ports...');
freePort(HUB_PORT);
APPS.forEach(({ port }) => freePort(port));

// ── Lancer chaque serveur d'app ───────────────────────────────────────────────
APPS.forEach(({ key, port, label }) => {
  const child = spawn('node', [SERVER_JS], {
    env:   { ...process.env, APP_KEY: key, PORT: String(port) },
    shell: false,
    stdio: 'pipe',
  });

  const prefix = `[${label}]`;

  child.stdout.on('data', d => process.stdout.write(`${prefix} ${d}`));
  child.stderr.on('data', d => process.stderr.write(`${prefix} ${d}`));

  child.on('exit', (code) => {
    console.log(`${prefix} Serveur arrêté (code ${code})`);
  });

  children.push(child);
});

// ── Hub central (port 4000) ───────────────────────────────────────────────────
const hubHtml = () => {
  const cards = APPS.map(({ label, port, color, key }) => `
    <a href="http://${PUBLIC_HOST}:${port}" target="_blank" class="card" style="--c:${color}">
      <div class="dot"></div>
      <div class="info">
        <div class="name">${label}</div>
        <div class="port">${PUBLIC_HOST}:${port}</div>
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
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;width:100%;max-width:900px}
    .card{display:flex;align-items:center;gap:14px;padding:18px 20px;background:#1a1d27;border:1px solid #2e3349;border-left:4px solid var(--c);border-radius:10px;text-decoration:none;color:#e2e8f0;transition:all .15s;cursor:pointer}
    .card:hover{background:#22263a;border-color:var(--c);transform:translateX(3px)}
    .dot{width:10px;height:10px;border-radius:50%;background:var(--c);flex-shrink:0;box-shadow:0 0 8px var(--c)}
    .info{flex:1}
    .name{font-weight:600;font-size:15px}
    .port{font-size:12px;color:#64748b;margin-top:3px;font-family:monospace}
    .arrow{color:#64748b;font-size:18px;transition:color .15s}
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
  <div class="footer">Chaque app est isolée sur son propre port — aucune interférence possible</div>
</body>
</html>`;
};

const hub = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(hubHtml());
});

hub.on('error', (err) => {
  console.error('Erreur hub:', err.message);
  children.forEach(c => { try { c.kill('SIGKILL'); } catch (_) {} });
  process.exit(1);
});

hub.listen(HUB_PORT, () => {
  console.log('\n🎭 Tests E2E — Serveurs démarrés\n');
  console.log(`   Hub central   → http://${PUBLIC_HOST}:${HUB_PORT}`);
  APPS.forEach(({ label, port }) => {
    console.log(`   ${label.padEnd(22)} → http://${PUBLIC_HOST}:${port}`);
  });
  console.log('');
});

// ── Arrêt propre ──────────────────────────────────────────────────────────────
function shutdown() {
  console.log('\n⛔ Arrêt de tous les serveurs...');
  children.forEach(c => { try { c.kill('SIGKILL'); } catch (_) {} });
  hub.close();
  process.exit(0);
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
