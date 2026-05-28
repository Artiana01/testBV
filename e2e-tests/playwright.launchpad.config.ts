/**
 * playwright.launchpad.config.ts
 * --------------------------------
 * Configuration Playwright dédiée à l'application Launchpad BV TECH.
 *
 * Lancement :
 *   npx playwright test --config=playwright.launchpad.config.ts
 *   npx playwright test --config=playwright.launchpad.config.ts --ui
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'apps/launchpad/.env') });

export default defineConfig({
  testDir: './apps/launchpad/tests',

  globalSetup: './apps/launchpad/global-setup.ts',

  timeout: 90_000,

  expect: { timeout: 15_000 },

  fullyParallel: false,
  workers: 1,

  retries: 0,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-launchpad', open: 'never' }],
    ['json', { outputFile: 'playwright-report-launchpad/results.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://staging.bluevaloristech.com',
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    headless: true,
    locale: 'fr-FR',
  },

  projects: [
    // === Tests publics (sans connexion) : Activation + Inscription
    {
      name: 'launchpad-public',
      testMatch: [
        '**/e2e-01-signup-activation.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // === Tests de connexion (login dans le test lui-même)
    {
      name: 'launchpad-login-flow',
      testMatch: [
        '**/e2e-02-login-dashboard.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // === Tests client authentifiés (session pré-connectée)
    {
      name: 'launchpad-client',
      testMatch: [
        '**/e2e-03-pack-purchase.spec.ts',
        '**/e2e-04-profile.spec.ts',
        '**/e2e-05-security.spec.ts',
        '**/e2e-06-notifications.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/launchpad/auth/client.json',
      },
    },

    // === Tests messagerie (multi-sessions client + admin)
    {
      name: 'launchpad-messaging',
      testMatch: [
        '**/e2e-07-messaging.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        // Pas de storageState — les tests gèrent eux-mêmes les connexions alternées
      },
    },

    // === Tests admin authentifiés
    {
      name: 'launchpad-admin',
      testMatch: [
        '**/e2e-06-notifications.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/launchpad/auth/admin.json',
      },
    },

    // === Régression complète (admin pré-connecté)
    {
      name: 'launchpad-regression',
      testMatch: ['**/regression.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/launchpad/auth/admin.json',
      },
    },
  ],

  outputDir: 'test-results/',
});
