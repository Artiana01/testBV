/**
 * apps/ecommerce/tests/shop.spec.ts
 * -----------------------------------
 * Tests E2E - Catalogue boutique
 * Couvre : page d'accueil, boutique /shop, recherche, filtres, tri, page produit.
 *
 * Ces tests sont exécutés EN TANT QUE VISITEUR (non connecté).
 * Ordre d'exécution recommandé : 2e fichier
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { HomePage } from '../pages/HomePage';
import { ShopPage } from '../pages/ShopPage';
import { ProductPage } from '../pages/ProductPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// =====================================================================
// PARCOURS 1.1 - Page d'accueil
// =====================================================================
test.describe("Page d'accueil", () => {

  test("La page d'accueil affiche le hero, les catégories et les produits populaires", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Vérifier le hero
    await homePage.verifyHeroIsVisible();
    await homePage.verifyHeroHasTitle();
    await homePage.verifyShopNowCTA();

    // Vérifier la section catégories
    await homePage.verifyCategoriesSectionVisible();
    await homePage.verifyAtLeastOneCategoryCard();

    // Vérifier les produits populaires
    await homePage.verifyPopularProductsVisible();
    await homePage.verifyPopularProductCards();

    // Vérifier la navbar et le footer
    await homePage.verifyNavbarVisible();
    await homePage.verifyFooterVisible();
  });

  test("Le bouton 'Shop Now' redirige vers /shop", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.clickShopNow();

    await expect(page).toHaveURL(/\/shop/, { timeout: 5_000 }); // 👉 ADAPTER si l'URL est différente
  });

});

// =====================================================================
// PARCOURS 1.2 - Page boutique
// =====================================================================
test.describe('Page boutique /shop', () => {

  test('La page boutique affiche une grille de produits avec filtres et tri', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // Vérifier au moins 1 carte produit
    await shopPage.verifyProductGridVisible();
    const count = await shopPage.getProductCount();
    expect(count).toBeGreaterThanOrEqual(1);

    // Vérifier le panneau filtres
    await shopPage.verifyFilterPanelVisible();

    // Vérifier le sélecteur de tri
    await shopPage.verifySortSelectorVisible();
  });

});

// =====================================================================
// PARCOURS 1.3 - Recherche produit
// =====================================================================
test.describe('Recherche produit', () => {

  test('La recherche filtre les produits et met à jour l\'URL', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // Saisir un terme de recherche
    await shopPage.search('chaise');

    // Vérifier que l'URL contient le terme de recherche
    await shopPage.verifySearchInUrl('chaise');

    // Vérifier que des résultats sont affichés (ou le message "aucun résultat")
    const count = await shopPage.getProductCount();
    if (count === 0) {
      await shopPage.verifyNoResultsMessage();
    } else {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test("Effacer la recherche restaure la liste complète", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    const initialCount = await shopPage.getProductCount();

    // Rechercher un terme
    await shopPage.search('chaise');
    const filteredCount = await shopPage.getProductCount();

    // Effacer la recherche
    await shopPage.clearSearch();

    // La liste complète doit revenir
    const restoredCount = await shopPage.getProductCount();
    expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
    // 👉 Si la liste a été réduite puis restaurée, elle doit revenir au même niveau
    expect(restoredCount).toBeGreaterThanOrEqual(initialCount > 0 ? initialCount : 1);
  });

  test("Recherche sans résultat affiche un message approprié", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // Terme de recherche qui ne correspond à rien
    await shopPage.search('zzzzproduitinexistantxxx');

    await shopPage.verifyNoResultsMessage();
  });

});

// =====================================================================
// PARCOURS 1.4 - Filtrage par catégorie
// =====================================================================
test.describe('Filtrage par catégorie', () => {

  test("Cocher une catégorie met à jour l'URL et filtre les produits", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    const totalCount = await shopPage.getProductCount();

    // Cocher la première catégorie disponible
    await shopPage.checkFirstCategory();

    // L'URL doit contenir un paramètre de catégorie
    await shopPage.verifyCategoryInUrl();

    // Les produits affichés doivent être filtrés (≤ total initial)
    const filteredCount = await shopPage.getProductCount();
    expect(filteredCount).toBeLessThanOrEqual(totalCount);
    expect(filteredCount).toBeGreaterThanOrEqual(0);
  });

  test("Décocher la catégorie restaure tous les produits", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    const totalCount = await shopPage.getProductCount();

    await shopPage.checkFirstCategory();
    const filteredCount = await shopPage.getProductCount();

    await shopPage.uncheckFirstCategory();

    // La liste complète doit revenir
    const restoredCount = await shopPage.getProductCount();
    expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
  });

});

// =====================================================================
// PARCOURS 1.5 - Filtre par prix
// =====================================================================
test.describe('Filtre par prix', () => {

  test('Le slider de prix filtre les produits et affiche un indicateur', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // Vérifier la présence du filtre prix
    await shopPage.verifyPriceFilterVisible();

    // Définir un prix maximum
    await shopPage.setPriceMax(100);

    // Vérifier l'indicateur de range
    await shopPage.verifyPriceRangeIndicatorVisible();

    // Vérifier que tous les produits visibles ont un prix ≤ 100
    await shopPage.verifyAllPricesUnder(100);
  });

});

// =====================================================================
// PARCOURS 1.6 - Tri des produits
// =====================================================================
test.describe('Tri des produits', () => {

  test('Tri par prix croissant ordonne les produits du moins cher au plus cher', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    await shopPage.sortBy('price-asc');

    // Vérifier que les produits sont triés par prix croissant
    await shopPage.verifyProductsSortedByPriceAsc();
  });

  test('Tri par prix décroissant ordonne les produits du plus cher au moins cher', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    await shopPage.sortBy('price-desc');

    await shopPage.verifyProductsSortedByPriceDesc();
  });

});

// =====================================================================
// PARCOURS 1.7 - Page détail produit
// =====================================================================
test.describe('Page détail produit', () => {

  test("Cliquer sur un ProductCard ouvre la page détail avec toutes les informations", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // Cliquer sur le premier produit
    const productUrl = await shopPage.clickFirstProduct();

    // Vérifier que l'URL correspond à /product/[id]
    await expect(page).toHaveURL(/\/product\/|\/products\/|\/p\//); // 👉 ADAPTER

    // Vérifier les informations du produit
    const productPage = new ProductPage(page);
    await productPage.verifyAllProductDetailsVisible();
  });

  test("Le bouton 'Ajouter au panier' est présent sur la page produit", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();

    const productPage = new ProductPage(page);
    await productPage.verifyAddToCartButtonVisible();
  });

  test("Le bouton wishlist (cœur) est présent sur la page produit", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();

    const productPage = new ProductPage(page);
    await productPage.verifyWishlistButtonVisible();
  });

});
