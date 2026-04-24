/**
 * playwright.bvinvest.config.ts
 * --------------------------------
 * Configuration Playwright dédiée à BV Invest.
 *
 * Projets :
 *   bvinvest-public      → Tests sans auth (SC-01 login form)
 *   bvinvest-login-flow  → Tests du flux login
 *   bvinvest-client      → Tests membre authentifiés (SC-02 à SC-07, SC-10)
 *   bvinvest-admin       → Tests admin authentifiés (SC-08, SC-09, SC-11)
 *   bvinvest-regression  → Suite de régression complète
 *
 * Lancement :
 *   npx playwright test --config=playwright.bvinvest.config.ts
 *   npm run test:bvinvest
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'apps/bvinvest/.env') });

export default defineConfig({
  testDir: './apps/bvinvest/tests',

  globalSetup: './apps/bvinvest/global-setup.ts',

  timeout: 60_000,

  expect: { timeout: 10_000 },

  fullyParallel: false,
  workers: 1,

  retries: 0,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-bvinvest', open: 'never' }],
    ['json', { outputFile: 'playwright-report-bvinvest/results.json' }],
  ],

  use: {
    baseURL: process.env.BVINVEST_BASE_URL ?? 'https://dev.bluevalorisinvest.com',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    headless: true,
    locale: 'fr-FR',
  },

  projects: [
    // === Tests sans auth (formulaire login, page publique) ===
    {
      name: 'bvinvest-public',
      testMatch: [
        '**/e2e-01-login.spec.ts',
        '**/e2e-10-navigation.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // === Tests client authentifiés ===
    {
      name: 'bvinvest-client',
      testMatch: [
        '**/e2e-02-member-space.spec.ts',
        '**/e2e-03-packages.spec.ts',
        '**/e2e-04-opportunities.spec.ts',
        '**/e2e-05-kyc-pipeline.spec.ts',
        '**/e2e-06-profile.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/bvinvest/auth/client.json',
      },
    },

    // === Tests admin authentifiés ===
    {
      name: 'bvinvest-admin',
      testMatch: [
        '**/e2e-08-admin-access.spec.ts',
        '**/e2e-09-admin-dashboard.spec.ts',
        '**/e2e-11-analytics.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/bvinvest/auth/admin.json',
      },
    },

    // === Régression complète (admin) ===
    {
      name: 'bvinvest-regression',
      testMatch: ['**/regression.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/bvinvest/auth/admin.json',
      },
    },
  ],

  outputDir: 'test-results/',
});
