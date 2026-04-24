/**
 * playwright.bvbusiness.session.config.ts
 * -----------------------------------------
 * Config minimale pour initialiser la session admin BV Business.
 * Pas de globalSetup — ouvre directement le navigateur en mode visible.
 *
 * Usage : npm run session:bvbusiness
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'apps/bvbusiness/.env') });

export default defineConfig({
  testDir: './apps/bvbusiness/tests',
  testMatch: ['**/session-setup.spec.ts'],
  timeout: 5 * 60 * 1000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://staging.bluevalorisbusiness.com',
    headless: false,
    locale: 'fr-FR',
  },
  projects: [
    {
      name: 'session-setup',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
