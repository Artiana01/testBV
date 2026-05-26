/**
 * SC-05 : Connexion client (CRITIQUE)
 *
 * Préconditions : compte client existant
 * Couvre : connexion client, accès dashboard client, KPIs
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { ClientDashboardPage } from '../pages/ClientDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE         = process.env.EMIRAGATE_BASE_URL          ?? 'https://dev.bluevalorisinstall.com';
const CLIENT_EMAIL = process.env.EMIRAGATE_CLIENT_EMAIL      ?? '';
const CLIENT_PASS  = process.env.EMIRAGATE_CLIENT_PASSWORD   ?? '';

test.describe('SC-05 — Connexion client (CRITIQUE)', () => {

  test('05.1 — Connexion réussie avec identifiants client', async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!CLIENT_EMAIL, 'EMIRAGATE_CLIENT_EMAIL non configuré dans .env');
    const loginPage = new LoginPage(page);
    await loginPage.login(CLIENT_EMAIL, CLIENT_PASS);
    await loginPage.verifyLoginSuccess();
    console.log(`Connexion client réussie : ${CLIENT_EMAIL}`);
  });

  test('05.2 — Accès au dashboard client après connexion', async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!CLIENT_EMAIL, 'EMIRAGATE_CLIENT_EMAIL non configuré dans .env');
    const loginPage = new LoginPage(page);
    await loginPage.login(CLIENT_EMAIL, CLIENT_PASS);
    await loginPage.verifyLoginSuccess();
    const dashboard = new ClientDashboardPage(page);
    await dashboard.verifyClientDashboardLoaded();
  });

  test('05.3 — Les KPIs client sont affichés', async ({ page }) => {
    test.setTimeout(60_000);
    // storageState client déjà appliqué par le projet Playwright
    const dashboard = new ClientDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyClientDashboardLoaded();
    await dashboard.verifyKpisVisible();
  });

  test('05.4 — Le dashboard client ne redirige pas vers login (session)', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new ClientDashboardPage(page);
    await dashboard.goto();
    await expect(page).not.toHaveURL(/\/login|\/signin/, { timeout: 20_000 });
  });

});
