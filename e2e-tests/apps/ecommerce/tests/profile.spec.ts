/**
 * apps/ecommerce/tests/profile.spec.ts
 * --------------------------------------
 * Tests E2E - Profil utilisateur
 * Couvre : affichage des informations, modification du nom, mise à jour navbar.
 *
 * Nécessite d'être connecté.
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AuthPage } from '../pages/AuthPage';
import { ProfilePage } from '../pages/ProfilePage';
import { generateUniqueId } from '../../../shared/utils/helpers';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// =====================================================================
// PARCOURS 3.3 - Profil utilisateur
// =====================================================================
test.describe('Profil utilisateur', () => {

  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.login();
  });

  test('La page /profile affiche le nom et l\'email de l\'utilisateur', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();

    await profilePage.verifyNameIsDisplayed();
    await profilePage.verifyEmailIsDisplayed(process.env.TEST_EMAIL);
  });

  test('Modifier le nom met à jour le profil et la navbar', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();

    // Générer un nouveau nom unique
    const newName = `Test User ${generateUniqueId()}`;

    // Modifier le nom
    await profilePage.updateName(newName);
    await profilePage.saveProfile();

    // Vérifier le message de succès
    await profilePage.verifyProfileSaved();

    // Vérifier que le nouveau nom apparaît quelque part sur la page ou dans la navbar
    await profilePage.verifyNameInNavbar(newName);
  });

});
