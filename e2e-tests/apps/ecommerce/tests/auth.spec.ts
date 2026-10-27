/**
 * apps/ecommerce/tests/auth.spec.ts
 * -----------------------------------
 * Tests E2E - Authentification
 * Couvre : inscription, connexion réussie, connexion échouée,
 *          mot de passe oublié, déconnexion, accès protégé.
 *
 * Ordre d'exécution recommandé : 1er fichier à lancer
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { generateRandomEmail } from '../../../shared/utils/helpers';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// =====================================================================
// PARCOURS 2.1 - Inscription
// =====================================================================
test.describe('Inscription', () => {

  test('Inscription réussie avec des données valides', async ({ page }) => {
    const authPage = new AuthPage(page);

    // Génération d'un email unique pour éviter les conflits entre tests
    const uniqueEmail = generateRandomEmail('testuser', 'test.com');

    await authPage.register(
      'Test Utilisateur',
      uniqueEmail,
      'Password123!'  // ≥ 8 caractères, 1 majuscule, 1 chiffre
    );

    // Vérifier la redirection vers / ou /shop après inscription
    await expect(page).toHaveURL(/^\/(shop)?$|\/shop/, { timeout: 8_000 }); // 👉 ADAPTER l'URL cible

    // Vérifier que l'avatar/nom utilisateur apparaît dans la navbar
    const homePage = new HomePage(page);
    await homePage.verifyUserAvatarInNavbar();
  });

  test('Inscription avec email déjà utilisé affiche une erreur', async ({ page }) => {
    const authPage = new AuthPage(page);

    // Utiliser un email déjà existant dans la base
    await authPage.register(
      'Utilisateur Existant',
      process.env.TEST_EMAIL ?? 'user@test.com',
      'Password123!'
    );

    // L'inscription doit échouer avec un message d'erreur
    await expect(page).toHaveURL(/auth\/register/); // On reste sur la page register
    // 👉 ADAPTER : message d'erreur pour email déjà utilisé
    await expect(
      page.getByText(/déjà utilisé|already exists|email existe|already registered/i)
    ).toBeVisible({ timeout: 5_000 });
  });

});

// =====================================================================
// PARCOURS 2.2 - Connexion réussie
// =====================================================================
test.describe('Connexion réussie', () => {

  test('Connexion avec des identifiants valides', async ({ page }) => {
    const authPage = new AuthPage(page);

    await authPage.login(
      process.env.TEST_EMAIL,
      process.env.TEST_PASSWORD
    );

    // Vérifier la redirection vers la page d'accueil
    await expect(page).toHaveURL(/^\/$|^\/shop/, { timeout: 8_000 }); // 👉 ADAPTER

    // Vérifier que le profil utilisateur apparaît dans la navbar
    await authPage.verifyLoginSuccess();
  });

  test('Connexion admin avec des identifiants admin valides', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.loginAsAdmin();

    // L'admin peut accéder au dashboard
    await page.goto('/admin');
    await expect(page).toHaveURL(/admin/); // 👉 ADAPTER si l'URL est différente
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

});

// =====================================================================
// PARCOURS 2.3 - Connexion échouée
// =====================================================================
test.describe('Connexion échouée', () => {

  test('Connexion avec un mauvais mot de passe affiche une erreur', async ({ page }) => {
    const authPage = new AuthPage(page);

    await authPage.navigateToLogin();
    await authPage.fillLoginForm(
      process.env.TEST_EMAIL ?? 'user@test.com',
      'mauvais-mot-de-passe-xyz'
    );
    await authPage.submitLoginForm();

    // Vérifier l'affichage d'un message d'erreur sans redirection
    await authPage.verifyLoginError();
  });

  test('Connexion avec un email inexistant affiche une erreur', async ({ page }) => {
    const authPage = new AuthPage(page);

    await authPage.navigateToLogin();
    await authPage.fillLoginForm(
      'email-qui-nexiste-pas@nowhere.com',
      'Password123!'
    );
    await authPage.submitLoginForm();

    await authPage.verifyLoginError();
  });

  test('Connexion avec un email invalide affiche une erreur de validation', async ({ page }) => {
    const authPage = new AuthPage(page);

    await authPage.navigateToLogin();
    await authPage.fillLoginForm('pas-un-email', 'Password123!');
    await authPage.submitLoginForm();

    // Le navigateur ou le formulaire doit bloquer la soumission
    // 👉 ADAPTER : soit HTML5 validation native, soit message d'erreur custom
    await expect(page).toHaveURL(/auth\/login/);
  });

});

// =====================================================================
// PARCOURS 2.4 - Mot de passe oublié
// =====================================================================
test.describe('Mot de passe oublié', () => {

  test('Envoi du formulaire mot de passe oublié avec un email valide', async ({ page }) => {
    const authPage = new AuthPage(page);

    await authPage.navigateToForgotPassword();

    await authPage.submitForgotPasswordForm(
      process.env.TEST_EMAIL ?? 'user@test.com'
    );

    // Vérifier le message de confirmation (email envoyé)
    await authPage.verifyForgotPasswordConfirmation();
  });

});

// =====================================================================
// PARCOURS 2.5 - Déconnexion
// =====================================================================
test.describe('Déconnexion', () => {

  test('Déconnexion réussie redirige vers /', async ({ page }) => {
    const authPage = new AuthPage(page);

    // Se connecter d'abord
    await authPage.login();
    await authPage.verifyLoginSuccess();

    // Se déconnecter
    await authPage.logout();

    // Vérifier la redirection vers /
    await expect(page).toHaveURL(/^\/$/, { timeout: 8_000 }); // 👉 ADAPTER

    // Vérifier que le profil n'est plus visible
    await authPage.verifyLoggedOut();
  });

  test("Accès à /profile après déconnexion redirige vers login", async ({ page }) => {
    const authPage = new AuthPage(page);

    // Se connecter puis se déconnecter
    await authPage.login();
    await authPage.logout();

    // Tenter d'accéder à la page profil (protégée)
    await page.goto('/profile');
    await page.waitForLoadState('load');

    // Doit être redirigé vers login
    await expect(page).toHaveURL(/auth\/login|login/, { timeout: 5_000 }); // 👉 ADAPTER
  });

});
