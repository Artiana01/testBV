/**
 * apps/ecommerce/tests/cart.spec.ts
 * -----------------------------------
 * Tests E2E - Panier
 * Couvre : ajout au panier (connecté et non connecté), modification quantité,
 *          suppression d'article, vérification du sous-total, persistance, checkout bloqué.
 *
 * Ordre d'exécution recommandé : 3e fichier
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ShopPage } from '../pages/ShopPage';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { AuthPage } from '../pages/AuthPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// =====================================================================
// PARCOURS 1.8 - Ajout au panier (visiteur non connecté)
// =====================================================================
test.describe('Ajout au panier - visiteur non connecté', () => {

  test("Ajouter un produit incrémente le compteur panier dans la navbar", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // Aller sur le premier produit
    await shopPage.clickFirstProduct();
    const productPage = new ProductPage(page);

    // Ajouter au panier
    await productPage.clickAddToCart();

    // Vérifier que le compteur panier est maintenant à 1
    await productPage.verifyCartCountEquals(1);
  });

  test("Le produit ajouté apparaît dans /cart avec nom, prix et quantité", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // Récupérer le nom du premier produit avant de cliquer
    await shopPage.clickFirstProduct();
    const productPage = new ProductPage(page);
    const productName = await productPage.getProductName();

    // Ajouter au panier
    await productPage.clickAddToCart();

    // Naviguer vers le panier
    const cartPage = new CartPage(page);
    await cartPage.goto();

    // Vérifier la présence du produit
    await cartPage.verifyCartHasItems();
    await cartPage.verifyFirstItemNameVisible();
    await cartPage.verifyFirstItemPriceVisible();
    await cartPage.verifyFirstItemQuantityVisible();
    await cartPage.verifyItemInCart(productName);
  });

  test("Le sous-total du panier est calculé correctement", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    await shopPage.clickFirstProduct();
    const productPage = new ProductPage(page);
    const unitPrice = await productPage.getProductPrice();

    await productPage.clickAddToCart();

    const cartPage = new CartPage(page);
    await cartPage.goto();

    // Sous-total = prix × 1 pour une quantité initiale de 1
    await cartPage.verifySubtotalCorrect(unitPrice, 1);
  });

});

// =====================================================================
// PARCOURS 1.9 - Modification du panier
// =====================================================================
test.describe('Modification du panier', () => {

  test.beforeEach(async ({ page }) => {
    // Ajouter un produit au panier avant chaque test
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();
    const productPage = new ProductPage(page);
    await productPage.clickAddToCart();
  });

  test("Augmenter la quantité à 2 met à jour le sous-total", async ({ page }) => {
    const cartPage = new CartPage(page);
    await cartPage.goto();
    await cartPage.verifyCartHasItems();

    // Récupérer le prix unitaire depuis le sous-total (quantité=1 initialement)
    const initialSubtotal = await cartPage.getSubtotalValue();

    // Augmenter la quantité à 2
    await cartPage.increaseFirstItemQuantity();

    // Le sous-total doit être approximativement le double
    const newSubtotal = await cartPage.getSubtotalValue();
    const expectedSubtotal = parseFloat((initialSubtotal * 2).toFixed(2));
    expect(Math.abs(newSubtotal - expectedSubtotal)).toBeLessThanOrEqual(0.05);
  });

  test("Supprimer l'article affiche le message 'panier vide'", async ({ page }) => {
    const cartPage = new CartPage(page);
    await cartPage.goto();
    await cartPage.verifyCartHasItems();

    // Supprimer l'article
    await cartPage.removeFirstItem();

    // Vérifier le message "panier vide"
    await cartPage.verifyCartIsEmpty();
  });

});

// =====================================================================
// PARCOURS 1.10 - Checkout bloqué sans connexion
// =====================================================================
test.describe('Checkout bloqué sans connexion', () => {

  test("Accéder à /checkout sans être connecté redirige vers login ou affiche le formulaire login", async ({ page }) => {
    // Ajouter un produit au panier en tant que visiteur
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();
    const productPage = new ProductPage(page);
    await productPage.clickAddToCart();

    // Tenter d'accéder au checkout
    await page.goto('/checkout');
    await page.waitForLoadState('load');

    // Vérifier la redirection ou l'affichage du formulaire de connexion
    const isRedirectedToLogin = page.url().includes('login') || page.url().includes('auth');
    const hasLoginForm = await page.locator('input[type="email"]').isVisible();
    expect(isRedirectedToLogin || hasLoginForm).toBeTruthy();
  });

});

// =====================================================================
// Persistance du panier
// =====================================================================
test.describe('Persistance du panier', () => {

  test("Le panier est conservé après rechargement de la page", async ({ page }) => {
    // Ajouter un produit
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();
    const productPage = new ProductPage(page);
    await productPage.clickAddToCart();
    await productPage.verifyCartCountEquals(1);

    // Recharger la page
    await page.reload();
    await page.waitForLoadState('load');

    // Le compteur doit toujours être à 1
    // 👉 ADAPTER : si le panier est géré côté serveur, il persistera toujours
    // Si c'est Zustand avec localStorage, vérifier que le store est hydraté
    await productPage.verifyCartCountEquals(1);
  });

});

// =====================================================================
// Panier avec compte connecté
// =====================================================================
test.describe('Panier - utilisateur connecté', () => {

  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    const authPage = new AuthPage(page);
    await authPage.login();
  });

  test("Un utilisateur connecté peut ajouter un produit et voir le panier", async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();

    const productPage = new ProductPage(page);
    await productPage.clickAddToCart();
    await productPage.verifyCartCountEquals(1);

    const cartPage = new CartPage(page);
    await cartPage.goto();
    await cartPage.verifyCartHasItems();
    await cartPage.verifySubtotalIsVisible();
  });

});
