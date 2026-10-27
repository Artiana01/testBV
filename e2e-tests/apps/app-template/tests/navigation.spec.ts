/**
 * apps/app-template/tests/navigation.spec.ts
 * --------------------------------------------
 * Tests automatisés pour la navigation dans l'application.
 *
 * Ces tests vérifient que les pages principales sont accessibles
 * et que la navigation entre les sections fonctionne correctement.
 *
 * Adaptez les URLs et sélecteurs selon la structure réelle de l'application.
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { BasePage } from '../../../shared/pages/BasePage';

// Chargement des variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// =====================================================================
// GROUPE DE TESTS : Navigation publique (sans connexion)
// =====================================================================
test.describe('Navigation publique', () => {

  // -------------------------------------------------------------------
  // TEST 1 : La page d'accueil se charge correctement
  // -------------------------------------------------------------------
  test("La page d'accueil est accessible", async ({ page }) => {
    const basePage = new BasePage(page);

    // Navigation vers la racine de l'application
    await basePage.navigate('/');
    await basePage.waitForLoad();

    // 👉 ADAPTER : Vérifier que le titre de la page est correct
    // Remplacer 'Mon Application' par le vrai titre de l'app
    const titre = await basePage.getTitle();
    expect(titre).toBeTruthy(); // Vérifie juste qu'un titre existe

    // 👉 AJOUTER VOS SCÉNARIOS ICI
    // Exemples :
    // await expect(page).toHaveTitle(/Mon Application/);
    // await expect(page.getByRole('navigation')).toBeVisible();
    // await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  // -------------------------------------------------------------------
  // TEST 2 : La page de connexion est accessible
  // -------------------------------------------------------------------
  test('La page de connexion est accessible', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigate('/login');
    await loginPage.waitForLoad();

    // 👉 ADAPTER : Vérifier l'URL ou un élément unique de la page login
    await expect(page).toHaveURL(/login/); // 👉 ADAPTER si l'URL est différente

    // 👉 AJOUTER VOS SCÉNARIOS ICI
  });

  // -------------------------------------------------------------------
  // TEST 3 : Les liens de navigation principaux fonctionnent
  // -------------------------------------------------------------------
  test.skip('👉 AJOUTER VOS SCÉNARIOS ICI - Navigation dans le menu principal', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.navigate('/');
    await basePage.waitForLoad();

    // Exemple de navigation via un lien du menu :
    // 👉 ADAPTER le texte du lien selon le menu réel de l'application
    // await page.getByRole('link', { name: 'À propos' }).click();
    // await expect(page).toHaveURL(/about/);

    // await page.getByRole('link', { name: 'Contact' }).click();
    // await expect(page).toHaveURL(/contact/);
  });

});

// =====================================================================
// GROUPE DE TESTS : Navigation privée (après connexion)
// =====================================================================
test.describe('Navigation après connexion', () => {

  // Connexion avant chaque test de ce groupe
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);

    // On se connecte d'abord avant de tester la navigation protégée
    await loginPage.login();
    await page.waitForLoadState('networkidle');
  });

  // -------------------------------------------------------------------
  // TEST 4 : Accès au tableau de bord après connexion
  // -------------------------------------------------------------------
  test.skip('👉 AJOUTER VOS SCÉNARIOS ICI - Le tableau de bord est accessible', async ({ page }) => {
    // Ce test est ignoré jusqu'à ce que vous le complétiez.

    // Exemple :
    // await page.getByRole('link', { name: 'Tableau de bord' }).click(); // 👉 ADAPTER
    // await expect(page).toHaveURL(/dashboard/); // 👉 ADAPTER
    // await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  });

  // -------------------------------------------------------------------
  // TEST 5 : Navigation entre sections de l'application
  // -------------------------------------------------------------------
  test.skip('👉 AJOUTER VOS SCÉNARIOS ICI - Navigation entre sections', async ({ page }) => {
    // Ce test est ignoré jusqu'à ce que vous le complétiez.

    // Exemple de navigation entre plusieurs sections :
    // await page.getByRole('link', { name: 'Profil' }).click(); // 👉 ADAPTER
    // await expect(page).toHaveURL(/profile/); // 👉 ADAPTER

    // await page.getByRole('link', { name: 'Paramètres' }).click(); // 👉 ADAPTER
    // await expect(page).toHaveURL(/settings/); // 👉 ADAPTER
  });

  // -------------------------------------------------------------------
  // TEST 6 : Redirection vers login si accès non autorisé
  // -------------------------------------------------------------------
  test.skip('👉 AJOUTER VOS SCÉNARIOS ICI - Redirection si non connecté', async ({ page }) => {
    // Ce test vérifie qu'une URL protégée redirige vers /login si non connecté.
    // Note : ce test ne doit PAS utiliser beforeEach car on teste sans être connecté.

    // Exemple :
    // await page.goto('/admin'); // 👉 ADAPTER : URL protégée de votre app
    // await expect(page).toHaveURL(/login/); // On doit être redirigé
  });

});
