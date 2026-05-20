/**
 * playwright.bvportage.config.ts
 * Configuration Playwright spécifique pour BV Portage (Agence)
 */
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger d'abord le .env spécifique BV Portage (priorité sur le .env racine)
dotenv.config({ path: path.resolve(__dirname, 'apps/bvportage/.env'), override: true });
// Fallback sur le .env racine si une variable manque
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './apps/bvportage/tests',
  
  timeout: 120_000,
  
  expect: {
    timeout: 10_000,
  },

  fullyParallel: false,
  retries: 0,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-bvportage', open: 'never' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://dev.bluevalorisportage.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  globalSetup: require.resolve('./apps/bvportage/global-setup'),

  webServer: undefined,
});
