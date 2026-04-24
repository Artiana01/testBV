/**
 * apps/bvbusiness/tests/session-setup.spec.ts
 * ----------------------------------------
 * Initialisation session admin BV Business — Magic Link
 *
 * Usage : npm run session:bvbusiness
 *
 * Flux :
 *   1. Navigateur Playwright s'ouvre sur /fr/login
 *   2. Email pré-rempli → cliquez "Continuer avec l'adresse email"
 *   3. Allez sur Mailpit / boîte mail → cliquez le lien (s'ouvre en nouvel onglet)
 *   4. Dès qu'un onglet du navigateur Playwright atteint le dashboard → session sauvegardée
 */

import { test } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL     = process.env.BASE_URL   ?? 'https://staging.bluevalorisbusiness.com';
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL ?? 'webmaster@bluevaloris.com';
const AUTH_DIR     = path.resolve(__dirname, '../auth');
const SESSION_FILE = path.join(AUTH_DIR, 'admin.json');

function isConnected(url: string): boolean {
  return (
    url.includes('bluevalorisbusiness.com') &&
    !url.includes('/login') &&
    !url.includes('/signup') &&
    url.length > 10
  );
}

test('Initialisation session admin — Magic Link', async ({ page, context }) => {
  test.setTimeout(10 * 60 * 1000);

  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  BV Business — Initialisation de session');
  console.log('════════════════════════════════════════════════════════════');
  console.log('  1. Cliquez "Continuer avec l\'adresse email" dans le navigateur');
  console.log('  2. Allez dans Mailpit/boîte mail → cliquez le lien de connexion');
  console.log('  3. La session sera sauvegardée automatiquement');
  console.log('════════════════════════════════════════════════════════════\n');

  await page.goto(`${BASE_URL}/fr/login`);
  await page.waitForLoadState('load');

  // Déjà connecté ?
  if (isConnected(page.url())) {
    await context.storageState({ path: SESSION_FILE });
    console.log(`✅  Session sauvegardée → ${SESSION_FILE}`);
    return;
  }

  // Pré-remplir l'email
  await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  console.log(`✅  Email pré-rempli : ${ADMIN_EMAIL}`);
  console.log(`👆  Cliquez "Continuer avec l'adresse email"...\n`);

  // Surveiller TOUS les onglets du contexte Playwright (pas seulement le premier)
  const deadline = Date.now() + 10 * 60 * 1000;

  while (Date.now() < deadline) {
    // Vérifier chaque onglet ouvert dans ce navigateur
    for (const p of context.pages()) {
      try {
        const url = p.url();
        if (isConnected(url)) {
          console.log(`✅  Connexion détectée sur : ${url}`);
          await p.waitForTimeout(2000); // laisser les cookies se stabiliser
          await context.storageState({ path: SESSION_FILE });
          console.log(`✅  Session sauvegardée → ${SESSION_FILE}`);
          console.log('\n   Lancez maintenant : npm run test:bvbusiness\n');
          return;
        }
      } catch {
        // onglet en cours de chargement, on ignore
      }
    }
    await page.waitForTimeout(1000);
  }

  throw new Error('Timeout : connexion non détectée en 10 minutes.');
});
