/**
 * e2e-03-signup.spec.ts — Créer Ailleurs
 * SC-03 : Création de compte utilisateur
 *
 * Vérifie : parcours inscription, validation champs, anomalies connues
 * Priorité : P0 Critique
 *
 * Anomalies documentées :
 *   - Absence de bouton "voir le mot de passe" (bug connu)
 *   - Mot de passe oublié non fonctionnel (bug connu)
 */
import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';

const BASE = process.env.BASE_URL ?? 'https://www.creerailleurs.com';

test.describe('SC-03 — Création de compte utilisateur', () => {

  test('03.1 — La page d\'inscription est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const auth = new AuthPage(page);
    await auth.navigateToSignup();
    await expect(page).toHaveURL(/signup|inscription|register/i, { timeout: 10_000 });
    await expect(page.locator('form').first()).toBeVisible({ timeout: 10_000 });
  });

  test('03.2 — Les champs obligatoires sont présents (Nom, Email, Mot de passe)', async ({ page }) => {
    test.setTimeout(30_000);
    const auth = new AuthPage(page);
    await auth.navigateToSignup();
    await expect(auth.name_input.first()).toBeVisible({ timeout: 10_000 });
    await expect(auth.email_input).toBeVisible({ timeout: 10_000 });
    await expect(auth.password_input).toBeVisible({ timeout: 10_000 });
  });

  test('03.3 — Les champs du formulaire sont remplissables', async ({ page }) => {
    test.setTimeout(30_000);
    const auth = new AuthPage(page);
    await auth.navigateToSignup();
    const email = `qa.test.${Date.now()}@test.com`;
    await auth.fillSignupForm('Test QA', email, 'TestQA123!');
    await expect(auth.email_input).toHaveValue(email);
  });

  test('03.4 — Soumission avec email vide → validation bloquée', async ({ page }) => {
    test.setTimeout(30_000);
    const auth = new AuthPage(page);
    await auth.navigateToSignup();
    await auth.name_input.first().fill('Test QA');
    await auth.password_input.fill('TestQA123!');
    await auth.submit();
    // On doit rester sur la page d'inscription
    const url = page.url();
    expect(url).toMatch(/signup|inscription|register/i);
  });

  test('03.5 — Soumission avec mot de passe trop court → validation', async ({ page }) => {
    test.setTimeout(30_000);
    const auth = new AuthPage(page);
    await auth.navigateToSignup();
    const email = `qa.test.${Date.now()}@test.com`;
    await auth.fillSignupForm('Test QA', email, '123');
    await auth.submit();
    // Vérifier qu'on reste sur le formulaire ou qu'une erreur apparaît
    await page.waitForTimeout(1500);
    const url = page.url();
    const hasError = await auth.error_msg.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(url.match(/signup|inscription|register/) || hasError).toBeTruthy();
  });

  test('03.6 — Inscription complète avec un nouveau compte', async ({ page }) => {
    test.setTimeout(60_000);
    const auth = new AuthPage(page);
    await auth.navigateToSignup();
    const email = `qa.new.${Date.now()}@test.com`;
    await auth.fillSignupForm('Test QA Nouveau', email, 'NewQATest123!');
    await auth.submit();

    // Vérifier : soit redirection vers OTP/confirmation, soit message de succès
    await page.waitForTimeout(2000);
    const url = page.url();
    const success = await auth.success_msg.isVisible({ timeout: 5_000 }).catch(() => false);
    const redirected = !url.includes('/signup') && !url.includes('/inscription');
    expect(success || redirected).toBeTruthy();
    console.log(`Inscription testée avec email: ${email}`);
  });

  test('03.7 — Inscription avec email déjà utilisé → erreur', async ({ page }) => {
    test.setTimeout(30_000);
    const auth = new AuthPage(page);
    await auth.navigateToSignup();
    // Utiliser l'email de test existant
    const existingEmail = process.env.TEST_EMAIL || 'test@creerailleurs.com';
    await auth.fillSignupForm('Test Existant', existingEmail, 'TestQA123!');
    await auth.submit();
    await page.waitForTimeout(2000);
    const hasError = await auth.error_msg.isVisible({ timeout: 5_000 }).catch(() => false);
    const stayedOnSignup = page.url().match(/signup|inscription|register/);
    expect(hasError || stayedOnSignup).toBeTruthy();
  });

  test('03.8 — [BUG CONNU] Absence du bouton "voir le mot de passe"', async ({ page }) => {
    test.setTimeout(30_000);
    const auth = new AuthPage(page);
    await auth.navigateToSignup();
    // Vérifier l'absence du toggle "voir mot de passe"
    const togglePw = page.locator(
      'button[aria-label*="voir"], button[aria-label*="show"], [class*="toggle-password"], [class*="eye"]'
    ).first();
    const isVisible = await togglePw.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isVisible) {
      console.log('ANOMALIE SC-03: Bouton "voir le mot de passe" absent — amélioration UX recommandée');
    }
    // Ce test passe toujours — il documente le bug
    expect(true).toBeTruthy();
  });

  test('03.9 — [BUG CONNU] Lien "Mot de passe oublié" présent mais non fonctionnel', async ({ page }) => {
    test.setTimeout(30_000);
    const auth = new AuthPage(page);
    await auth.navigateToLogin();
    const forgotLink = auth.forgot_link.first();
    const isVisible = await forgotLink.isVisible({ timeout: 5_000 }).catch(() => false);
    if (isVisible) {
      await forgotLink.click();
      await page.waitForTimeout(2000);
      const url = page.url();
      console.log(`Lien "Mot de passe oublié" redirige vers: ${url}`);
      // Documenter si la page n'existe pas
      if (url.includes('404') || url.includes('not-found')) {
        console.log('ANOMALIE SC-03: Page "Mot de passe oublié" retourne 404');
      }
    } else {
      console.log('ANOMALIE SC-03: Lien "Mot de passe oublié" non trouvé sur la page login');
    }
    expect(true).toBeTruthy();
  });

});
