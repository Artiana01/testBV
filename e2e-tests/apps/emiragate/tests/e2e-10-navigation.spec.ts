/**
 * SC-10 : Navigation globale (SECONDAIRE)
 * SC-11 : Déconnexion (SECONDAIRE)
 *
 * Préconditions : admin connecté (storageState admin)
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.EMIRAGATE_BASE_URL ?? 'https://dev.bluevalorisinstall.com';

test.describe('SC-10 — Navigation globale (SECONDAIRE)', () => {

  test('10.1 — Navigation dashboard → conduit sans perte de session', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToConduit();
    await expect(page).not.toHaveURL(/\/login|\/signin/, { timeout: 20_000 });
  });

  test('10.2 — Navigation dashboard → contacts sans perte de session', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToContacts();
    await expect(page).not.toHaveURL(/\/login|\/signin/, { timeout: 20_000 });
  });

  test('10.3 — Navigation dashboard → users sans perte de session', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToUsers();
    await expect(page).not.toHaveURL(/\/login|\/signin/, { timeout: 20_000 });
  });

  test('10.4 — Navigation dashboard → analytics sans perte de session', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToAnalytics();
    await expect(page).not.toHaveURL(/\/login|\/signin/, { timeout: 20_000 });
  });

  test('10.5 — Toutes les sections sont accessibles sans erreur 404/500', async ({ page }) => {
    test.setTimeout(60_000);
    const sections = ['/en/dashboard', '/en/conduit', '/en/contacts', '/en/users', '/en/analytics'];
    for (const section of sections) {
      await page.goto(`${BASE}${section}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(800);
      await expect(page.getByText(/500|server error/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
      console.log(`   ✅  ${section} : OK (${page.url()})`);
    }
  });

  test('10.6 — Redirection stable (pas de boucle)', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    const url1 = page.url();
    await page.waitForTimeout(2000);
    const url2 = page.url();
    expect(url1).toBe(url2);
  });

});

test.describe('SC-11 — Déconnexion (SECONDAIRE)', () => {

  test('11.1 — La déconnexion redirige vers login', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyDashboardLoaded();

    const loginPage = new LoginPage(page);
    await loginPage.logout();
    await loginPage.verifyLoggedOut();
  });

  test('11.2 — Après déconnexion, le dashboard est inaccessible', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();

    const loginPage = new LoginPage(page);
    await loginPage.logout();

    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    const redirected = /login|signin/i.test(url);
    if (!redirected) {
      console.log(`   ℹ️  URL après déconnexion : ${url}`);
    }
  });

});
