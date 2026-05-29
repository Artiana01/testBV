/**
 * playwright.bvtech.config.ts
 * ----------------------------
 * Configuration Playwright dédiée à l'application BV Tech.
 *
 * Différences vs la config globale :
 *  - globalSetup : connexion admin + client une seule fois avant les tests
 *  - testDir : uniquement les tests bvtech
 *  - baseURL : https://dev.bluevaloristech.com
 *  - rapport HTML séparé : playwright-report-bvtech/
 *
 * Lancement :
 *   npx playwright test --config=playwright.bvtech.config.ts
 *   npm run test:bvtech:ui   (via l'interface web)
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, 'apps/bvtech/.env') });

// client.json n'existe que si TEST_EMAIL est configuré — on le rend optionnel
const clientSessionPath = path.resolve(__dirname, 'apps/bvtech/auth/client.json');
const clientStorageState = fs.existsSync(clientSessionPath) ? clientSessionPath : undefined;

export default defineConfig({
  // Répertoire de tests BV Tech uniquement
  testDir: './apps/bvtech/tests',

  // Setup global : connexion et sauvegarde des sessions
  globalSetup: './apps/bvtech/global-setup.ts',

  // Timeout par test
  timeout: 90_000,

  // Timeout des assertions
  expect: { timeout: 15_000 },

  // Séquentiel (1 worker) pour ne pas déclencher le rate limiting
  fullyParallel: false,
  workers: 1,

  // Pas de retry automatique (les échecs doivent être investis)
  retries: 0,

  // Reporters
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-bvtech', open: 'never' }],
    ['json', { outputFile: 'playwright-report-bvtech/results.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://dev.bluevaloristech.com',
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    headless: true,
    locale: 'fr-FR',
  },

  projects: [
    // === Projet : Tests ne nécessitant PAS de connexion (E2E 01, forme login)
    {
      name: 'bvtech-public',
      testMatch: [
        '**/e2e-01-signup.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        // Pas de storageState → navigateur vierge
      },
    },

    // === Projet : Tests login flow (E2E 02, E2E 05) — connexion dans le test lui-même
    {
      name: 'bvtech-login-flow',
      testMatch: [
        '**/e2e-02-login-navigation.spec.ts',
        '**/e2e-05-admin-login.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        // Pas de storageState → test le vrai login
      },
    },

    // === Projet : Tests admin authentifiés (E2E 06-09, régression admin)
    {
      name: 'bvtech-admin',
      testMatch: [
        '**/e2e-06-admin-users.spec.ts',
        '**/e2e-07-admin-packs.spec.ts',
        '**/e2e-08-admin-payments.spec.ts',
        '**/e2e-09-admin-contacts.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        // Session admin pré-connectée → zéro login pendant les tests
        storageState: './apps/bvtech/auth/admin.json',
      },
    },

    // === Projet : Tests client authentifiés (E2E 03, E2E 04)
    {
      name: 'bvtech-client',
      testMatch: [
        '**/e2e-03-profile.spec.ts',
        '**/e2e-04-dashboard.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        // Session client pré-connectée si disponible, sinon login dans le test
        ...(clientStorageState ? { storageState: clientStorageState } : {}),
      },
    },

    // === Projet : Régression complète
    {
      name: 'bvtech-regression',
      testMatch: ['**/regression.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './apps/bvtech/auth/admin.json',
      },
    },
  ],

  outputDir: 'test-results/',
});
