/**
 * playwright.creerailleurs.config.ts
 * Configuration Playwright — Créer Ailleurs
 *
 * Lancement :
 *   npx playwright test --config=e2e-tests/playwright.creerailleurs.config.ts
 *   npm run test:creerailleurs
 */
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'apps/creerailleurs/.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env.BASE_URL ?? 'https://www.creerailleurs.com';

export default defineConfig({
  testDir: './apps/creerailleurs/tests',

  timeout: 90_000,
  expect: { timeout: 10_000 },

  fullyParallel: false,
  retries: 1,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-creerailleurs', open: 'never' }],
    ['json', { outputFile: 'test-results/results-creerailleurs.json' }],
  ],

  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    headless: true,
    locale: 'fr-FR',
  },

  projects: [
    // Tests publics (pas de connexion requise)
    {
      name: 'creerailleurs-public',
      testMatch: [
        '**/e2e-01-navigation.spec.ts',
        '**/e2e-02-cta-redirections.spec.ts',
        '**/e2e-03-signup.spec.ts',
        '**/e2e-04-login.spec.ts',
        '**/e2e-06-achat-sans-compte.spec.ts',
        '**/e2e-09-multilingue.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Tests nécessitant une session client
    {
      name: 'creerailleurs-client',
      testMatch: [
        '**/e2e-05-tunnel-vente.spec.ts',
        '**/e2e-07-dashboard-user.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/creerailleurs/auth/client.json',
      },
    },

    // Tests admin
    {
      name: 'creerailleurs-admin',
      testMatch: [
        '**/e2e-08-admin.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/creerailleurs/auth/admin.json',
      },
    },
  ],

  globalSetup: require.resolve('./apps/creerailleurs/global-setup'),

  outputDir: 'test-results/',
  webServer: undefined,
});
