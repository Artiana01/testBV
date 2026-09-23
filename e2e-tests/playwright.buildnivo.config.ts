/**
 * playwright.buildnivo.config.ts
 * --------------------------------
 * Configuration Playwright dédiée à l'application BuildNivo.
 * Basée sur le cahier de recette BuildNivo (cahier-recette-buildnivo.pdf) :
 * 17 sections fonctionnelles couvertes par apps/buildnivo/tests/e2e-*.spec.ts.
 *
 * Différences vs la config globale :
 *  - globalSetup : connexion des 13 comptes de démonstration (un par rôle
 *    métier), sessions sauvegardées dans apps/buildnivo/auth/
 *  - testDir : uniquement les tests buildnivo
 *  - baseURL : https://dev.buildnivo.com
 *  - rapport HTML séparé : playwright-report-buildnivo/
 *
 * Lancement :
 *   npx playwright test --config=playwright.buildnivo.config.ts
 *   npm run test:buildnivo
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { getRoles } from './apps/buildnivo/roles';

// override:true — BASE_URL est un nom de variable partagé par toutes les apps du repo
// (bvtech, bvbusiness...). Si une session shell a déjà exporté BASE_URL pour une autre
// app (ex: tests bvtech lancés plus tôt dans le même terminal), dotenv ne l'écrase pas
// par défaut : sans override, BuildNivo hériterait silencieusement de la mauvaise URL.
dotenv.config({ path: path.resolve(__dirname, 'apps/buildnivo/.env'), override: true });

const AUTH_DIR = path.resolve(__dirname, 'apps/buildnivo/auth');

// Sessions optionnelles : le global-setup peut échouer à connecter un rôle
// (compte non provisionné en environnement de recette) sans bloquer les autres.
function storageStateFor(session: string): string | undefined {
  const p = path.join(AUTH_DIR, session);
  return fs.existsSync(p) ? p : undefined;
}

const direction         = storageStateFor('direction.json');
const intervenantSimple = storageStateFor('intervenant-simple.json');

export default defineConfig({
  testDir: './apps/buildnivo/tests',

  globalSetup: './apps/buildnivo/global-setup.ts',

  // 120s : certaines pages (Achats...) mettent jusqu'à ~40s à charger leurs données sous
  // charge — 90s laissait trop peu de marge à un test une fois la navigation comptée.
  timeout: 120_000,
  expect: { timeout: 15_000 },

  // Séquentiel pour ne pas déclencher le throttle applicatif (AUTH-06, MSG-04)
  fullyParallel: false,
  workers: 1,
  retries: 0,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-buildnivo', open: 'never' }],
    ['json', { outputFile: 'playwright-report-buildnivo/results.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://dev.buildnivo.com',
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    headless: true,
    locale: 'fr-FR',
  },

  projects: [
    // === Section 01 (Auth) + smoke multi-rôles — pas de session préalable
    {
      name: 'buildnivo-public',
      testMatch: [
        '**/e2e-01-auth.spec.ts',
        '**/e2e-02-roles-login.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // === Sections 03-15 — comptes authentifiés (Direction : accès le plus large)
    {
      name: 'buildnivo-direction',
      testMatch: [
        '**/e2e-03-chantiers.spec.ts',
        '**/e2e-04-pointage.spec.ts',
        '**/e2e-05-taches.spec.ts',
        '**/e2e-06-journal.spec.ts',
        '**/e2e-07-photos.spec.ts',
        '**/e2e-08-reserves.spec.ts',
        '**/e2e-09-visas.spec.ts',
        '**/e2e-10-reunions.spec.ts',
        '**/e2e-11-achats.spec.ts',
        '**/e2e-12-finances.spec.ts',
        '**/e2e-13-documents.spec.ts',
        '**/e2e-14-messages.spec.ts',
        '**/e2e-15-notifications.spec.ts',
        '**/e2e-18-carnet-entretien.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        ...(direction ? { storageState: direction } : {}),
      },
    },

    // === Section 02 (RBAC) — compte à droits restreints pour vérifier les refus d'accès
    {
      name: 'buildnivo-rbac',
      testMatch: ['**/e2e-16-rbac.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        ...(intervenantSimple ? { storageState: intervenantSimple } : {}),
      },
    },

    // === Billing (Stripe Customer Portal) — compte "Propriétaire" (tenant-owner), seul rôle
    // avec le bouton "Gérer mon abonnement". Chaque test gère sa propre session via
    // browser.newContext({ storageState }) (pas de storageState au niveau du projet) car ce
    // n'est ni "public" (comptes 01/02) ni Direction/Intervenant simple (autres projets).
    {
      name: 'buildnivo-billing',
      testMatch: ['**/e2e-17-billing.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // === Régression complète
    {
      name: 'buildnivo-regression',
      testMatch: ['**/regression.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        ...(direction ? { storageState: direction } : {}),
      },
    },
  ],

  outputDir: 'test-results/',
});
