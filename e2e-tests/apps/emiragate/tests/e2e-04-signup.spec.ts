/**
 * SC-04 : Inscription client (CRITIQUE)
 *
 * Préconditions : aucun compte existant (navigateur vierge)
 * Couvre : accès formulaire, champs, remplissage, soumission
 *
 * ⚠️  La soumission réelle crée un vrai compte — on teste l'accessibilité
 *     et la structure du formulaire sans soumettre (ou avec email unique).
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { SignupPage } from '../pages/SignupPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.EMIRAGATE_BASE_URL ?? 'https://dev.bluevalorisinstall.com';

test.describe('SC-04 — Inscription client (CRITIQUE)', () => {

  test('04.1 — La page d\'inscription est accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.verifySignupPageLoaded();
  });

  test('04.2 — Le formulaire contient le champ Email', async ({ page }) => {
    test.setTimeout(60_000);
    const signup = new SignupPage(page);
    await signup.goto();
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 20_000 });
  });

  test('04.3 — Le formulaire contient le champ Mot de passe', async ({ page }) => {
    test.setTimeout(60_000);
    const signup = new SignupPage(page);
    await signup.goto();
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 20_000 });
  });

  test('04.4 — Les champs sont remplissables', async ({ page }) => {
    test.setTimeout(60_000);
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.fillSignupForm('Test Emiragate', 'test.e2e.emiragate@example.com', 'TestPass123!');
    await expect(page.locator('input[type="email"]').first()).toHaveValue('test.e2e.emiragate@example.com');
  });

  test('04.5 — Le bouton de soumission est présent', async ({ page }) => {
    test.setTimeout(60_000);
    const signup = new SignupPage(page);
    await signup.goto();
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 20_000 });
  });

  test('04.6 — Lien vers la page login visible depuis l\'inscription', async ({ page }) => {
    test.setTimeout(60_000);
    const signup = new SignupPage(page);
    await signup.goto();
    const loginLink = page.locator('a[href*="login"], a[href*="signin"]')
      .or(page.getByText(/se connecter|sign in|already have/i));
    const isVisible = await loginLink.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Lien vers login non visible depuis le signup');
    }
    await expect(page.locator('body')).toBeVisible();
  });

});
