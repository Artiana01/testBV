/**
 * apps/launchpad/tests/e2e-02-login-dashboard.spec.ts
 * -----------------------------------------------------
 * SCÉNARIO E2E #1 — Partie 2 : Connexion + Dashboard (P0 CRITIQUE)
 *
 * Étapes :
 *   5. Se connecter (après vérification email)
 *   6. Vérifier la redirection vers le dashboard
 *   7. Vérifier le contenu du dashboard
 *
 * Résultats attendus :
 *   ✅ Connexion réussie
 *   ✅ Redirection vers dashboard
 *   ✅ Navigation sidebar visible
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CLIENT_EMAIL    = process.env.TEST_EMAIL    ?? 'lilie@test.test';
const CLIENT_PASSWORD = process.env.TEST_PASSWORD ?? 'lilie123!';

test.describe('E2E 02 — Connexion + Dashboard Launchpad (P0 CRITIQUE)', () => {

  test('02.1 — La page login est accessible et contient le formulaire', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('02.2 — Connexion réussie avec identifiants valides (client)', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.login(CLIENT_EMAIL, CLIENT_PASSWORD);
    await loginPage.verifyLoginSuccess();
    console.log('✅ Connexion réussie:', CLIENT_EMAIL);
  });

  test('02.3 — Connexion échouée avec mauvais mot de passe', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.fillLoginForm(CLIENT_EMAIL, 'mauvais-mdp-xyz-999');
    await loginPage.submitLoginForm();
    await loginPage.verifyLoginError();
  });

  test('02.4 — Connexion échouée avec email inexistant', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.fillLoginForm('email-inexistant-xyz@nowhere.com', 'Password123!');
    await loginPage.submitLoginForm();
    await loginPage.verifyLoginError();
  });

  test('02.5 — Connexion admin réussie', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    console.log('✅ Connexion admin réussie');
  });

});

test.describe('E2E 02 — Navigation dashboard après connexion', () => {
  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    const loginPage = new LoginPage(sharedPage);
    await loginPage.login(CLIENT_EMAIL, CLIENT_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await sharedPage.waitForTimeout(1500);
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test('02.6 — Redirection vers le dashboard après connexion', async () => {
    test.setTimeout(60_000);
    const dashboardPage = new DashboardPage(sharedPage);
    await dashboardPage.goto();
    await dashboardPage.verifyDashboardLoaded();
  });

  test('02.7 — Le contenu principal du dashboard est visible', async () => {
    test.setTimeout(60_000);
    const mainContent = sharedPage.locator('main, [class*="dashboard"], [class*="content"], [role="main"]');
    await expect(mainContent.first()).toBeVisible({ timeout: 20_000 });
  });

  test('02.8 — La navigation sidebar est visible', async () => {
    test.setTimeout(60_000);
    const dashboardPage = new DashboardPage(sharedPage);
    await dashboardPage.goto();
    await dashboardPage.verifySidebarNavigation();
  });

  test('02.9 — Navigation vers le profil depuis le dashboard', async () => {
    test.setTimeout(60_000);
    const dashboardPage = new DashboardPage(sharedPage);
    await dashboardPage.navigateToProfile();
    await expect(sharedPage).toHaveURL(/\/fr\/profile|\/profil/, { timeout: 20_000 });
  });

  test('02.10 — Navigation vers les packs depuis le dashboard', async () => {
    test.setTimeout(60_000);
    const dashboardPage = new DashboardPage(sharedPage);
    await dashboardPage.navigateToPacks();
    const url = sharedPage.url();
    const isOnPacks = /plan|pack|abonnement|pricing/i.test(url);
    const content = sharedPage.getByText(/pack|plan|abonnement|offre|tarif/i);
    const hasContent = await content.first().isVisible({ timeout: 10_000 }).catch(() => false);
    expect(isOnPacks || hasContent).toBeTruthy();
  });

});
