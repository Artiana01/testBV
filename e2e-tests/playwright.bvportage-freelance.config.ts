/**
 * playwright.bvportage-freelance.config.ts
 * Configuration Playwright spécifique pour BV Portage Freelance
 */
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger d'abord le .env spécifique BV Portage Freelance (priorité sur le .env racine)
dotenv.config({ path: path.resolve(__dirname, 'apps/bvportage-freelance/.env'), override: true });
// Fallback sur le .env racine si une variable manque
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './apps/bvportage-freelance/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,

  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-bvportage-freelance', open: 'never' }],
    ['json', { outputFile: 'test-results/results-bvportage-freelance.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://dev.bluevalorisportage.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  globalSetup: require.resolve('./apps/bvportage-freelance/fixtures/global-setup'),

  webServer: undefined,
});
