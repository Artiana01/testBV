/**
 * apps/bvinvest/tests/e2e-06-profile.spec.ts
 * ---------------------------------------------
 * SC-06 : Modification du profil utilisateur (IMPORTANT)
 *
 * Préconditions : utilisateur connecté (storageState client)
 * Couvre : affichage formulaire, modification, sauvegarde, confirmation
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ProfilePage } from '../pages/ProfilePage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('SC-06 — Modification du profil (IMPORTANT)', () => {

  test('06.1 — La page profil est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.verifyProfilePageLoaded();
  });

  test('06.2 — Le formulaire de profil contient des champs', async ({ page }) => {
    test.setTimeout(30_000);
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.verifyFormFieldsPresent();
  });

  test('06.3 — La modification d\'un champ est possible', async ({ page }) => {
    test.setTimeout(30_000);
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.updateProfileField('Test BVInvest Profil');
    await expect(page.locator('body')).toBeVisible();
  });

  test('06.4 — La sauvegarde du profil fonctionne', async ({ page }) => {
    test.setTimeout(30_000);
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.updateProfileField('Test BVInvest Save');
    await profilePage.saveProfile();
    await profilePage.verifySaveSuccess();
  });

});
