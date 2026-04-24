/**
 * apps/bvinvest/tests/e2e-08-admin-access.spec.ts
 * --------------------------------------------------
 * SC-08 : Gestion des demandes d'accès Admin (IMPORTANT)
 *
 * Préconditions : admin connecté (storageState admin)
 * Couvre : visualisation, validation, rejet des demandes
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminAccessRequestsPage } from '../pages/AdminAccessRequestsPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('SC-08 — Gestion des demandes d\'accès Admin (IMPORTANT)', () => {

  test('08.1 — La page des demandes d\'accès est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const requestsPage = new AdminAccessRequestsPage(page);
    await requestsPage.goto();
    await requestsPage.verifyPageLoaded();
  });

  test('08.2 — La liste des demandes est affichée', async ({ page }) => {
    test.setTimeout(30_000);
    const requestsPage = new AdminAccessRequestsPage(page);
    await requestsPage.goto();
    await requestsPage.verifyRequestListPresent();
  });

  test('08.3 — Les boutons Valider / Rejeter sont présents', async ({ page }) => {
    test.setTimeout(30_000);
    const requestsPage = new AdminAccessRequestsPage(page);
    await requestsPage.goto();
    await requestsPage.verifyApproveRejectButtonsPresent();
  });

  test('08.4 — La page gestion utilisateurs admin est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();
    await usersPage.verifyUsersPageLoaded();
  });

  test('08.5 — La liste des utilisateurs est affichée', async ({ page }) => {
    test.setTimeout(30_000);
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();
    await usersPage.verifyUserListPresent();
  });

});
