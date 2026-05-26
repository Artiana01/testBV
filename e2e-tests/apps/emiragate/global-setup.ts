/**
 * apps/emiragate/global-setup.ts
 * --------------------------------
 * Exécuté UNE SEULE FOIS avant tous les tests Emiragate (BV Install).
 * Utilise le helper partagé : session réutilisée si < 4h, sinon reconnexion.
 *
 * Sur Railway : si EMIRAGATE_ADMIN_SESSION est définie (base64 admin.json),
 *   on l'écrit et on saute la validation navigateur.
 */

import { FullConfig, chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { loginAndSave, ensureAuthDir, isSessionFresh } from '../../shared/login-helper';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL     = process.env.EMIRAGATE_BASE_URL       ?? 'https://dev.bluevalorisinstall.com';
const ADMIN_EMAIL  = process.env.EMIRAGATE_ADMIN_EMAIL    ?? '';
const ADMIN_PASS   = process.env.EMIRAGATE_ADMIN_PASSWORD ?? '';
const CLIENT_EMAIL = process.env.EMIRAGATE_CLIENT_EMAIL   ?? '';
const CLIENT_PASS  = process.env.EMIRAGATE_CLIENT_PASSWORD ?? '';

const AUTH_DIR       = path.resolve(__dirname, 'auth');
const ADMIN_SESSION  = path.join(AUTH_DIR, 'admin.json');
const CLIENT_SESSION = path.join(AUTH_DIR, 'client.json');
const LOGIN_URL      = `${BASE_URL}/en/login`;

async function isSiteAvailable(url: string): Promise<boolean> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    const bodyText = await page.locator('body').textContent().catch(() => '');
    const isComingSoon = /coming soon|under maintenance|bientôt|en maintenance/i.test(bodyText ?? '');
    return !isComingSoon;
  } catch {
    return false;
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig) {
  ensureAuthDir(AUTH_DIR);

  // Vérification rapide de la disponibilité du site
  const siteUp = await isSiteAvailable(BASE_URL);
  if (!siteUp) {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ⚠️   SITE EMIRAGATE NON DISPONIBLE (Coming Soon / Maintenance)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  URL:', BASE_URL);
    console.log('  Les tests seront en échec tant que le site est hors ligne.');
    console.log('═══════════════════════════════════════════════════════════════\n');
    return;
  }

  // Railway : charger session admin depuis variable d'environnement
  const adminSessionEnv = process.env.EMIRAGATE_ADMIN_SESSION;
  if (adminSessionEnv) {
    try {
      const decoded = Buffer.from(adminSessionEnv, 'base64').toString('utf-8');
      const sessionData = JSON.parse(decoded);
      fs.writeFileSync(ADMIN_SESSION, decoded, 'utf-8');

      const now = Date.now() / 1000;
      const cookies: Array<{ name?: string; expires?: number }> = sessionData.cookies ?? [];
      const tokenCookie = cookies.find(c =>
        c.name === 'token' || c.name === 'session' || c.name === 'access_token'
      );
      if (tokenCookie && tokenCookie.expires && tokenCookie.expires > 0 && tokenCookie.expires < now) {
        console.log('   ⚠️   Token expiré dans EMIRAGATE_ADMIN_SESSION. Renouveler la session.');
      } else {
        console.log('   📦  Session admin chargée depuis EMIRAGATE_ADMIN_SESSION (Railway).');
        console.log('   ✅  Lancement des tests...\n');
        return;
      }
    } catch {
      console.log('   ⚠️   EMIRAGATE_ADMIN_SESSION invalide — ignorée.');
    }
  }

  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ⚠️   IDENTIFIANTS ADMIN MANQUANTS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Renseignez EMIRAGATE_ADMIN_EMAIL et EMIRAGATE_ADMIN_PASSWORD');
    console.log('  dans apps/emiragate/.env puis relancez les tests.');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  ℹ️   Les tests publics (SC-04, SC-05 form) peuvent démarrer.');
    console.log('      Les tests admin/client seront en échec.\n');
    return;
  }

  // === SESSION ADMIN ===
  await loginAndSave({
    email:       ADMIN_EMAIL,
    password:    ADMIN_PASS,
    loginUrl:    LOGIN_URL,
    sessionFile: ADMIN_SESSION,
    label:       'Emiragate-Admin',
    skipUrls:    ['/login', '/signin', '/connexion'],
  });

  // === SESSION CLIENT ===
  if (CLIENT_EMAIL && CLIENT_PASS) {
    if (!isSessionFresh(CLIENT_SESSION)) {
      await new Promise(r => setTimeout(r, 3_000));
    }
    await loginAndSave({
      email:       CLIENT_EMAIL,
      password:    CLIENT_PASS,
      loginUrl:    LOGIN_URL,
      sessionFile: CLIENT_SESSION,
      label:       'Emiragate-Client',
      skipUrls:    ['/login', '/signin', '/connexion'],
    });
  } else {
    console.log('\n   ℹ️   Pas de compte client configuré (EMIRAGATE_CLIENT_EMAIL/PASSWORD).');
  }

  console.log('\n🚀  Sessions prêtes. Lancement des tests Emiragate...\n');
}
