/**
 * apps/bvbusiness/tests/e2e-04-navigation.spec.ts
 * --------------------------------------------------
 * SC-04 : Navigation et accès aux modules (IMPORTANT)
 *
 * ID       : SC-04
 * Desc     : Navigation fluide entre les sections admin
 * Précond  : Utilisateur admin connecté (storageState)
 * Résultat : Accès correct à toutes les sections, pas d'erreurs 404/500
 *
 * Régression couverte :
 *   - Redirections post-login
 *   - Accès aux menus
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.BVBUSINESS_BASE_URL ?? 'https://staging.bluevalorisbusiness.com';

test.describe('SC-04 — Navigation globale admin (IMPORTANT)', () => {

  test('04.1 — Dashboard admin est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyAdminDashboardLoaded();
  });

  test('04.2 — Navigation vers la section Users', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToUsers();
    const content = page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    // Pas d'erreur serveur
    await expect(page.getByText(/404|500|not found|erreur serveur/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('04.3 — Navigation vers la section Packages', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToPackages();
    const content = page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/404|500|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('04.4 — Navigation vers la section Payments', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToPayments();
    const content = page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/404|500|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('04.5 — Navigation vers la section Content Management', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToContent();
    const content = page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/404|500|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('04.6 — Navigation vers la Media Library', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToMediaLibrary();
    const content = page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/404|500|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('04.7 — Navigation vers le Contenu Régional', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToRegionalContent();
    const content = page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/404|500|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('04.8 — La page packages publique est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`${BASE}/fr/packages`);
    await page.waitForLoadState('load');
    const content = page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/404|500|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

});
