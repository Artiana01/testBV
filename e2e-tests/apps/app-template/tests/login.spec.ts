/**
 * apps/app-template/tests/login.spec.ts
 * ---------------------------------------
 * Tests automatisés pour la fonctionnalité de connexion.
 *
 * Ce fichier contient des exemples de tests commentés.
 * Remplacez les commentaires // 👉 AJOUTER VOS SCÉNARIOS ICI
 * par les vrais scénarios fournis par le testeur.
 *
 * Pour générer rapidement du code de test :
 * npm run codegen -- https://votre-app.com
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';

// Chargement des variables d'environnement spécifiques à cette application
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Fallback sur le .env racine si le .env local n'existe pas
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// =====================================================================
// GROUPE DE TESTS : Connexion utilisateur
// =====================================================================
test.describe('Connexion utilisateur', () => {

  // -------------------------------------------------------------------
  // TEST 1 : Connexion avec des identifiants valides
  // -------------------------------------------------------------------
  test('Connexion réussie avec des identifiants valides', async ({ page }) => {
    // Instanciation de la page de connexion
    const loginPage = new LoginPage(page);

    // Navigation et connexion avec les identifiants du .env
    await loginPage.login(
      process.env.TEST_EMAIL,
      process.env.TEST_PASSWORD
    );

    // 👉 ADAPTER : Vérifier que l'URL après connexion est correcte
    // Remplacer '/dashboard' par l'URL réelle de la page d'accueil après login
    await expect(page).toHaveURL(/dashboard/);

    // 👉 AJOUTER VOS SCÉNARIOS ICI
    // Exemples de vérifications supplémentaires :
    // await expect(page.getByText('Bienvenue')).toBeVisible();
    // await expect(page.getByRole('navigation')).toBeVisible();
  });

  // -------------------------------------------------------------------
  // TEST 2 : Connexion avec un mauvais mot de passe
  // -------------------------------------------------------------------
  test('Échec de connexion avec un mot de passe incorrect', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Tentative de connexion avec un mauvais mot de passe
    await loginPage.login(
      process.env.TEST_EMAIL,
      'mauvais-mot-de-passe-12345'
    );

    // 👉 ADAPTER : Vérifier l'affichage d'un message d'erreur
    // Remplacer le texte par le vrai message d'erreur de l'application
    await loginPage.verifyLoginError();

    // 👉 AJOUTER VOS SCÉNARIOS ICI
    // Exemples :
    // await expect(page.getByText('Identifiants incorrects')).toBeVisible();
    // await expect(page).toHaveURL('/login'); // On reste sur la page login
  });

  // -------------------------------------------------------------------
  // TEST 3 : Page de login affiche les champs attendus
  // -------------------------------------------------------------------
  test('La page de connexion affiche les champs email et mot de passe', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigation vers la page de connexion uniquement
    await loginPage.navigate('/login');
    await loginPage.waitForLoad();

    // 👉 ADAPTER : Vérifier la présence des éléments du formulaire
    await expect(page.locator('input[type="email"]')).toBeVisible();   // 👉 ADAPTER
    await expect(page.locator('input[type="password"]')).toBeVisible(); // 👉 ADAPTER
    await expect(page.locator('button[type="submit"]')).toBeVisible();  // 👉 ADAPTER

    // 👉 AJOUTER VOS SCÉNARIOS ICI
  });

  // -------------------------------------------------------------------
  // TEST 4 : Placeholder - À compléter avec vos scénarios
  // -------------------------------------------------------------------
  test.skip('👉 AJOUTER VOS SCÉNARIOS ICI - exemple : Connexion via SSO', async ({ page }) => {
    // Ce test est ignoré (test.skip) jusqu'à ce que vous le complétiez.
    // Supprimez test.skip et remplacez ce commentaire par votre scénario.

    // Exemple de structure d'un test :
    // const loginPage = new LoginPage(page);
    // await loginPage.navigate('/login');
    // await page.getByRole('button', { name: 'Se connecter avec Google' }).click();
    // await expect(page).toHaveURL(/google.com/);
  });

});

// =====================================================================
// GROUPE DE TESTS : Déconnexion utilisateur
// =====================================================================
test.describe('Déconnexion utilisateur', () => {

  // Connexion avant chaque test de ce groupe
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login();
    // Attente que la connexion soit effective
    await page.waitForLoadState('networkidle');
  });

  test.skip('👉 AJOUTER VOS SCÉNARIOS ICI - exemple : Déconnexion réussie', async ({ page }) => {
    // Ce test est ignoré jusqu'à ce que vous le complétiez.

    // Exemple :
    // await page.getByRole('button', { name: 'Mon compte' }).click(); // 👉 ADAPTER
    // await page.getByRole('menuitem', { name: 'Se déconnecter' }).click(); // 👉 ADAPTER
    // await expect(page).toHaveURL('/login');
  });

});
