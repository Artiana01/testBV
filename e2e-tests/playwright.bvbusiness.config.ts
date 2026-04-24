/**
 * playwright.bvbusiness.config.ts
 * ---------------------------------
 * Configuration Playwright dédiée à BV Business.
 *
 * Différences vs la config globale :
 *  - globalSetup : connexion admin une seule fois avant les tests
 *  - testDir : uniquement les tests bvbusiness
 *  - baseURL : https://staging.bluevalorisbusiness.com
 *  - rapport HTML séparé : playwright-report-bvbusiness/
 *
 * Lancement :
 *   npx playwright test --config=playwright.bvbusiness.config.ts
 *   npm run test:bvbusiness
 *
 * Projets :
 *   bvbusiness-public      → Tests sans auth (SC-01 signup)
 *   bvbusiness-login-flow  → Tests du flux login (SC-02 login)
 *   bvbusiness-admin       → Tests admin authentifiés (SC-03…09)
 *   bvbusiness-regression  → Suite de régression complète
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'apps/bvbusiness/.env') });

export default defineConfig({
  testDir: './apps/bvbusiness/tests',

  globalSetup: './apps/bvbusiness/global-setup.ts',

  timeout: 60_000,

  expect: { timeout: 10_000 },

  // Séquentiel pour éviter le rate limiting sur l'environnement staging
  fullyParallel: false,
  workers: 1,

  retries: 0,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-bvbusiness', open: 'never' }],
    ['json', { outputFile: 'playwright-report-bvbusiness/results.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://staging.bluevalorisbusiness.com',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    headless: true,
    locale: 'fr-FR',
  },

  projects: [
    // === Projet : Inscription (pas d'auth) ===
    {
      name: 'bvbusiness-public',
      testMatch: ['**/e2e-01-signup.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // === Projet : Flux login — storageState actif pour les tests dashboard (02.7-02.10)
    // Les tests formulaire (02.1-02.6) écrasent le storageState via test.use() dans le fichier
    {
      name: 'bvbusiness-login-flow',
      testMatch: ['**/e2e-02-login-dashboard.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/bvbusiness/auth/admin.json',
      },
    },

    // === Projet : Packages publics (pas d'auth obligatoire) ===
    {
      name: 'bvbusiness-packages-public',
      testMatch: ['**/e2e-03-packages.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        // storageState optionnel : les packages peuvent être consultés sans login
        storageState: './apps/bvbusiness/auth/admin.json',
      },
    },

    // === Projet : Tests admin authentifiés ===
    {
      name: 'bvbusiness-admin',
      testMatch: [
        '**/e2e-04-navigation.spec.ts',
        '**/e2e-05-admin-content.spec.ts',
        '**/e2e-06-admin-media.spec.ts',
        '**/e2e-07-regional-content.spec.ts',
        '**/e2e-08-admin-users.spec.ts',
        '**/e2e-09-admin-payments.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/bvbusiness/auth/admin.json',
      },
    },

    // === Projet : Régression complète ===
    {
      name: 'bvbusiness-regression',
      testMatch: ['**/regression.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/bvbusiness/auth/admin.json',
      },
    },
  ],

  outputDir: 'test-results/',
});
