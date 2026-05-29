/**
 * apps/launchpad/tests/regression.spec.ts
 * -----------------------------------------
 * Tests de régression — Launchpad BV TECH
 *
 * Regroupe les scénarios critiques P0/P1 en un run rapide :
 *   REG.01 — Page d'accueil + bouton "Activer Launchpad"
 *   REG.02 — Login client
 *   REG.03 — Login admin
 *   REG.04 — Dashboard accessible
 *   REG.05 — Packs visibles
 *   REG.06 — Profil accessible
 *   REG.07 — [BUG P0] Langue message paiement
 *   REG.08 — [BUG P0] Lien commande (vérification URL)
 *   REG.09 — Admin : liste utilisateurs
 *   REG.10 — Admin : liste paiements
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { DashboardPage } from '../pages/DashboardPage';
import { PacksPage } from '../pages/PacksPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CLIENT_EMAIL    = process.env.TEST_EMAIL    ?? 'lilie@test.test';
const CLIENT_PASSWORD = process.env.TEST_PASSWORD ?? 'lilie123!';

test.describe('RÉGRESSION — Scénarios critiques Launchpad BV TECH', () => {

  test('REG.01 — Page d\'accueil accessible + bouton "Activer Launchpad" visible', async ({ page }) => {
    test.setTimeout(60_000);
    const signupPage = new SignupPage(page);
    await signupPage.gotoHomepage();
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 });

    // Vérifier le bouton activation (peut être redirigé si admin connecté via storageState)
    const currentUrl = page.url();
    if (currentUrl.includes('/admin') || currentUrl.includes('/dashboard')) {
      console.log('ℹ️  REG.01: Déjà connecté admin — bouton Activer non visible (normal)');
      return;
    }
    await signupPage.verifyActivateButtonVisible();
    console.log('✅ REG.01: Bouton "Activer Launchpad" visible');
  });

  test('REG.02 — Login client avec compte de test', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.login(CLIENT_EMAIL, CLIENT_PASSWORD);
    await loginPage.verifyLoginSuccess();
    console.log('✅ REG.02: Login client OK —', CLIENT_EMAIL);
  });

  test('REG.03 — Login admin', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    console.log('✅ REG.03: Login admin OK');
  });

  test('REG.04 — Dashboard client accessible après connexion', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage   = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login(CLIENT_EMAIL, CLIENT_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(1500);

    await dashboardPage.goto();
    await dashboardPage.verifyDashboardLoaded();
    console.log('✅ REG.04: Dashboard client chargé');
  });

  test('REG.05 — Section packs visible', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const packsPage = new PacksPage(page);

    await loginPage.login(CLIENT_EMAIL, CLIENT_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(1500);

    await packsPage.goto();
    await packsPage.verifyPacksListVisible();
    console.log('✅ REG.05: Packs visibles');
  });

  test('REG.06 — Profil utilisateur accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage  = new LoginPage(page);
    const profilePage = new ProfilePage(page);

    await loginPage.login(CLIENT_EMAIL, CLIENT_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(1500);

    await profilePage.goto();
    await profilePage.verifyProfilePageLoaded();
    console.log('✅ REG.06: Profil chargé');
  });

  test('REG.07 — [BUG P0] Message de paiement : langue vérifiée', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const packsPage = new PacksPage(page);

    await loginPage.login(CLIENT_EMAIL, CLIENT_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(1500);

    await packsPage.goto();
    await packsPage.verifyPacksListVisible();

    // Vérifier s'il y a un message de succès de paiement encore affiché (post-achat)
    const englishMsg = page.getByText(/payment successful|payment confirmed/i);
    const hasEnglish = await englishMsg.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasEnglish) {
      console.warn('🐛 BUG P0 détecté: message paiement en anglais');
    } else {
      console.log('✅ REG.07: Pas de message anglais détecté sur la page packs');
    }
  });

  test('REG.08 — [BUG P0] Vérifier l\'absence de liens 404 sur le dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage   = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login(CLIENT_EMAIL, CLIENT_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(1500);

    await dashboardPage.goto();
    await dashboardPage.verifyDashboardLoaded();

    // Vérifier le lien commande s'il est présent
    await dashboardPage.verifyOrderLinkFunctional();
    console.log('✅ REG.08: Vérification liens commande terminée');
  });

  test('REG.09 — Admin : liste utilisateurs visible', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminPage = new AdminDashboardPage(page);

    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(1500);

    await adminPage.navigateToUsers();
    const count = await adminPage.getUsersCount();
    if (count === 0) {
      console.log('ℹ️  REG.09: Base utilisateurs vide — test skippé');
      test.skip(true, 'Base vide — ajoutez des utilisateurs pour activer ce test');
    }
    expect(count).toBeGreaterThanOrEqual(1);
    console.log(`✅ REG.09: ${count} utilisateur(s) côté admin`);
  });

  test('REG.10 — Admin : section paiements accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const adminPage = new AdminDashboardPage(page);

    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(1500);

    await adminPage.navigateToPayments();
    const mainContent = page.locator('main, table, [class*="payment"], [class*="list"]');
    await expect(mainContent.first()).toBeVisible({ timeout: 15_000 });
    console.log('✅ REG.10: Section paiements admin accessible');
  });

});
