/**
 * apps/bvtech/tests/e2e-05-admin-login.spec.ts
 * ------------------------------------------------
 * E2E 05 : Login Admin + Accès Dashboard (CRITIQUE)
 *
 * Acteur : Admin
 * Étapes :
 *   1. Accéder au login
 *   2. Se connecter en admin
 *   3. Accéder dashboard admin
 *
 * Résultat attendu :
 *   ● Accès aux sections admin
 *   ● KPIs visibles
 *
 * Priorité : Critique
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// ── 05.1 : vérifie uniquement le formulaire login admin (1 login) ──
test.describe('E2E 05 — Login Admin + Accès Dashboard (CRITIQUE)', () => {

  test('05.1 — Connexion admin réussie avec identifiants valides', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);

    await loginPage.navigateToLogin();
    await loginPage.fillLoginForm(
      process.env.ADMIN_EMAIL ?? 'webmaster@bluevaloris.com',
      process.env.ADMIN_PASSWORD ?? '123456789Ca!'
    );
    await loginPage.submitLoginForm();
    await loginPage.verifyLoginSuccess();
  });

});

// ── 05.2-05.4 : session partagée via admin.json (AUCUN login supplémentaire) ──
// globalSetup + 05.1 = déjà 2 logins admin → rate limit sur un 3e login.
// On charge directement le storageState admin.json sauvegardé par le globalSetup.
test.describe('E2E 05 — Dashboard Admin (session partagée)', () => {
  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({
      storageState: path.resolve(__dirname, '../auth/admin.json'),
    });
    sharedPage = await sharedContext.newPage();
    const BASE = process.env.BASE_URL ?? 'https://dev.bluevaloristech.com';
    await sharedPage.goto(`${BASE}/fr/admin`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await sharedPage.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test('05.2 — Accès au dashboard admin après connexion', async () => {
    test.setTimeout(60_000);
    const adminDashboard = new AdminDashboardPage(sharedPage);
    await adminDashboard.goto();
    await adminDashboard.verifyAdminDashboardLoaded();
  });

  test('05.3 — Les sections admin sont accessibles (sidebar)', async () => {
    test.setTimeout(60_000);
    const adminDashboard = new AdminDashboardPage(sharedPage);
    await adminDashboard.goto();
    await adminDashboard.verifyAdminSections();
  });

  test('05.4 — Les KPIs admin sont visibles', async () => {
    test.setTimeout(60_000);
    const adminDashboard = new AdminDashboardPage(sharedPage);
    await adminDashboard.goto();
    await adminDashboard.verifyKpisVisible();
  });

});
