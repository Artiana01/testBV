/**
 * SC-02 : Affichage du dashboard administrateur (CRITIQUE)
 *
 * Préconditions : admin connecté (storageState admin)
 * Couvre : KPIs (prospects, leads), activités récentes, navigation
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.EMIRAGATE_BASE_URL ?? 'https://dev.bluevalorisinstall.com';

test.describe('SC-02 — Dashboard Administrateur (CRITIQUE)', () => {

  test('02.1 — Le dashboard admin est accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyDashboardLoaded();
  });

  test('02.2 — Les KPIs sont affichés (prospects, leads, etc.)', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyKpisVisible();
  });

  test('02.3 — Les activités récentes sont affichées', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyRecentActivityVisible();
  });

  test('02.4 — La navigation admin est visible', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyNavVisible();
  });

  test('02.5 — Aucune valeur corrompue sur le dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    const broken = page.getByText('undefined').or(page.getByText('NaN')).or(page.getByText('null'));
    const hasBroken = await broken.first().isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasBroken).toBeFalsy();
  });

});
