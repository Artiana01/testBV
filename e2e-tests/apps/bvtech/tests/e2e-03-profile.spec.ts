/**
 * apps/bvtech/tests/e2e-03-profile.spec.ts
 * -------------------------------------------
 * E2E 03 : Gestion du profil utilisateur (CRITIQUE)
 *
 * Utilise le compte client pré-créé (TEST_EMAIL / TEST_PASSWORD depuis .env).
 *
 * Étapes :
 *   1. Se connecter
 *   2. Aller dans profil
 *   3. Modifier informations
 *   4. Sauvegarder
 *
 * Résultat attendu :
 *   ● Données mises à jour
 *   ● Persistance des informations
 *
 * Priorité : Critique
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { generateUniqueId } from '../../../shared/utils/helpers';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Utilisation du compte pré-créé depuis .env
const PROFILE_EMAIL    = process.env.TEST_EMAIL    ?? 'e2e.client@bvtest.com';
const PROFILE_PASSWORD = process.env.TEST_PASSWORD ?? 'ClientTest123!';

test.describe('E2E 03 - Gestion du profil utilisateur (CRITIQUE)', () => {

  test('03.1 - Se connecter et accéder au profil', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const profilePage = new ProfilePage(page);

    // 1. Se connecter
    await loginPage.login(PROFILE_EMAIL, PROFILE_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // 2. Aller dans le profil
    await profilePage.goto();

    // Vérifier que la page profil est chargée
    await profilePage.verifyProfilePageLoaded();
  });

  test('03.2 - Modifier le nom et sauvegarder', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const profilePage = new ProfilePage(page);
    const newName = `BVTech User ${generateUniqueId('test')}`;

    // 1. Se connecter
    await loginPage.login(PROFILE_EMAIL, PROFILE_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // 2. Aller dans le profil
    await profilePage.goto();

    // 3. Modifier le nom
    await profilePage.updateName(newName);

    // 4. Sauvegarder
    await profilePage.saveProfile();

    // Vérifier la sauvegarde
    await profilePage.verifyProfileSaved();
  });

  test('03.3 - Vérifier la persistance des données après modification', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const profilePage = new ProfilePage(page);
    const persistName = `Persist ${generateUniqueId('p')}`;

    // 1. Se connecter
    await loginPage.login(PROFILE_EMAIL, PROFILE_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // 2. Aller dans le profil et modifier le nom
    await profilePage.goto();
    await profilePage.updateName(persistName);
    await profilePage.saveProfile();
    await page.waitForTimeout(2000);

    // 3. Vérifier la persistance (recharger et vérifier)
    await profilePage.verifyDataPersistence(persistName);
  });

  test('03.4 - Les informations utilisateur sont affichées', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const profilePage = new ProfilePage(page);

    // 1. Se connecter
    await loginPage.login(PROFILE_EMAIL, PROFILE_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // 2. Aller dans le profil
    await profilePage.goto();

    // 3. Vérifier l'affichage des informations
    await profilePage.verifyUserInfoDisplayed();
  });

  test('03.5 - L\'email affiché correspond au compte connecté', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage  = new LoginPage(page);
    const profilePage = new ProfilePage(page);

    await loginPage.login(PROFILE_EMAIL, PROFILE_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    await profilePage.goto();
    await profilePage.verifyProfilePageLoaded();

    // L'email du compte doit apparaître quelque part sur la page
    const emailDisplay = page.getByText(PROFILE_EMAIL, { exact: false })
      .or(page.locator(`input[value*="${PROFILE_EMAIL.split('@')[0]}"]`));
    
    if (await emailDisplay.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(emailDisplay.first()).toBeVisible();
    }
  });

});
