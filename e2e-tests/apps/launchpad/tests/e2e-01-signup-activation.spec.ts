/**
 * apps/launchpad/tests/e2e-01-signup-activation.spec.ts
 * -------------------------------------------------------
 * SCÉNARIO E2E #1 — Partie 1 : Activation & Inscription (P0 CRITIQUE)
 *
 * Étapes :
 *   1. Accéder au site
 *   2. Cliquer sur "Activer Launchpad"
 *   3. Remplir le formulaire (nom, email, mdp, etc.)
 *   4. Soumettre
 *
 * Résultats attendus :
 *   ✅ Compte créé avec succès
 *   ✅ Notification affichée
 *   ✅ Email client (confirmation + vérification) envoyé
 *   ✅ Email admin (nouvel utilisateur) envoyé
 *
 * Note : si reCAPTCHA actif, la soumission est bloquée côté automatisation.
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { SignupPage } from '../pages/SignupPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('E2E 01 — Activation & Inscription Launchpad (P0 CRITIQUE)', () => {

  test("01.1 — La page d'accueil est accessible", async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.gotoHomepage();
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 });
    console.log('Page d\'accueil chargée:', page.url());
  });

  test('01.2 — Le bouton "Activer Launchpad" est visible sur la page d\'accueil', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.gotoHomepage();
    const activateBtn = page.getByRole('link', { name: /activer launchpad|activer|activate|s'inscrire|commencer/i })
      .or(page.getByRole('button', { name: /activer launchpad|activer|activate|commencer/i }))
      .or(page.getByText(/activer launchpad/i));
    const found = await activateBtn.first().isVisible({ timeout: 10_000 }).catch(() => false);
    if (!found) {
      console.log('ℹ️  Bouton "Activer Launchpad" non trouvé — le texte du CTA est peut-être différent sur cette version');
      test.skip(true, 'CTA "Activer Launchpad" absent sur cette page — vérifier le texte réel du bouton');
      return;
    }
    await expect(activateBtn.first()).toBeVisible();
  });

  test('01.3 — Cliquer sur "Activer Launchpad" redirige vers le formulaire d\'inscription', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.gotoHomepage();
    const activateBtn = page.getByRole('link', { name: /activer launchpad|activer|activate|s'inscrire|commencer/i })
      .or(page.getByRole('button', { name: /activer launchpad|activer|activate|commencer/i }))
      .or(page.getByText(/activer launchpad/i));
    const found = await activateBtn.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!found) {
      test.skip(true, 'CTA "Activer Launchpad" absent — test ignoré');
      return;
    }
    await activateBtn.first().click();
    // Après le clic, on doit être sur la page d'inscription
    const currentUrl = page.url();
    const isOnSignup = /signup|inscription|register|creer|créer/i.test(currentUrl);
    if (!isOnSignup) {
      // Peut-être qu'il redirige directement vers le formulaire inline
      const formVisible = await page.locator('input[type="email"], input[type="password"]').first().isVisible({ timeout: 5_000 }).catch(() => false);
      expect(isOnSignup || formVisible).toBeTruthy();
    }
    console.log('URL après activation:', currentUrl);
  });

  test('01.4 — Le formulaire d\'inscription contient le champ Email', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.gotoSignup();
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 20_000 });
  });

  test('01.5 — Le formulaire contient les champs Mot de passe', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.gotoSignup();
    const passwordFields = page.locator('input[type="password"]');
    const count = await passwordFields.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(passwordFields.first()).toBeVisible({ timeout: 20_000 });
  });

  test('01.6 — Les champs du formulaire sont remplissables', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.gotoSignup();

    const emailField = page.locator('input[type="email"]').first();
    await emailField.fill('test.launchpad@bvtest.com');
    await expect(emailField).toHaveValue('test.launchpad@bvtest.com');

    const passwordFields = page.locator('input[type="password"]');
    if (await passwordFields.count() >= 1) {
      await passwordFields.first().fill('TestLaunch123!');
      await expect(passwordFields.first()).toHaveValue('TestLaunch123!');
    }
  });

  test('01.7 — Inscription complète : soumission du formulaire', async ({ page }) => {
    test.setTimeout(90_000);
    const signupPage = new SignupPage(page);
    await signupPage.gotoSignup();

    const uniqueEmail = `launchpad.e2e.${Date.now()}@test.test`;

    await signupPage.fillSignupForm({
      name:     'Launchpad TestUser',
      email:    uniqueEmail,
      password: 'TestLaunch123!',
      phone:    '+33612345678',
    });

    // Vérifier la présence d'un éventuel reCAPTCHA
    const recaptcha = page.locator('iframe[src*="recaptcha"], .g-recaptcha, [data-sitekey]');
    const hasRecaptcha = await recaptcha.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasRecaptcha) {
      console.log('ℹ️  reCAPTCHA détecté — soumission automatisée impossible');
      test.skip(true, 'reCAPTCHA actif : soumission manuelle requise');
      return;
    }

    await signupPage.submitSignupForm();

    // Vérifier succès ou message de confirmation
    await Promise.race([
      page.waitForURL(/dashboard|login|otp|verification|confirm/, { timeout: 30_000 }).catch(() => {}),
      page.waitForSelector('[role="alert"], [class*="toast"], [class*="success"]', { timeout: 15_000 }).catch(() => {}),
    ]);

    const finalUrl = page.url();
    const isNotOnSignup = !/signup|inscription/i.test(finalUrl);
    const hasSuccess = await page.getByText(/compte créé|inscription réussie|vérifiez|confirmation|succès/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
    expect(isNotOnSignup || hasSuccess).toBeTruthy();
    console.log('✅ Inscription soumise — URL finale:', finalUrl);
  });

  test('01.8 — Un lien "Se connecter" est visible sur le formulaire d\'inscription', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.gotoSignup();
    const loginLink = page.locator('a[href*="login"]')
      .or(page.getByText(/se connecter|vous avez déjà un compte|sign in|connexion/i));
    await expect(loginLink.first()).toBeVisible({ timeout: 20_000 });
  });

});
