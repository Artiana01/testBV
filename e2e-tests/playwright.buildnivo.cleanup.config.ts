/**
 * playwright.buildnivo.cleanup.config.ts
 * ----------------------------------------
 * Config dédiée au nettoyage des chantiers de test (apps/buildnivo/maintenance/) — hors suite de
 * recette, pas de global-setup (openModuleAs se reconnecte tout seul si la session a expiré).
 */
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'apps/buildnivo/.env'), override: true });

export default defineConfig({
  testDir: './apps/buildnivo/maintenance',
  timeout: 30 * 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.BASE_URL ?? 'https://dev.buildnivo.com',
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
    locale: 'fr-FR',
    headless: true,
  },
  outputDir: 'test-results-cleanup/',
});
