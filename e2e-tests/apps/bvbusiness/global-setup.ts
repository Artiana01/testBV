/**
 * apps/bvbusiness/global-setup.ts
 * --------------------------------
 * Exécuté UNE SEULE FOIS avant tous les tests BV Business.
 *
 * ⚠️  BV Business utilise l'authentification par MAGIC LINK (sans mot de passe).
 *     Il est impossible de se connecter automatiquement sans accès à la boîte mail.
 *
 * Ce script vérifie si une session admin valide existe déjà dans auth/admin.json.
 *   - Session valide → tests lancés directement.
 *   - Session absente ou expirée → instructions affichées pour la régénérer
 *     via : npm run session:bvbusiness
 *
 * Pour initialiser/renouveler la session manuellement :
 *   npx ts-node apps/bvbusiness/session-setup.ts
 *   OU
 *   npm run session:bvbusiness
 */

import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL  = process.env.BVBUSINESS_BASE_URL ?? 'https://staging.bluevalorisbusiness.com';
const AUTH_DIR  = path.resolve(__dirname, 'auth');
const ADMIN_SESSION = path.join(AUTH_DIR, 'admin.json');

async function isSessionValid(sessionFile: string): Promise<boolean> {
  if (!fs.existsSync(sessionFile)) return false;

  let sessionData: { cookies?: Array<{ expires?: number }> };
  try {
    sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
  } catch {
    return false;
  }

  // Session vide (placeholder initial)
  const cookies = sessionData.cookies ?? [];
  if (cookies.length === 0) return false;

  // Vérifier expiration des cookies (si tous expirés → session invalide)
  const now = Date.now() / 1000;
  const activeCookies = cookies.filter((c) => !c.expires || c.expires === -1 || c.expires > now);
  if (activeCookies.length === 0) return false;

  // Vérifier avec un vrai chargement de page
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ storageState: sessionFile });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/fr/dashboard`, { waitUntil: 'load', timeout: 20_000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    const isAuthenticated = !url.includes('/login') && !url.includes('/signup');
    await ctx.close();
    return isAuthenticated;
  } catch {
    return false;
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig) {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // Sur Railway : si BVBUSINESS_SESSION est définie (base64 du admin.json),
  // on l'écrit dans le fichier et on saute la validation navigateur
  // (les PHPSESSID sont liés à l'IP locale, mais le JWT token reste valide depuis Railway).
  const sessionEnv = process.env.BVBUSINESS_SESSION;
  if (sessionEnv) {
    try {
      const decoded = Buffer.from(sessionEnv, 'base64').toString('utf-8');
      const sessionData = JSON.parse(decoded);
      fs.writeFileSync(ADMIN_SESSION, decoded, 'utf-8');

      // Vérifier que le JWT token n'est pas expiré
      const now = Date.now() / 1000;
      const cookies: Array<{ name?: string; expires?: number }> = sessionData.cookies ?? [];
      const jwtCookie = cookies.find((c) => c.name === 'token');
      if (jwtCookie && jwtCookie.expires && jwtCookie.expires > 0 && jwtCookie.expires < now) {
        console.log('   ⚠️   JWT token expiré dans BVBUSINESS_SESSION. Renouveler la session.');
      } else {
        console.log('   📦  Session chargée depuis BVBUSINESS_SESSION (Railway). JWT valide.');
        console.log('   ✅  Lancement des tests...\n');
        return; // Sauter la validation navigateur — PHPSESSID non portable entre IPs
      }
    } catch {
      console.log('   ⚠️   BVBUSINESS_SESSION invalide — ignorée.');
    }
  }

  console.log('\n🔍  Vérification de la session admin BV Business...');

  const valid = await isSessionValid(ADMIN_SESSION);

  if (valid) {
    console.log('   ✅  Session admin valide. Lancement des tests...\n');
    return;
  }

  // Session absente ou expirée
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ⚠️   SESSION ADMIN EXPIRÉE OU ABSENTE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  BV Business utilise l\'authentification par MAGIC LINK.');
  console.log('  Vous devez initialiser la session manuellement une fois.');
  console.log('');
  console.log('  Étapes :');
  console.log('   1. Lancez : npm run session:bvbusiness');
  console.log('   2. Un navigateur s\'ouvre sur la page login');
  console.log('   3. Saisissez : ' + (process.env.ADMIN_EMAIL ?? 'webmaster@bluevaloris.com'));
  console.log('   4. Cliquez "Continuer avec l\'adresse email"');
  console.log('   5. Ouvrez le lien reçu dans votre boîte mail');
  console.log('   6. Le navigateur se ferme automatiquement après connexion');
  console.log('   7. Relancez : npm run test:bvbusiness');
  console.log('');
  console.log('  La session est valide ~1h selon les cookies de l\'app.');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Les tests publics (SC-01, SC-02 UI) peuvent quand même tourner
  // Les tests authentifiés échoueront avec un message clair
  console.log('  ℹ️   Les tests sans authentification (SC-01, SC-02 UI) vont démarrer.');
  console.log('      Les tests authentifiés (SC-03 à SC-09, régression) seront en échec.\n');
}
