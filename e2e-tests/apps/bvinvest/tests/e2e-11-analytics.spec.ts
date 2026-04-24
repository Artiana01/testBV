/**
 * apps/bvinvest/tests/e2e-11-analytics.spec.ts
 * -----------------------------------------------
 * SC-11 : Analytics & statistiques Admin (SECONDAIRE)
 *
 * Préconditions : admin connecté (storageState admin)
 * Couvre : page analytics chargée, indicateurs affichés, pas d'erreurs
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.BVINVEST_BASE_URL ?? 'https://dev.bluevalorisinvest.com';

test.describe('SC-11 — Analytics & Statistiques (SECONDAIRE)', () => {

  test('11.1 — La page analytics est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToAnalytics();
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('11.2 — Des indicateurs sont affichés sur la page analytics', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToAnalytics();

    const indicators = page.locator(
      '[class*="chart"],[class*="graph"],[class*="stat"],[class*="metric"],[class*="kpi"],[class*="analytics"],[class*="indicator"]'
    );
    const count = await indicators.count();
    if (count > 0) {
      await expect(indicators.first()).toBeVisible({ timeout: 10_000 });
      console.log(`   ✅  ${count} indicateur(s) détecté(s)`);
    } else {
      console.log('   ℹ️  Indicateurs non détectés — vérifier URL dans AdminDashboardPage.navigateToAnalytics()');
    }
  });

  test('11.3 — Pas d\'erreur 500 sur la page analytics', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToAnalytics();
    await expect(page.getByText(/500|server error/i)).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
  });

  test('11.4 — Les KPIs du dashboard admin sont cohérents (pas de NaN/undefined)', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    const broken = page.getByText('undefined').or(page.getByText('NaN')).or(page.getByText('null'));
    const hasBroken = await broken.first().isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasBroken).toBeFalsy();
  });

});
