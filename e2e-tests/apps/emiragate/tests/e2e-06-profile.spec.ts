/**
 * SC-06 : Accès au profil utilisateur — Admin & Client (IMPORTANT)
 *
 * Préconditions : admin connecté (storageState admin)
 * Couvre : informations affichées, modification, actions (déconnexion)
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ProfilePage } from '../pages/ProfilePage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('SC-06 — Profil utilisateur (IMPORTANT)', () => {

  test('06.1 — La page profil est accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const profile = new ProfilePage(page);
    await profile.goto();
    await profile.verifyProfileLoaded();
  });

  test('06.2 — Les informations du profil sont affichées', async ({ page }) => {
    test.setTimeout(60_000);
    const profile = new ProfilePage(page);
    await profile.goto();
    await profile.verifyProfileInfoDisplayed();
  });

  test('06.3 — Les actions (modifier) sont disponibles', async ({ page }) => {
    test.setTimeout(60_000);
    const profile = new ProfilePage(page);
    await profile.goto();
    await profile.verifyActionsAvailable();
  });

  test('06.4 — Accès au profil depuis le menu dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToProfile();
    await expect(page).not.toHaveURL(/\/login|\/signin/, { timeout: 20_000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('06.5 — La modification du profil fonctionne', async ({ page }) => {
    test.setTimeout(60_000);
    const profile = new ProfilePage(page);
    await profile.goto();
    await profile.updateName('Test Emiragate Edit');
    await profile.saveProfile();
    await profile.verifySaveSuccess();
  });

});
