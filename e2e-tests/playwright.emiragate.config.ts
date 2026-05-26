/**
 * playwright.emiragate.config.ts
 * --------------------------------
 * Configuration Playwright — Emiragate (BV Install)
 * URL : https://dev.bluevalorisinstall.com  (préfixe /en/)
 *
 * Projets :
 *   emiragate-public   → Tests sans auth (SC-01 form, SC-04 signup)
 *   emiragate-admin    → Tests admin authentifiés (SC-02, 03, 06-09, 10-11)
 *   emiragate-client   → Tests client authentifiés (SC-05)
 *   emiragate-regression → Régression complète (admin)
 *
 * Lancement :
 *   npx playwright test --config=playwright.emiragate.config.ts
 *   npm run test:emiragate
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'apps/emiragate/.env') });

export default defineConfig({
  testDir: './apps/emiragate/tests',

  globalSetup: './apps/emiragate/global-setup.ts',

  timeout: 90_000,

  expect: { timeout: 15_000 },

  fullyParallel: false,
  workers: 1,

  retries: 0,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-emiragate', open: 'never' }],
    ['json', { outputFile: 'playwright-report-emiragate/results.json' }],
  ],

  use: {
    baseURL: process.env.EMIRAGATE_BASE_URL ?? 'https://dev.bluevalorisinstall.com',
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    headless: true,
    locale: 'en-US',
  },

  projects: [
    // === Tests sans auth (formulaire login, signup) ===
    {
      name: 'emiragate-public',
      testMatch: [
        '**/e2e-01-admin-login.spec.ts',
        '**/e2e-04-signup.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },

    // === Tests admin authentifiés ===
    {
      name: 'emiragate-admin',
      testMatch: [
        '**/e2e-02-admin-dashboard.spec.ts',
        '**/e2e-03-conduit.spec.ts',
        '**/e2e-06-profile.spec.ts',
        '**/e2e-07-admin-users.spec.ts',
        '**/e2e-08-contacts.spec.ts',
        '**/e2e-09-analytics.spec.ts',
        '**/e2e-10-navigation.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/emiragate/auth/admin.json',
      },
    },

    // === Tests client authentifiés ===
    {
      name: 'emiragate-client',
      testMatch: ['**/e2e-05-client-login.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/emiragate/auth/client.json',
      },
    },

    // === Régression complète (admin) ===
    {
      name: 'emiragate-regression',
      testMatch: ['**/regression.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/emiragate/auth/admin.json',
      },
    },
  ],

  outputDir: 'test-results/',
});
