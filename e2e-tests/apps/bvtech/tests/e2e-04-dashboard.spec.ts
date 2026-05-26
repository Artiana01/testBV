/**
 * apps/bvtech/tests/e2e-04-dashboard.spec.ts
 * ----------------------------------------------
 * E2E 04 : Dashboard utilisateur (IMPORTANT)
 *
 * Utilise le compte client pré-créé (TEST_EMAIL / TEST_PASSWORD depuis .env).
 *
 * Étapes :
 *   1. Se connecter
 *   2. Accéder au dashboard
 *
 * Résultat attendu :
 *   ● KPIs visibles
 *   ● Section projets vides si aucun
 *   ● Graphique affiché
 *
 * Priorité : Secondaire
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Utilisation du compte pré-créé depuis .env
const DASH_EMAIL    = process.env.TEST_EMAIL    ?? 'e2e.client@bvtest.com';
const DASH_PASSWORD = process.env.TEST_PASSWORD ?? 'ClientTest123!';

test.describe('E2E 04 — Dashboard utilisateur (IMPORTANT)', () => {

  test('04.1 — Le dashboard se charge correctement après connexion', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // 1. Se connecter
    await loginPage.login(DASH_EMAIL, DASH_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);

    // 2. Accéder au dashboard
    await dashboardPage.goto();

    // Vérifier le chargement du dashboard
    await dashboardPage.verifyDashboardLoaded();
  });

  test('04.2 — Les KPIs sont visibles sur le dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Se connecter et aller au dashboard
    await loginPage.login(DASH_EMAIL, DASH_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);
    await dashboardPage.goto();

    // Vérifier les KPIs
    await dashboardPage.verifyKpisVisible();
  });

  test('04.3 — La section projets est visible (vide si aucun projet)', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Se connecter et aller au dashboard
    await loginPage.login(DASH_EMAIL, DASH_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);
    await dashboardPage.goto();

    // Vérifier la section projets
    await dashboardPage.verifyProjectsSectionVisible();
    // Vérifier le message "aucun projet" si applicable
    await dashboardPage.verifyEmptyProjectsMessage();
  });

  test('04.4 — Un graphique est affiché sur le dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Se connecter et aller au dashboard
    await loginPage.login(DASH_EMAIL, DASH_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);
    await dashboardPage.goto();

    // Vérifier la présence d'un graphique
    await dashboardPage.verifyChartVisible();
  });

  test('04.5 — Le titre/heading du dashboard est affiché', async ({ page }) => {
    test.setTimeout(60_000);
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login(DASH_EMAIL, DASH_PASSWORD);
    await loginPage.verifyLoginSuccess();
    await page.waitForTimeout(2000);
    await dashboardPage.goto();

    // Vérifier qu'il y a un contenu principal visible
    const mainContent = page.locator('main, [role="main"], [class*="dashboard"], [class*="content"]');
    await expect(mainContent.first()).toBeVisible({ timeout: 20_000 });
  });

});
