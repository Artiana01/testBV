/**
 * apps/bvtech/tests/e2e-02-login-navigation.spec.ts
 * -----------------------------------------------------
 * E2E 02 : Login utilisateur + Navigation (CRITIQUE)
 *
 * Compte client : TEST_EMAIL / TEST_PASSWORD dans .env (diary@gmail.com)
 *
 * Optimisation : un seul login partagé via beforeAll pour éviter
 * le rate limiting lors des tests de navigation (02.5, 02.6, 02.7).
 *
 * Priorité : Critique
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const CLIENT_EMAIL    = process.env.TEST_EMAIL    ?? 'diary@gmail.com';
const CLIENT_PASSWORD = process.env.TEST_PASSWORD ?? 'Diary12345678';

test.describe('E2E 02 — Login utilisateur + Navigation (CRITIQUE)', () => {

  // ── Tests sans connexion (vérifications de formulaire / erreurs) ──

  test('02.1 — La page login est accessible et contient le formulaire', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('02.2 — Connexion réussie avec identifiants valides', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.login(CLIENT_EMAIL, CLIENT_PASSWORD);
    await loginPage.verifyLoginSuccess();
    console.log('Connexion réussie pour:', CLIENT_EMAIL);
  });

  test('02.3 — Connexion échouée avec mauvais mot de passe', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.fillLoginForm(CLIENT_EMAIL, 'mauvais-mot-de-passe-xyz-999');
    await loginPage.submitLoginForm();
    await loginPage.verifyLoginError();
  });

  test('02.4 — Connexion échouée avec email inexistant', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.fillLoginForm('email-inexistant-xyz999@nowhere.com', 'Password123!');
    await loginPage.submitLoginForm();
    await loginPage.verifyLoginError();
  });

});

// ── Tests de navigation — session partagée pour éviter le rate limiting ──
test.describe('E2E 02 — Navigation après connexion', () => {
  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    const loginPage = new LoginPage(sharedPage);
    await loginPage.login(CLIENT_EMAIL, CLIENT_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await sharedPage.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test('02.5 — Navigation vers le profil après connexion', async () => {
    test.setTimeout(60_000);
    const dashboardPage = new DashboardPage(sharedPage);
    await dashboardPage.navigateToProfile();
    await expect(sharedPage).toHaveURL(/\/fr\/profile/, { timeout: 20_000 });
    await expect(sharedPage.getByRole('heading', { name: 'Profil utilisateur' })).toBeVisible({ timeout: 20_000 });
  });

  test('02.6 — Navigation vers le plan/abonnement après connexion', async () => {
    test.setTimeout(60_000);
    const dashboardPage = new DashboardPage(sharedPage);
    await dashboardPage.navigateToPlan();
    await expect(sharedPage).toHaveURL(/\/fr\/plan/, { timeout: 20_000 });
    const planContent = sharedPage.getByText(/plan|abonnement|pack|tarif/i)
      .or(sharedPage.locator('main h1, main h2'));
    await expect(planContent.first()).toBeVisible({ timeout: 20_000 });
  });

  test('02.7 — Le sidebar/menu de navigation est visible', async () => {
    test.setTimeout(60_000);
    await sharedPage.goto(process.env.BASE_URL + '/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await sharedPage.waitForTimeout(1000);
    const dashboardPage = new DashboardPage(sharedPage);
    await dashboardPage.verifySidebarNavigation();
  });

});
