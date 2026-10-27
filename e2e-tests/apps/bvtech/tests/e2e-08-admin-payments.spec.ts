/**
 * apps/bvtech/tests/e2e-08-admin-payments.spec.ts
 * ---------------------------------------------------
 * E2E 08 : Consultation des paiements (CRITIQUE)
 *
 * Étapes :
 *   1. Accéder à "Paiements"
 *   2. Consulter un paiement
 *   3. Voir les détails
 *
 * Résultat attendu :
 *   ● Informations correctes (montant, statut, ID)
 *
 * Priorité : Critique
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminPaymentsPage } from '../pages/AdminPaymentsPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

test.describe('E2E 08 - Consultation des paiements (CRITIQUE)', () => {

  test('08.1 - Accéder à la liste des paiements', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const paymentsPage = new AdminPaymentsPage(page);

    // Se connecter en admin
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // 1. Accéder à "Paiements"
    await adminDashboard.navigateToPayments();

    // Vérifier que la liste des paiements est visible
    await paymentsPage.verifyPaymentsListVisible();
  });

  test('08.2 - Consulter les détails d\'un paiement', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const paymentsPage = new AdminPaymentsPage(page);

    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    await adminDashboard.navigateToPayments();
    await paymentsPage.verifyPaymentsListVisible();

    // Ignorer si aucun paiement dans la base
    const count = await paymentsPage.getPaymentsCount();
    test.skip(count === 0, 'Aucun paiement dans la base - test ignoré (table vide)');

    await paymentsPage.clickViewFirstPayment();
    await paymentsPage.verifyPaymentDetailsVisible();
  });

  test('08.3 - Vérifier que le montant est affiché', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const paymentsPage = new AdminPaymentsPage(page);

    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    await adminDashboard.navigateToPayments();
    await paymentsPage.verifyPaymentsListVisible();

    const count = await paymentsPage.getPaymentsCount();
    test.skip(count === 0, 'Aucun paiement dans la base - test ignoré (table vide)');

    await paymentsPage.clickViewFirstPayment();
    await paymentsPage.verifyPaymentHasAmount();
  });

  test('08.4 - Vérifier que le statut est affiché', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const paymentsPage = new AdminPaymentsPage(page);

    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    await adminDashboard.navigateToPayments();
    await paymentsPage.verifyPaymentsListVisible();

    const count = await paymentsPage.getPaymentsCount();
    test.skip(count === 0, 'Aucun paiement dans la base - test ignoré (table vide)');

    await paymentsPage.clickViewFirstPayment();
    await paymentsPage.verifyPaymentHasStatus();
  });

  test('08.5 - Vérifier que l\'ID/référence est affiché', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const paymentsPage = new AdminPaymentsPage(page);

    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    await adminDashboard.navigateToPayments();
    await paymentsPage.verifyPaymentsListVisible();

    const count = await paymentsPage.getPaymentsCount();
    test.skip(count === 0, 'Aucun paiement dans la base - test ignoré (table vide)');

    await paymentsPage.clickViewFirstPayment();
    await paymentsPage.verifyPaymentHasId();
  });

});
