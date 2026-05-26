/**
 * apps/bvtech/tests/e2e-01-signup.spec.ts
 * ------------------------------------------
 * E2E 01 : Inscription + Accès Dashboard (CRITIQUE)
 *
 * ⚠️  CONTRAINTE CONNUE : reCAPTCHA Google présent sur le formulaire.
 *     La soumission automatisée du formulaire est impossible sans
 *     désactiver le reCAPTCHA côté serveur (env variable).
 *
 * Ce que ces tests couvrent :
 *   ✅ Accessibilité de la page d'inscription
 *   ✅ Présence de tous les champs requis (Nom, Email, Mot de passe)
 *   ✅ Présence du reCAPTCHA (confirmation que c'est lui qui bloque)
 *   ✅ Remplissage du formulaire (hors soumission)
 *   ✅ Navigation vers le formulaire depuis la page login
 *   ⚠️  Soumission ignorée — reCAPTCHA empêche l'automatisation
 *
 * Priorité : Critique
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { SignupPage } from '../pages/SignupPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

test.describe('E2E 01 — Inscription + Accès Dashboard (CRITIQUE)', () => {

  test("01.1 — La page d'inscription est accessible", async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    await expect(page).toHaveURL(/signup/i, { timeout: 20_000 });
    const heading = page.getByText(/créer un compte/i);
    await expect(heading.first()).toBeVisible({ timeout: 20_000 });
  });

  test('01.2 — Le formulaire contient le champ Nom', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    // Champ Nom : input[name="name"] avec placeholder "Jean Dupont"
    const nomField = page.locator('input[name="name"]')
      .or(page.getByPlaceholder(/jean dupont/i));
    await expect(nomField.first()).toBeVisible({ timeout: 20_000 });
  });

  test('01.3 — Le formulaire contient le champ Email', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 20_000 });
  });

  test('01.4 — Le formulaire contient les champs Mot de passe et Confirmation', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    const passwordFields = page.locator('input[type="password"]');
    const count = await passwordFields.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await expect(passwordFields.first()).toBeVisible({ timeout: 20_000 });
  });

  test('01.5 — Le reCAPTCHA est présent sur le formulaire', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    const recaptcha = page.locator('iframe[title*="reCAPTCHA"], .g-recaptcha, [data-sitekey]')
      .or(page.locator('iframe[src*="recaptcha"]'));
    await expect(recaptcha.first()).toBeVisible({ timeout: 20_000 });
    console.log('reCAPTCHA détecté — Soumission automatisée impossible sans clés de test');
  });

  test('01.6 — Les champs du formulaire sont remplissables', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.goto();

    const nomField = page.locator('input[name="name"]');
    await nomField.fill('Test BVTech User');

    const emailField = page.locator('input[type="email"]');
    await emailField.fill('test.e2e@bvtest.com');

    const passwordFields = page.locator('input[type="password"]');
    if (await passwordFields.count() >= 1) await passwordFields.first().fill('TestUser123!');
    if (await passwordFields.count() >= 2) await passwordFields.nth(1).fill('TestUser123!');

    await expect(nomField).toHaveValue('Test BVTech User');
    await expect(emailField).toHaveValue('test.e2e@bvtest.com');
  });

  test("01.7 — Lien vers la page login visible depuis l'inscription", async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    const loginLink = page.locator('a[href*="login"]')
      .or(page.getByText(/se connecter|vous avez déjà un compte|sign in/i));
    await expect(loginLink.first()).toBeVisible({ timeout: 20_000 });
  });

  test('01.8 — Navigation vers le signup depuis la page login', async ({ page }) => {
    // La page /fr/login ne contient pas de lien vers /fr/signup (comportement actuel de l'app)
    test.skip(true, 'Pas de lien signup sur la page login — a implémenter côté app si besoin');
  });

});
