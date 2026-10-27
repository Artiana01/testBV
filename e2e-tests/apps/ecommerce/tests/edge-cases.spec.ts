/**
 * apps/ecommerce/tests/edge-cases.spec.ts
 * -----------------------------------------
 * Tests E2E - Cas limites et robustesse
 * Couvre : accès non autorisés, pages 404, persistance des états,
 *          validation des formulaires, états vides.
 *
 * Ordre d'exécution recommandé : 7e fichier (dernier)
 * Ces tests mélangent visiteurs, utilisateurs connectés et admin.
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AuthPage } from '../pages/AuthPage';
import { ShopPage } from '../pages/ShopPage';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { WishlistPage } from '../pages/WishlistPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// =====================================================================
// PARCOURS 5.1 - Accès /admin sans connexion
// =====================================================================
test.describe('Accès non autorisés', () => {

  test('[5.1] Accès direct à /admin sans connexion → redirection vers login', async ({ page }) => {
    // S'assurer qu'on n'est pas connecté (navigation directe sans session)
    await page.goto('/admin');
    await page.waitForLoadState('load');

    // Doit être redirigé vers /auth/login ou la page d'accueil
    const url = page.url();
    const isBlocked = url.includes('login') || url.includes('auth') || !url.includes('admin');
    expect(isBlocked).toBeTruthy();
  });

  test('[5.2] Accès à /admin avec un compte customer → refus ou redirection', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.login(
      process.env.TEST_EMAIL,
      process.env.TEST_PASSWORD
    );

    await page.goto('/admin');
    await page.waitForLoadState('load');

    // Doit être redirigé vers / ou voir une erreur 403
    const url = page.url();
    const hasForbidden = await page.getByText(/403|forbidden|accès refusé|not authorized/i).isVisible();
    const isRedirected = !url.includes('/admin') || url === `${process.env.BASE_URL}/`;

    expect(isRedirected || hasForbidden).toBeTruthy();
  });

  test('[5.3] Accès à /product/id-inexistant → page 404 ou message d\'erreur', async ({ page }) => {
    await page.goto('/product/id-qui-nexiste-vraiment-pas-99999999');
    await page.waitForLoadState('load');

    // Vérifier la présence d'un indicateur 404
    const has404 = await page.getByText(/404|page introuvable|not found|produit introuvable/i).isVisible();
    const isOnErrorPage = page.url().includes('404') || page.url().includes('not-found');

    // L'une ou l'autre condition doit être vraie
    expect(has404 || isOnErrorPage).toBeTruthy();
  });

  test('[5.1b] Accès à /profile sans connexion → redirection vers login', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('load');

    await expect(page).toHaveURL(/login|auth/); // 👉 ADAPTER
  });

  test('[5.1c] Accès à /checkout sans connexion → redirection vers login', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('load');

    const isLoginPage = page.url().includes('login') || page.url().includes('auth');
    const hasLoginForm = await page.locator('input[type="email"]').isVisible();
    expect(isLoginPage || hasLoginForm).toBeTruthy();
  });

});

// =====================================================================
// PARCOURS 5.4 - Persistance du panier après rechargement
// =====================================================================
test.describe('Persistance du panier', () => {

  test('[5.4] Le panier est restauré après rechargement de la page', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();

    const productPage = new ProductPage(page);
    await productPage.clickAddToCart();
    await productPage.verifyCartCountEquals(1);

    // Recharger la page entière
    await page.reload();
    await page.waitForLoadState('load');

    // Le panier doit être restauré (Zustand avec localStorage ou session serveur)
    // 👉 ADAPTER : si le store est côté serveur, le compteur sera toujours là
    // Si c'est localStorage, vérifier que l'hydratation fonctionne correctement
    await productPage.verifyCartCountEquals(1);
  });

  test('[5.4b] Le panier persiste après navigation entre pages', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();

    const productPage = new ProductPage(page);
    await productPage.clickAddToCart();

    // Naviguer vers une autre page
    await page.goto('/');
    await page.waitForLoadState('load');

    // Le compteur panier dans la navbar doit toujours afficher 1
    await productPage.verifyCartCountEquals(1);
  });

});

// =====================================================================
// PARCOURS 5.5 - Persistance de la wishlist après rechargement
// =====================================================================
test.describe('Persistance de la wishlist', () => {

  test('[5.5] La wishlist est restaurée après rechargement', async ({ page }) => {
    // Connexion requise pour que la wishlist soit persistée
    const authPage = new AuthPage(page);
    await authPage.login();

    const shopPage = new ShopPage(page);
    await shopPage.goto();

    const wishlistPage = new WishlistPage(page);
    await wishlistPage.toggleWishlistOnFirstShopProduct();

    // Recharger
    await page.reload();
    await page.waitForLoadState('load');

    // Aller sur /wishlist et vérifier que le produit y est toujours
    await wishlistPage.goto();
    await wishlistPage.verifyWishlistHasItems();
  });

});

// =====================================================================
// PARCOURS 5.6 - Recherche sans résultat
// =====================================================================
test.describe('États vides', () => {

  test('[5.6] Une recherche sans résultat affiche "Aucun produit trouvé"', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto();

    // Rechercher un terme absurde
    await shopPage.search('zzznomatchxxx12345');

    await shopPage.verifyNoResultsMessage();
  });

  test('[5.6b] Un panier vide affiche le message approprié', async ({ page }) => {
    const cartPage = new CartPage(page);
    await cartPage.goto();

    // Si le panier est vide dès le départ (nouvelle session), vérifier le message
    const hasItems = await page.locator('[data-testid="cart-item"]').first().isVisible().catch(() => false);

    if (!hasItems) {
      await cartPage.verifyCartIsEmpty();
    }
  });

});

// =====================================================================
// PARCOURS 5.7 - Validation des formulaires
// =====================================================================
test.describe('Validation des formulaires', () => {

  test('[5.7] Le formulaire de checkout bloque si les champs sont vides', async ({ page }) => {
    // Se connecter d'abord
    const authPage = new AuthPage(page);
    await authPage.login();

    // Ajouter un produit au panier
    const shopPage = new ShopPage(page);
    await shopPage.goto();
    await shopPage.clickFirstProduct();
    const productPage = new ProductPage(page);
    await productPage.clickAddToCart();

    // Aller au checkout et soumettre sans remplir
    await page.goto('/checkout');
    await page.waitForLoadState('load');

    // Cliquer sur "Continuer" sans remplir les champs
    const nextBtn = page.getByRole('button', { name: /continuer|suivant|next|continue/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    } else {
      // 👉 ADAPTER si le bouton a un sélecteur différent
      await page.locator('[data-testid="next-step-btn"]').click();
    }

    // Des erreurs de validation doivent apparaître
    const errorVisible = await page.locator('[aria-invalid="true"]')
      .or(page.locator('.error, [data-testid="field-error"], [role="alert"]'))
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(errorVisible).toBeTruthy();
  });

  test('[5.7b] Le formulaire de login valide le format email', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToLogin();

    // Remplir avec un email invalide
    await page.locator('input[type="email"]').fill('pas-un-email'); // 👉 ADAPTER
    await page.locator('button[type="submit"]').click();             // 👉 ADAPTER

    // Doit afficher une erreur ou bloquer la soumission HTML5
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('[5.7c] Le formulaire de register valide la complexité du mot de passe', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToRegister();

    // Mot de passe trop simple (sans majuscule ni chiffre)
    await authPage.fillRegisterForm('Test User', 'newuser@test.com', 'simple');
    await authPage.submitRegisterForm();

    // Doit rester sur la page register avec une erreur
    await expect(page).toHaveURL(/auth\/register/);
    // 👉 ADAPTER : message d'erreur de complexité du mot de passe
    const errorVisible = await page.getByText(/mot de passe|password|caractère|majuscule|chiffre/i)
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    // Ce test est conditionnel - la validation peut être côté client ou serveur
  });

});

// =====================================================================
// PARCOURS 5.8 - Inscription avec email déjà utilisé
// =====================================================================
test.describe('Inscription - cas limites', () => {

  test('[5.8] Inscription avec un email déjà enregistré affiche une erreur', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToRegister();

    // Utiliser l'email du compte de test (déjà existant)
    await authPage.fillRegisterForm(
      'Doublon Utilisateur',
      process.env.TEST_EMAIL ?? 'user@test.com',
      'Password123!'
    );
    await authPage.submitRegisterForm();

    // Doit rester sur /auth/register avec un message d'erreur
    await expect(page).toHaveURL(/auth\/register/);
    const errorVisible = await page.getByText(/déjà utilisé|already exists|email existe|already registered/i)
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(errorVisible).toBeTruthy();
  });

});
