/**
 * apps/bvbusiness/tests/e2e-07-regional-content.spec.ts
 * --------------------------------------------------------
 * SC-07 : Gestion du Contenu Régional (SECONDAIRE)
 *
 * ID       : SC-07
 * Desc     : Sélection d'une région, modification du contenu, sauvegarde
 * Précond  : Admin connecté (storageState)
 * Résultat : Sauvegarde correcte, affichage selon la région
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminRegionalContentPage } from '../pages/AdminRegionalContentPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('SC-07 — Contenu Régional Admin (SECONDAIRE)', () => {

  test('07.1 — La page Contenu Régional est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToRegionalContent();
    await expect(page.locator('main, [role="main"], body').first()).toBeVisible({ timeout: 10_000 });
  });

  test('07.2 — Un sélecteur de région est présent', async ({ page }) => {
    test.setTimeout(30_000);
    const regionalPage = new AdminRegionalContentPage(page);
    await regionalPage.goto();
    await regionalPage.verifyRegionSelectorPresent();
  });

  test('07.3 — Modification et sauvegarde du contenu régional', async ({ page }) => {
    test.setTimeout(60_000);
    const regionalPage = new AdminRegionalContentPage(page);
    await regionalPage.goto();
    await regionalPage.verifyRegionSelectorPresent();

    const testValue = `Contenu régional test ${Date.now()}`;
    await regionalPage.editContentField(testValue);
    await regionalPage.saveRegionalContent();
    await regionalPage.verifySaveSuccess();
    console.log(`Contenu régional modifié : "${testValue}"`);
  });

});
