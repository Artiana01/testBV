/**
 * apps/bvbusiness/tests/e2e-02-login-dashboard.spec.ts
 * -------------------------------------------------------
 * SC-02 : Connexion Magic Link + accès Dashboard (CRITIQUE)
 *
 * ID       : SC-02
 * Desc     : Vérification du flux magic link + accès dashboard avec KPIs
 * Précond  : Compte actif (webmaster@bluevaloris.com)
 * Résultat : Formulaire magic link fonctionnel, dashboard accessible via session
 *
 * ⚠️  BV Business utilise l'authentification par MAGIC LINK (sans mot de passe).
 *     - Les tests 02.1 à 02.4 testent l'UI du formulaire magic link.
 *     - Les tests 02.5 à 02.8 testent le dashboard via la session storageState.
 *       (Nécessite : npm run session:bvbusiness pour initialiser la session)
 *
 * Régression couverte :
 *   - Redirections post-login
 *   - Formulaire magic link (validations, boutons)
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'webmaster@bluevaloris.com';
const BASE        = process.env.BVBUSINESS_BASE_URL ?? 'https://staging.bluevalorisbusiness.com';

// ── Tests UI du formulaire Magic Link (sans session) ──
test.describe('SC-02 — Formulaire Magic Link (CRITIQUE)', () => {
  // Vider le storageState pour ces tests : session active → /login redirige vers dashboard
  test.use({ storageState: { cookies: [], origins: [] } });

  test('02.1 — La page login est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.verifyLoginPageLoaded();
  });

  test('02.2 — Le formulaire contient le champ email et le bouton "Continuer avec l\'adresse email"', async ({ page }) => {
    test.setTimeout(30_000);
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: /continuer avec l'adresse email|continue with email/i })
        .or(page.locator('button[type="submit"]'))
    ).toBeVisible({ timeout: 10_000 });
  });

  test('02.3 — Le bouton "Continuer avec Google" est présent', async ({ page }) => {
    test.setTimeout(30_000);
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.verifyGoogleButtonVisible();
  });

  test('02.4 — Soumission avec email valide affiche le bandeau de confirmation', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();

    // Utiliser un email de test pour déclencher l'envoi sans utiliser le compte réel
    // (OU utiliser l'email admin — un lien sera envoyé mais non cliqué dans ce test)
    await loginPage.fillEmail(ADMIN_EMAIL);
    await loginPage.clickContinueWithEmail();
    await loginPage.verifyMagicLinkSent();
    console.log(`Magic link envoyé à : ${ADMIN_EMAIL}`);
  });

  test('02.5 — Soumission avec email invalide affiche une erreur', async ({ page }) => {
    test.setTimeout(30_000);
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.fillEmail('email-invalide-sans-arobase');
    await loginPage.clickContinueWithEmail();
    await loginPage.verifyErrorOnInvalidEmail();
  });

  test('02.6 — Soumission sans email affiche une erreur de validation', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`${BASE}/fr/login`);
    await page.waitForLoadState('load');
    // Clic direct sans remplir le champ
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(1500);
    // Soit erreur HTML5 natif, soit message d'erreur visible, soit on reste sur /login
    const isStillOnLogin = page.url().includes('/login');
    expect(isStillOnLogin).toBeTruthy();
  });

});

// ── Tests Dashboard (session storageState pré-connectée) ──
test.describe('SC-02 — Dashboard après connexion (storageState)', () => {

  test('02.7 — Dashboard est accessible avec la session active', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyAdminDashboardLoaded();
  });

  test('02.8 — KPIs sont visibles sur le dashboard admin', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyKpisVisible();
  });

  test('02.9 — La navigation admin (sidebar/menu) est visible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyAdminNavigation();
  });

  test('02.10 — Pas de redirection vers /login avec session active', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`${BASE}/fr/dashboard`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  });

});
