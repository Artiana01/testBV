/**
 * apps/bvbusiness/tests/e2e-01-signup.spec.ts
 * ---------------------------------------------
 * SC-01 : Création et activation de compte (CRITIQUE)
 *
 * ID       : SC-01
 * Desc     : Création de compte via Magic Link (email uniquement, sans mot de passe)
 * Précond  : Aucun compte existant avec l'email utilisé
 * Résultat : Bandeau de confirmation "lien de connexion envoyé" visible
 *
 * Flux réel BV Business :
 *   1. Saisir un email sur /fr/login
 *   2. Cliquer "Continuer avec l'adresse email"
 *   3. Recevoir le magic link par email → cliquer → compte activé
 *
 * Note : Le clic sur le lien dans l'email ne peut pas être automatisé
 *        sans accès à une boîte mail de test.
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { SignupPage } from '../pages/SignupPage';
import { generateRandomEmail } from '../../../shared/utils/helpers';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.BASE_URL ?? 'https://staging.bluevalorisbusiness.com';

test.describe('SC-01 — Création de compte Magic Link (CRITIQUE)', () => {

  test('01.1 — La page login/inscription est accessible et contient le formulaire', async ({ page }) => {
    test.setTimeout(30_000);
    const signupPage = new SignupPage(page);
    await signupPage.navigateToSignup();
    await signupPage.verifySignupFormVisible();
  });

  test('01.2 — Soumission sans email reste sur /login (validation)', async ({ page }) => {
    test.setTimeout(20_000);
    await page.goto(`${BASE}/fr/login`);
    await page.waitForLoadState('load');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1000);
    // La validation HTML5 empêche la soumission → on reste sur /login
    expect(page.url()).toContain('/login');
  });

  test('01.3 — Soumission avec un nouvel email envoie un magic link', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    const testEmail = generateRandomEmail('bvb-new', 'mailinator.com');
    await signupPage.navigateToSignup();
    await signupPage.fillEmail(testEmail);
    await signupPage.submitSignupForm();
    await signupPage.verifyMagicLinkSent();
    console.log(`Magic link envoyé pour nouveau compte : ${testEmail}`);
  });

  test('01.4 — L\'email est affiché après envoi du magic link', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    const testEmail = generateRandomEmail('bvb-display', 'mailinator.com');
    await signupPage.navigateToSignup();
    await signupPage.fillEmail(testEmail);
    await signupPage.submitSignupForm();
    // L'email saisi doit être visible sur la page (dans le champ ou en texte)
    const emailDisplay = page.locator('input[type="email"]')
      .or(page.getByText(testEmail));
    await expect(emailDisplay.first()).toBeVisible({ timeout: 10_000 });
  });

  test('01.5 — Le bouton "Continuer avec Google" est disponible comme alternative', async ({ page }) => {
    test.setTimeout(20_000);
    await page.goto(`${BASE}/fr/login`);
    await page.waitForLoadState('load');
    const googleBtn = page.getByText(/continuer avec google|continue with google/i);
    await expect(googleBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test('01.6 — La page affiche les mentions légales (CGU / Politique de confidentialité)', async ({ page }) => {
    test.setTimeout(20_000);
    await page.goto(`${BASE}/fr/login`);
    await page.waitForLoadState('load');
    const legal = page.getByText(/conditions d'utilisation|terms|politique de confidentialité|privacy/i);
    await expect(legal.first()).toBeVisible({ timeout: 10_000 });
  });

});
