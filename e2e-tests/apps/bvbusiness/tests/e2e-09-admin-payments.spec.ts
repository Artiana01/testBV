/**
 * apps/bvbusiness/tests/e2e-09-admin-payments.spec.ts
 * ------------------------------------------------------
 * Paiement & Facturation Admin BV Business
 *
 * Précond  : Admin connecté (storageState)
 * Résultat : Historique transactions accessible, statuts visibles
 *
 * Régression couverte :
 *   - Intégrité du parcours de paiement
 *   - Statut des transactions
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminPaymentsPage } from '../pages/AdminPaymentsPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('Admin — Paiements & Facturation', () => {

  test('09.1 — La page admin Payments est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const paymentsPage = new AdminPaymentsPage(page);
    await paymentsPage.goto();
    await paymentsPage.verifyPaymentsPageLoaded();
  });

  test('09.2 — Le tableau des transactions est affiché', async ({ page }) => {
    test.setTimeout(30_000);
    const paymentsPage = new AdminPaymentsPage(page);
    await paymentsPage.goto();
    await paymentsPage.verifyPaymentsTableVisible();
  });

  test('09.3 — Les badges de statut des transactions sont visibles', async ({ page }) => {
    test.setTimeout(30_000);
    const paymentsPage = new AdminPaymentsPage(page);
    await paymentsPage.goto();
    await paymentsPage.verifyStatusBadgesVisible();
  });

  test('09.4 — L\'intégrité des données de transaction est correcte', async ({ page }) => {
    test.setTimeout(30_000);
    const paymentsPage = new AdminPaymentsPage(page);
    await paymentsPage.goto();
    await paymentsPage.verifyTransactionIntegrity();
  });

  test('09.5 — Pas de valeurs "undefined" ou "null" dans la liste', async ({ page }) => {
    test.setTimeout(30_000);
    const paymentsPage = new AdminPaymentsPage(page);
    await paymentsPage.goto();
    await paymentsPage.verifyPaymentsTableVisible();
    const undefinedText = page.getByText('undefined').or(page.getByText('null'));
    const hasUndefined = await undefinedText.first().isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasUndefined).toBeFalsy();
  });

});
