/**
 * SC-09 : Analytique (IMPORTANT)
 *
 * Préconditions : admin connecté (storageState admin)
 * Couvre : KPIs affichés, graphiques visibles, filtres fonctionnels
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('SC-09 — Analytique (IMPORTANT)', () => {

  test('09.1 — La page analytics est accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const analytics = new AnalyticsPage(page);
    await analytics.goto();
    await analytics.verifyAnalyticsLoaded();
  });

  test('09.2 — Les KPIs / graphiques sont affichés', async ({ page }) => {
    test.setTimeout(60_000);
    const analytics = new AnalyticsPage(page);
    await analytics.goto();
    await analytics.verifyChartsOrKpisVisible();
  });

  test('09.3 — Les filtres sont présents', async ({ page }) => {
    test.setTimeout(60_000);
    const analytics = new AnalyticsPage(page);
    await analytics.goto();
    await analytics.verifyFiltersPresent();
  });

  test('09.4 — Aucune donnée corrompue (NaN, undefined)', async ({ page }) => {
    test.setTimeout(60_000);
    const analytics = new AnalyticsPage(page);
    await analytics.goto();
    await analytics.verifyNoCorruptedData();
  });

  test('09.5 — Accès via le menu dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToAnalytics();
    await expect(page).not.toHaveURL(/\/login|\/signin/, { timeout: 20_000 });
    await expect(page.locator('body')).toBeVisible();
  });

});
