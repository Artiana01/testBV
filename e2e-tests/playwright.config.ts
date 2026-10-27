/**
 * playwright.config.ts
 * ---------------------
 * Fichier de configuration central pour tous les tests Playwright du projet.
 * Ce fichier configure le navigateur, les timeouts, les reporters, les captures d'écran
 * et les vidéos. Il est partagé par TOUTES les applications testées dans ce projet.
 *
 * Pour ajouter une nouvelle application, il suffit d'ajouter un dossier dans apps/
 * et de créer un fichier .env correspondant.
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Chargement des variables d'environnement depuis le fichier .env à la racine
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  // Dossier racine où Playwright cherche les fichiers de test
  testDir: './apps',

  // Délai maximum pour chaque test (60 secondes - adapté pour les serveurs distants)
  timeout: 60_000,

  // Délai maximum pour les assertions (ex : expect(...).toBeVisible())
  expect: {
    timeout: 5_000,
  },

  // Ne pas lancer les tests en parallèle (plus stable pour les tests qui partagent un état)
  fullyParallel: false,

  // Arrêter après le premier échec en CI (optionnel, décommenter si besoin)
  // forbidOnly: !!process.env.CI,

  // Nombre de tentatives en cas d'échec (0 = pas de réessai)
  retries: 0,

  // Nombre de workers parallèles (1 = séquentiel, stable pour débuter)
  workers: 1,

  // Configuration des reporters (comment Playwright affiche les résultats)
  reporter: [
    // Affichage dans le terminal
    ['list'],
    // Rapport HTML complet avec captures d'écran et vidéos
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  // Configuration globale partagée par tous les projets
  use: {
    // URL de base lue depuis le fichier .env
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Capture d'écran automatique en cas d'échec uniquement
    screenshot: 'only-on-failure',

    // Vidéo enregistrée en cas d'échec uniquement
    video: 'retain-on-failure',

    // Trace complète en cas d'échec (utile pour le débogage)
    trace: 'retain-on-failure',

    // Navigateur visible (false = headless, plus rapide)
    headless: true,
  },

  // Définition des navigateurs à utiliser
  projects: [
    {
      // Navigateur principal : Chromium (Chrome)
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Décommenter pour tester sur Firefox :
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // Décommenter pour tester sur Safari (macOS uniquement) :
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Décommenter pour tester sur mobile :
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Dossier de sortie pour les captures d'écran, vidéos et traces
  outputDir: 'test-results/',
});
