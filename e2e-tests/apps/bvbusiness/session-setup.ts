/**
 * apps/bvbusiness/session-setup.ts
 * ----------------------------------
 * Script interactif pour initialiser la session admin BV Business.
 *
 * Utilisation :
 *   npx ts-node apps/bvbusiness/session-setup.ts
 *   OU
 *   npm run session:bvbusiness
 *
 * Flux :
 *   1. Ouvre un navigateur Chromium VISIBLE sur la page login
 *   2. Pré-remplit l'email admin
 *   3. Vous cliquez "Continuer avec l'adresse email"
 *   4. Vous ouvrez le magic link reçu dans votre boîte mail (dans CE même navigateur)
 *   5. Dès que vous êtes connecté (URL hors /login), la session est sauvegardée
 *   6. Le navigateur se ferme
 *
 * La session est sauvegardée dans auth/admin.json et réutilisée par tous les tests.
 */

import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL    = process.env.BASE_URL  ?? 'https://staging.bluevalorisbusiness.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'webmaster@bluevaloris.com';
const AUTH_DIR    = path.resolve(__dirname, 'auth');
const SESSION_FILE = path.join(AUTH_DIR, 'admin.json');

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes pour recevoir et cliquer le lien

(async () => {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  console.log('\n🚀  BV Business — Initialisation de session admin');
  console.log('════════════════════════════════════════════════════');
  console.log(`   App     : ${BASE_URL}`);
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log('════════════════════════════════════════════════════');
  console.log('');
  console.log('   Instructions :');
  console.log('   1. Le navigateur va s\'ouvrir sur la page login');
  console.log('   2. L\'email est pré-rempli — cliquez "Continuer avec l\'adresse email"');
  console.log('   3. Ouvrez votre boîte mail et cliquez le lien de connexion');
  console.log('      ⚠️  Ouvrez le lien dans CE navigateur (pas dans un autre)');
  console.log('   4. Une fois connecté, la session sera sauvegardée automatiquement');
  console.log('');
  console.log('   Vous avez 5 minutes pour compléter l\'opération...\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    viewport: null,
  });

  const page = await context.newPage();

  // Aller sur la page login et pré-remplir l'email
  await page.goto(`${BASE_URL}/fr/login`);
  await page.waitForLoadState('load');

  // Vérifier si déjà connecté
  if (!page.url().includes('/login')) {
    console.log('   ✅  Déjà connecté ! Sauvegarde de la session...');
    await context.storageState({ path: SESSION_FILE });
    console.log(`   ✅  Session sauvegardée → ${SESSION_FILE}`);
    await browser.close();
    console.log('\n   Vous pouvez maintenant lancer : npm run test:bvbusiness\n');
    process.exit(0);
  }

  // Pré-remplir l'email
  try {
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    console.log(`   ✅  Email pré-rempli : ${ADMIN_EMAIL}`);
    console.log('   👆  Cliquez maintenant "Continuer avec l\'adresse email" dans le navigateur\n');
  } catch {
    console.warn('   ⚠️  Champ email non trouvé — remplissez manuellement dans le navigateur');
  }

  // Attendre que l'utilisateur soit connecté (URL hors /login)
  const deadline = Date.now() + TIMEOUT_MS;
  let authenticated = false;

  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    if (!currentUrl.includes('/login') && !currentUrl.includes('/signup') && currentUrl.includes(BASE_URL.replace('https://', ''))) {
      authenticated = true;
      break;
    }
  }

  if (!authenticated) {
    console.error('\n   ❌  Timeout : connexion non détectée dans les 5 minutes.');
    console.error('      Relancez : npm run session:bvbusiness\n');
    await browser.close();
    process.exit(1);
  }

  // Sauvegarder la session
  console.log('\n   ✅  Connexion détectée ! Sauvegarde de la session...');
  await page.waitForTimeout(1000); // Laisser les cookies se stabiliser
  await context.storageState({ path: SESSION_FILE });
  console.log(`   ✅  Session sauvegardée → ${SESSION_FILE}`);

  await browser.close();

  console.log('\n════════════════════════════════════════════════════');
  console.log('   Session prête ! Lancez maintenant :');
  console.log('   npm run test:bvbusiness');
  console.log('════════════════════════════════════════════════════\n');
  process.exit(0);
})();
