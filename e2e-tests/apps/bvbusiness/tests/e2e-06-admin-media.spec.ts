/**
 * apps/bvbusiness/tests/e2e-06-admin-media.spec.ts
 * ---------------------------------------------------
 * SC-06 : Media Library Admin (IMPORTANT)
 *
 * ID       : SC-06
 * Desc     : Upload de fichier, vérification que le fichier est exploitable
 * Précond  : Admin connecté (storageState)
 * Résultat : Upload fonctionnel, fichier visible dans la grille
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminMediaLibraryPage } from '../pages/AdminMediaLibraryPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('SC-06 — Media Library Admin (IMPORTANT)', () => {

  test('06.1 — La Media Library est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToMediaLibrary();
    const content = page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test('06.2 — Le bouton d\'upload est visible', async ({ page }) => {
    test.setTimeout(30_000);
    const mediaPage = new AdminMediaLibraryPage(page);
    await mediaPage.goto();
    await mediaPage.verifyUploadButtonVisible();
  });

  test('06.3 — Upload d\'une image fonctionne', async ({ page }) => {
    test.setTimeout(60_000);
    const mediaPage = new AdminMediaLibraryPage(page);
    await mediaPage.goto();
    await mediaPage.uploadFile();
    await mediaPage.verifyUploadSuccess();
  });

  test('06.4 — La grille media contient des fichiers après upload', async ({ page }) => {
    test.setTimeout(30_000);
    const mediaPage = new AdminMediaLibraryPage(page);
    await mediaPage.goto();
    await mediaPage.verifyMediaGridNotEmpty();
  });

});
