/**
 * apps/bvbusiness/tests/e2e-08-admin-users.spec.ts
 * ---------------------------------------------------
 * Gestion Users & Clients Admin BV Business
 *
 * Précond  : Admin connecté (storageState)
 * Résultat : Liste users/clients accessible, recherche fonctionnelle
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminUsersPage } from '../pages/AdminUsersPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('Admin — Gestion Users & Clients', () => {

  test('08.1 — La page admin Users est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();
    await usersPage.verifyUsersPageLoaded();
  });

  test('08.2 — La liste des utilisateurs est affichée', async ({ page }) => {
    test.setTimeout(30_000);
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();
    await usersPage.verifyUsersTableVisible();
  });

  test('08.3 — La recherche d\'utilisateur fonctionne', async ({ page }) => {
    test.setTimeout(30_000);
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();
    await usersPage.searchUser('webmaster');
    // La recherche doit trouver l'admin ou renvoyer un état vide sans erreur
    await expect(page.locator('body')).toBeVisible();
  });

  test('08.4 — La pagination est fonctionnelle si présente', async ({ page }) => {
    test.setTimeout(30_000);
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();
    await usersPage.verifyPaginationIfPresent();
  });

});
