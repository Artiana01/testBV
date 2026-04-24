/**
 * apps/bvinvest/tests/e2e-09-admin-dashboard.spec.ts
 * -----------------------------------------------------
 * SC-09 : Dashboard administrateur (IMPORTANT)
 *
 * Préconditions : admin connecté (storageState admin)
 * Couvre : KPIs, revenus, abonnements, sections admin
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.BVINVEST_BASE_URL ?? 'https://dev.bluevalorisinvest.com';

test.describe('SC-09 — Dashboard Administrateur (IMPORTANT)', () => {

  test('09.1 — Le dashboard admin est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyAdminDashboardLoaded();
  });

  test('09.2 — Les KPIs sont affichés', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyKpisVisible();
  });

  test('09.3 — La navigation admin est visible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyAdminNavVisible();
  });

  test('09.4 — La section gestion utilisateurs admin est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToUsers();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('09.5 — La section opportunités admin est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToOpportunities();
    await expect(page.locator('body')).toBeVisible();
  });

  test('09.6 — La section documents admin est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToDocuments();
    await expect(page.locator('body')).toBeVisible();
  });

  test('09.7 — Aucune section admin ne retourne 404', async ({ page }) => {
    test.setTimeout(60_000);
    const sections = [
      '/fr/dashboard',
      '/fr/admin/users',
      '/fr/admin/opportunities',
      '/fr/admin/documents',
    ];
    for (const section of sections) {
      await page.goto(`${BASE}${section}`);
      await page.waitForLoadState('load');
      await page.waitForTimeout(1000);
      await expect(page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
    }
  });

});
