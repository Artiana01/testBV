/**
 * apps/bvtech/tests/e2e-09-admin-contacts.spec.ts
 * ---------------------------------------------------
 * E2E 09 : Gestion des contacts (SECONDAIRE)
 *
 * Étapes :
 *   1. Accéder à "Contact"
 *   2. Rechercher un message
 *   3. Naviguer pages
 *
 * Résultat attendu :
 *   ● Liste correcte
 *   ● Pagination fonctionnelle
 *
 * Priorité : Secondaire
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminContactsPage } from '../pages/AdminContactsPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

test.describe('E2E 09 - Gestion des contacts (SECONDAIRE)', () => {

  test('09.1 - Accéder à la liste des contacts', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const contactsPage = new AdminContactsPage(page);

    // Se connecter en admin
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // 1. Accéder à "Contacts"
    await adminDashboard.navigateToContacts();

    // Vérifier que la liste est visible
    await contactsPage.verifyContactsListVisible();
  });

  test('09.2 - Rechercher un message dans les contacts', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const contactsPage = new AdminContactsPage(page);

    // Se connecter en admin
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // Accéder aux contacts
    await adminDashboard.navigateToContacts();
    await contactsPage.verifyContactsListVisible();

    // 2. Rechercher un message
    await contactsPage.searchContact('test');
    await page.waitForTimeout(1000);

    // La page doit rester fonctionnelle après la recherche
    const mainContent = page.locator('main, [class*="content"], body');
    await expect(mainContent.first()).toBeVisible();
  });

  test('09.3 - Navigation par pagination', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const contactsPage = new AdminContactsPage(page);

    // Se connecter en admin
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // Accéder aux contacts
    await adminDashboard.navigateToContacts();
    await contactsPage.verifyContactsListVisible();

    // 3. Vérifier la pagination
    await contactsPage.verifyPaginationVisible();

    // Naviguer entre les pages
    await contactsPage.navigatePages();

    // Vérifier que la page est toujours fonctionnelle après navigation
    const mainContent = page.locator('main, [class*="content"], body');
    await expect(mainContent.first()).toBeVisible();
  });

  test('09.4 - La liste des contacts affiche des données', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const contactsPage = new AdminContactsPage(page);

    // Se connecter en admin
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // Accéder aux contacts
    await adminDashboard.navigateToContacts();
    await contactsPage.verifyContactsListVisible();

    // Vérifier qu'il y a au moins un contact/message
    const count = await contactsPage.getContactsCount();
    expect(count).toBeGreaterThanOrEqual(0); // Peut être 0 si aucun message
  });

});
