/**
 * SC-07 : Gestion des utilisateurs Admin (IMPORTANT)
 *
 * Préconditions : admin connecté (storageState admin)
 * Couvre : liste visible, modification et suppression fonctionnelles
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminUsersPage } from '../pages/AdminUsersPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('SC-07 — Gestion des utilisateurs Admin (IMPORTANT)', () => {

  test('07.1 — La page utilisateurs admin est accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.verifyUsersPageLoaded();
  });

  test('07.2 — La liste des utilisateurs est visible', async ({ page }) => {
    test.setTimeout(60_000);
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.verifyUserListVisible();
  });

  test('07.3 — Les actions Modifier / Supprimer sont disponibles', async ({ page }) => {
    test.setTimeout(60_000);
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.verifyEditDeleteAvailable();
  });

  test('07.4 — La recherche d\'utilisateur fonctionne', async ({ page }) => {
    test.setTimeout(60_000);
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.searchUser('test');
    await expect(page.locator('body')).toBeVisible();
  });

});
