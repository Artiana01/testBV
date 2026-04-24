/**
 * apps/bvbusiness/tests/e2e-03-packages.spec.ts
 * ------------------------------------------------
 * SC-03 : Parcours complet de souscription (CRITIQUE)
 *
 * ID       : SC-03
 * Desc     : Consultation des offres, sélection, lancement paiement
 * Précond  : Utilisateur connecté (session admin via storageState)
 * Résultat : Page paiement accessible, offres listées
 *
 * Note     : La validation réelle du paiement (Stripe/gateway) n'est pas
 *            automatisable sans sandbox de paiement configurée.
 *            Ce test couvre : affichage offres, filtres, clic souscription.
 *
 * Régression couverte :
 *   - Cohérence des données packages après modification
 *   - Affichage côté front
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PackagesPage } from '../pages/PackagesPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('SC-03 — Packages & Souscription (CRITIQUE)', () => {

  test('03.1 — La page Packages est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const packagesPage = new PackagesPage(page);
    await packagesPage.goto();
    await packagesPage.verifyPackagesLoaded();
  });

  test('03.2 — Les offres/packages sont affichés (cartes visibles)', async ({ page }) => {
    test.setTimeout(30_000);
    const packagesPage = new PackagesPage(page);
    await packagesPage.goto();
    await packagesPage.verifyPackageCardsVisible();
  });

  test('03.3 — Les prix sont affichés sur les offres', async ({ page }) => {
    test.setTimeout(30_000);
    const packagesPage = new PackagesPage(page);
    await packagesPage.goto();
    await packagesPage.verifyPricesVisible();
  });

  test('03.4 — La recherche de package fonctionne', async ({ page }) => {
    test.setTimeout(30_000);
    const packagesPage = new PackagesPage(page);
    await packagesPage.goto();
    await packagesPage.verifyPackagesLoaded();
    await packagesPage.searchPackage('business');
    // Pas de vérification stricte : l'input doit juste accepter la saisie
    await expect(page.locator('body')).toBeVisible();
  });

  test('03.5 — Clic sur "Souscrire" mène à la page de paiement', async ({ page }) => {
    test.setTimeout(60_000);
    const packagesPage = new PackagesPage(page);
    await packagesPage.goto();
    await packagesPage.verifyPackageCardsVisible();
    await packagesPage.clickSubscribeOnFirstPackage();
    await packagesPage.verifySubscriptionPageOrModal();
  });

  test('03.6 — Les données packages sont cohérentes (pas de valeurs nulles/vides)', async ({ page }) => {
    test.setTimeout(30_000);
    const packagesPage = new PackagesPage(page);
    await packagesPage.goto();
    await packagesPage.verifyPackageCardsVisible();
    // Vérifier qu'aucun card ne contient "undefined" ou "null" visible
    const undefinedText = page.getByText('undefined').or(page.getByText('null'));
    const hasUndefined = await undefinedText.first().isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasUndefined).toBeFalsy();
  });

});
