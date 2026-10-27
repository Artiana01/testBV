/**
 * apps/ecommerce/tests/checkout.spec.ts
 * ----------------------------------------
 * Tests E2E - Tunnel de commande (Checkout)
 * Couvre : parcours complet de commande, validation des champs,
 *          confirmation et vidage du panier.
 *
 * Ordre d'exécution recommandé : 5e fichier
 * Nécessite d'être connecté.
 *
 * NOTE PAIEMENT : Ce test utilise les cartes de test Stripe standard.
 * 👉 ADAPTER selon le fournisseur de paiement (Stripe, Braintree, PayPal, mock...).
 *
 * Carte de test Stripe : 4242 4242 4242 4242 | Exp: 12/28 | CVV: 123
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AuthPage } from '../pages/AuthPage';
import { ShopPage } from '../pages/ShopPage';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Données de livraison de test
const TEST_SHIPPING = {
  firstName:  'Jean',
  lastName:   'Dupont',
  address:    '10 Rue de la Paix',
  city:       'Paris',
  postalCode: '75001',
  country:    'France',
};

// =====================================================================
// PARCOURS 3.1 - Checkout complet
// =====================================================================
test.describe('Checkout complet - utilisateur connecté', () => {

  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.login();
  });

  test('Parcours complet : ajout produits → checkout → confirmation de commande', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // --- Ajout du 1er produit ---
    await shopPage.clickFirstProduct();
    const productPage = new ProductPage(page);
    await productPage.clickAddToCart();

    // Retourner à /shop et ajouter un 2e produit différent
    await shopPage.goto();

    // Cliquer sur le 2e produit (pour avoir 2 produits différents)
    const secondCard = page.locator('[data-testid="product-card"]').nth(1); // 👉 ADAPTER
    if (await secondCard.isVisible()) {
      await secondCard.click();
      await page.waitForLoadState('load');
      await productPage.clickAddToCart();
    }

    // --- Navigation vers /checkout ---
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.goto();

    // Si redirigé vers login (ne devrait pas arriver car on est connecté)
    if (page.url().includes('login')) {
      throw new Error('Le checkout a redirigé vers login alors que l\'utilisateur est connecté.');
    }

    // --- Étape 1 : Adresse de livraison ---
    await checkoutPage.verifyOrderSummaryVisible();
    await checkoutPage.fillShippingAddress(TEST_SHIPPING);
    await checkoutPage.goToNextStep();

    // --- Étape 2 : Mode de livraison ---
    await checkoutPage.selectFirstDeliveryOption();
    await checkoutPage.goToNextStep();

    // --- Étape 3 : Paiement ---
    await checkoutPage.fillPaymentInfo({
      cardNumber: '4242 4242 4242 4242', // Carte de test Stripe
      expiry:     '12/28',
      cvv:        '123',
    });

    // --- Soumission de la commande ---
    await checkoutPage.submitOrder();

    // --- Confirmation ---
    await checkoutPage.verifyOrderSuccess();
    await checkoutPage.verifySuccessMessageVisible();
    await checkoutPage.verifyOrderNumberPresent();

    // --- Le panier doit être vidé après l'achat ---
    const cartPage = new CartPage(page);
    await cartPage.goto();
    await cartPage.verifyCartIsEmpty();
  });

  test('Le résumé de commande est visible en sidebar pendant le checkout', async ({ page }) => {
    // Ajouter un produit au panier
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();
    const productPage = new ProductPage(page);
    await productPage.clickAddToCart();

    // Aller au checkout
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.goto();

    // Vérifier que le résumé est visible
    await checkoutPage.verifyOrderSummaryVisible();
  });

});

// =====================================================================
// Validation des champs - Checkout sans remplir les champs
// =====================================================================
test.describe('Validation des champs du checkout', () => {

  test.beforeEach(async ({ page }) => {
    // Se connecter et ajouter un produit
    const authPage = new AuthPage(page);
    await authPage.login();

    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();
    const productPage = new ProductPage(page);
    await productPage.clickAddToCart();
  });

  test('Soumettre le checkout sans remplir les champs affiche des erreurs de validation', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.goto();

    // Tenter de passer à l'étape suivante sans remplir les champs
    await checkoutPage.goToNextStep();

    // Des erreurs de validation doivent apparaître
    await checkoutPage.verifyValidationErrorsVisible();

    // On reste sur la même étape (pas de redirection)
    await expect(page).toHaveURL(/checkout/);
  });

});

// =====================================================================
// Test de profil utilisateur
// =====================================================================
test.describe('Profil utilisateur - après commande', () => {

  test("L'historique des commandes est accessible depuis le profil", async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.login();

    await page.goto('/profile');
    await page.waitForLoadState('load');

    // 👉 ADAPTER : vérifier qu'un lien ou une section "Mes commandes" existe
    const ordersSection = page.getByRole('link', { name: /commandes|orders|historique/i })
      .or(page.getByText(/mes commandes|order history/i));

    // Ce test est conditionnel - l'historique n'existe que si l'utilisateur a commandé
    if (await ordersSection.isVisible()) {
      await ordersSection.click();
      await expect(page).toHaveURL(/orders|commandes|profile/);
    }
  });

});
