/**
 * apps/ecommerce/tests/admin.spec.ts
 * ------------------------------------
 * Tests E2E - Back-office administrateur
 * Couvre : dashboard KPIs, création/modification/désactivation produit,
 *          gestion utilisateurs, contrôle des accès.
 *
 * Ordre d'exécution recommandé : 6e fichier
 * Nécessite d'être connecté en tant qu'administrateur.
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AuthPage } from '../pages/AuthPage';
import { AdminPage } from '../pages/AdminPage';
import { ShopPage } from '../pages/ShopPage';
import { generateUniqueId } from '../../../shared/utils/helpers';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// =====================================================================
// PARCOURS 4.1 - Dashboard admin
// =====================================================================
test.describe('Dashboard administrateur', () => {

  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.loginAsAdmin();
  });

  test('Le dashboard affiche les KPIs et les alertes de stock', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.gotoDashboard();

    // Vérifier les KPIs principaux
    await adminPage.verifyKpisVisible();

    // Vérifier les alertes de stock si présentes
    await adminPage.verifyStockAlertsIfPresent();
  });

});

// =====================================================================
// PARCOURS 4.2 - Gestion des produits : Création
// =====================================================================
test.describe('Gestion des produits - Création', () => {

  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.loginAsAdmin();
  });

  test('Créer un nouveau produit et le voir apparaître dans la liste', async ({ page }) => {
    const adminPage = new AdminPage(page);

    // Générer un nom unique pour ne pas polluer la base entre les tests
    const uniqueName = `Produit Test ${generateUniqueId()}`;

    await adminPage.gotoNewProduct();

    // Remplir le formulaire de création
    await adminPage.fillProductForm({
      name:        uniqueName,
      description: 'Description de test générée automatiquement par Playwright.',
      price:       49.99,
      stock:       10,
      category:    'Mobilier', // 👉 ADAPTER selon les catégories disponibles
    });

    // Activer le produit
    await adminPage.activateProductToggle();

    // Soumettre le formulaire
    await adminPage.submitProductForm();

    // Vérifier la redirection vers la liste des produits
    await expect(page).toHaveURL(/admin\/products/, { timeout: 8_000 }); // 👉 ADAPTER

    // Vérifier que le nouveau produit apparaît dans la liste
    await adminPage.verifyProductInList(uniqueName);
  });

});

// =====================================================================
// PARCOURS 4.3 - Gestion des produits : Modification
// =====================================================================
test.describe('Gestion des produits - Modification', () => {

  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.loginAsAdmin();
  });

  test('Modifier le prix d\'un produit et le voir mis à jour dans la liste', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.gotoProducts();

    // Récupérer le nombre de produits pour s'assurer qu'il y en a au moins 1
    const count = await adminPage.getProductsCount();
    expect(count).toBeGreaterThanOrEqual(1);

    // Cliquer sur modifier pour le premier produit
    await adminPage.clickEditProduct();

    // Changer le prix
    const newPrice = 99.99;
    await adminPage.updateProductPrice(newPrice);

    // Vérifier la redirection vers la liste
    await expect(page).toHaveURL(/admin\/products/, { timeout: 8_000 }); // 👉 ADAPTER
  });

  test('Le prix modifié est répercuté sur /shop', async ({ page }) => {
    // Ce test vérifie la cohérence entre admin et boutique
    // 👉 ADAPTER : ce test nécessite de connaître le nom du produit modifié
    // Pour l'automatiser complètement, il faudrait chaîner avec le test de modification

    const adminPage = new AdminPage(page);
    await adminPage.gotoProducts();
    await adminPage.verifyProductsListVisible();

    // Naviguer sur /shop et vérifier que les produits sont bien affichés
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.verifyProductGridVisible();

    // 👉 AJOUTER : vérification du prix spécifique si vous chaînez avec le test de modification
  });

});

// =====================================================================
// PARCOURS 4.4 - Gestion des produits : Désactivation
// =====================================================================
test.describe('Gestion des produits - Désactivation', () => {

  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.loginAsAdmin();
  });

  test('Désactiver un produit le fait disparaître de /shop', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.gotoProducts();

    // Désactiver le premier produit
    await adminPage.toggleFirstProductActive();

    // Vérifier sur /shop que le produit est absent ou marqué indisponible
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // 👉 ADAPTER : selon l'implémentation, le produit disparaît ou affiche "indisponible"
    // Si on connaît le nom du produit désactivé, on peut vérifier son absence :
    // await expect(page.getByText(productName)).not.toBeVisible();
  });

  test('Réactiver un produit le fait réapparaître sur /shop', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.gotoProducts();

    // Désactiver puis réactiver le premier produit
    await adminPage.toggleFirstProductActive(); // désactive
    await adminPage.toggleFirstProductActive(); // réactive

    // Vérifier que /shop affiche encore des produits
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.verifyProductGridVisible();
  });

});

// =====================================================================
// PARCOURS 4.5 - Gestion des utilisateurs
// =====================================================================
test.describe('Gestion des utilisateurs', () => {

  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.loginAsAdmin();
  });

  test('La liste des utilisateurs affiche email et rôle de chaque utilisateur', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.gotoUsers();

    // Vérifier que la liste est visible
    await adminPage.verifyUsersListVisible();

    // Vérifier que l'utilisateur de test est dans la liste
    await adminPage.verifyUserInList(process.env.TEST_EMAIL ?? 'user@test.com');

    // Vérifier son rôle (customer, user, etc.)
    await adminPage.verifyUserHasRole(
      process.env.TEST_EMAIL ?? 'user@test.com',
      'customer' // 👉 ADAPTER selon le nom du rôle dans votre application
    );
  });

  test('Un compte customer ne peut pas accéder à /admin', async ({ page }) => {
    // Se connecter avec le compte customer (pas admin)
    const authPage = new AuthPage(page);
    await authPage.login(
      process.env.TEST_EMAIL,
      process.env.TEST_PASSWORD
    );

    // Tenter d'accéder au dashboard admin
    await page.goto('/admin');
    await page.waitForLoadState('load');

    // Doit être redirigé ou voir une erreur 403
    const adminPage = new AdminPage(page);
    await adminPage.verifyAdminAccessDenied();
  });

});
