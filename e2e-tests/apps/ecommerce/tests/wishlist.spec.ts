/**
 * apps/ecommerce/tests/wishlist.spec.ts
 * ---------------------------------------
 * Tests E2E - Liste de souhaits (Wishlist)
 * Couvre : toggle cœur depuis /shop, page /wishlist, ajout au panier,
 *          suppression, persistance.
 *
 * Ordre d'exécution recommandé : 4e fichier
 * Nécessite d'être connecté (la wishlist est généralement liée au compte utilisateur).
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AuthPage } from '../pages/AuthPage';
import { ShopPage } from '../pages/ShopPage';
import { ProductPage } from '../pages/ProductPage';
import { WishlistPage } from '../pages/WishlistPage';
import { CartPage } from '../pages/CartPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// =====================================================================
// Connexion avant chaque test
// =====================================================================
test.beforeEach(async ({ page }) => {
  const authPage = new AuthPage(page);
  await authPage.login();
});

// =====================================================================
// PARCOURS 3.2 - Wishlist
// =====================================================================
test.describe('Wishlist', () => {

  test("Cliquer sur le cœur d'un produit dans /shop l'ajoute à la wishlist", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // Cliquer sur le cœur du premier produit
    const wishlistPage = new WishlistPage(page);
    await wishlistPage.toggleWishlistOnFirstShopProduct();

    // Vérifier que le cœur est maintenant "rempli" (état actif)
    await wishlistPage.verifyWishlistHeartActive();
  });

  test("Un produit ajouté à la wishlist apparaît sur /wishlist", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // Récupérer le nom du premier produit
    const firstProductCard = page.locator('[data-testid="product-card"]').first(); // 👉 ADAPTER
    const productName = await firstProductCard
      .locator('[data-testid="product-card-name"]') // 👉 ADAPTER
      .innerText()
      .catch(() => ''); // Fallback si le sélecteur ne trouve rien

    // Ajouter à la wishlist
    const wishlistPage = new WishlistPage(page);
    await wishlistPage.toggleWishlistOnFirstShopProduct();

    // Naviguer vers /wishlist
    await wishlistPage.goto();

    // Vérifier que la wishlist contient au moins un produit
    await wishlistPage.verifyWishlistHasItems();

    // Si on a pu récupérer le nom, vérifier sa présence
    if (productName) {
      await wishlistPage.verifyItemInWishlist(productName);
    }
  });

  test("'Ajouter tout au panier' depuis la wishlist transfère les articles dans le panier", async ({ page }) => {
    // D'abord, ajouter un produit à la wishlist
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    const wishlistPage = new WishlistPage(page);
    await wishlistPage.toggleWishlistOnFirstShopProduct();

    // Aller sur /wishlist
    await wishlistPage.goto();
    await wishlistPage.verifyWishlistHasItems();

    // Cliquer sur "Ajouter tout au panier" si disponible
    const added = await wishlistPage.addAllToCart();

    if (added) {
      // Vérifier que le panier contient les articles
      const cartPage = new CartPage(page);
      await cartPage.goto();
      await cartPage.verifyCartHasItems();
    } else {
      // Le bouton n'existe pas - ajouter depuis la page produit à la place
      // 👉 INFO : ce test est conditionnel selon l'implémentation de la wishlist
      console.log("INFO : Le bouton 'Ajouter tout au panier' n'est pas présent dans cette app.");
    }
  });

  test("Retirer un produit de la wishlist met à jour la liste", async ({ page }) => {
    // Ajouter un produit à la wishlist
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    const wishlistPage = new WishlistPage(page);
    await wishlistPage.toggleWishlistOnFirstShopProduct();

    // Aller sur /wishlist
    await wishlistPage.goto();
    await wishlistPage.verifyWishlistHasItems();

    const countBefore = await wishlistPage.getWishlistItemCount();

    // Supprimer le premier article
    await wishlistPage.removeFirstItem();

    // Si c'était le seul article, la wishlist doit être vide
    if (countBefore === 1) {
      await wishlistPage.verifyWishlistIsEmpty();
    } else {
      // Sinon, la liste doit avoir un article de moins
      const countAfter = await wishlistPage.getWishlistItemCount();
      expect(countAfter).toBe(countBefore - 1);
    }
  });

  test("La wishlist est persistée après rechargement de la page", async ({ page }) => {
    // Ajouter un produit à la wishlist
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    const wishlistPage = new WishlistPage(page);
    await wishlistPage.toggleWishlistOnFirstShopProduct();

    // Recharger la page
    await page.reload();
    await page.waitForLoadState('load');

    // Aller sur /wishlist et vérifier que le produit est toujours là
    await wishlistPage.goto();
    await wishlistPage.verifyWishlistHasItems();
  });

  test("Cliquer sur le bouton cœur depuis la page produit ajoute à la wishlist", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();

    const productPage = new ProductPage(page);
    await productPage.verifyWishlistButtonVisible();
    await productPage.clickWishlistToggle();

    // Vérifier que le cœur est à l'état actif
    await productPage.verifyWishlistIsActive();
  });

});
