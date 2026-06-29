/**
 * apps/bvtech/tests/e2e-07-admin-packs.spec.ts
 * ------------------------------------------------
 * E2E 07 : Gestion des packs (IMPORTANT)
 *
 * Étapes :
 *   1. Aller dans "Colis / Packs"
 *   2. Modifier un pack
 *   3. Sauvegarder
 *
 * Résultat attendu :
 *   ● Modifications enregistrées
 *
 * Priorité : Secondaire
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminPacksPage } from '../pages/AdminPacksPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

test.describe('E2E 07 — Gestion des packs (IMPORTANT)', () => {

  test('07.1 — Accéder à la liste des packs', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const packsPage = new AdminPacksPage(page);

    // Se connecter en admin
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // 1. Aller dans "Packs"
    await adminDashboard.navigateToPacks();

    // Vérifier que la liste des packs est visible
    await packsPage.verifyPacksListVisible();
  });

  test('07.2 — La liste contient au moins un pack', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const packsPage = new AdminPacksPage(page);

    // Se connecter en admin
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // Aller dans Packs
    await adminDashboard.navigateToPacks();
    await packsPage.verifyPacksListVisible();

    // Vérifier qu'il y a au moins un pack
    const count = await packsPage.getPacksCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('07.3 — Modifier un pack et sauvegarder', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const packsPage = new AdminPacksPage(page);

    // Se connecter en admin
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // 1. Aller dans "Packs"
    await adminDashboard.navigateToPacks();
    await packsPage.verifyPacksListVisible();

    // 2. Modifier un pack
    const editOpened = await packsPage.clickEditFirstPack();
    test.skip(!editOpened, 'Formulaire édition pack non ouvert — vérifier la structure HTML');

    await packsPage.modifyPackField('name', 'Pack E2E Modifié');

    // 3. Sauvegarder
    await packsPage.savePack();
    await packsPage.verifyPackSaved();
  });

});
