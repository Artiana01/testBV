/**
 * apps/bvbusiness/tests/e2e-05-admin-content.spec.ts
 * -----------------------------------------------------
 * SC-05 : Gestion de Contenu Admin (IMPORTANT)
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminContentPage } from '../pages/AdminContentPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pageLoaded = (page: import('@playwright/test').Page) =>
  page.locator('main, [role="main"], body').first();

test.describe('SC-05 — Content Management Admin (IMPORTANT)', () => {

  test('05.1 — La page Content Management est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToContent();
    await expect(pageLoaded(page)).toBeVisible({ timeout: 10_000 });
  });

  test('05.2 — La section Hero est accessible dans le CMS', async ({ page }) => {
    test.setTimeout(30_000);
    const contentPage = new AdminContentPage(page);
    await contentPage.goto();
    await contentPage.navigateToHeroSection();
    await expect(pageLoaded(page)).toBeVisible({ timeout: 10_000 });
  });

  test('05.3 — La section Services est accessible dans le CMS', async ({ page }) => {
    test.setTimeout(30_000);
    const contentPage = new AdminContentPage(page);
    await contentPage.goto();
    await contentPage.navigateToServicesSection();
    await expect(pageLoaded(page)).toBeVisible({ timeout: 10_000 });
  });

  test('05.4 — Modification et sauvegarde d\'un champ de contenu', async ({ page }) => {
    test.setTimeout(60_000);
    const contentPage = new AdminContentPage(page);
    await contentPage.goto();
    await contentPage.navigateToHeroSection();
    const testValue = `Test BV Business ${Date.now()}`;
    await contentPage.editFirstTextField(testValue);
    await contentPage.saveContent();
    await contentPage.verifySaveSuccess();
    console.log(`Contenu modifié avec : "${testValue}"`);
  });

  test('05.5 — Les sections sont isolées (modification n\'affecte pas les autres)', async ({ page }) => {
    test.setTimeout(30_000);
    const contentPage = new AdminContentPage(page);
    await contentPage.goto();
    await contentPage.verifySectionsIsolated();
  });

  test('05.6 — Vérification du support multilingue dans le CMS', async ({ page }) => {
    test.setTimeout(30_000);
    const contentPage = new AdminContentPage(page);
    await contentPage.goto();
    await contentPage.verifyMultilingualSupport();
  });

});
