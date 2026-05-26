/**
 * SC-03 : Gestion des Leads — Conduit (CRITIQUE)
 *
 * Préconditions : admin connecté (storageState admin)
 * Couvre : accès menu Conduit, liste leads, actions voir/supprimer
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ConduitPage } from '../pages/ConduitPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('SC-03 — Gestion des Leads / Conduit (CRITIQUE)', () => {

  test('03.1 — La page Conduit est accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const conduit = new ConduitPage(page);
    await conduit.goto();
    await conduit.verifyConduitPageLoaded();
  });

  test('03.2 — Accès via le menu latéral "Conduit"', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToConduit();
    const conduit = new ConduitPage(page);
    await conduit.verifyConduitPageLoaded();
  });

  test('03.3 — La liste des leads est affichée', async ({ page }) => {
    test.setTimeout(60_000);
    const conduit = new ConduitPage(page);
    await conduit.goto();
    await conduit.verifyLeadListVisible();
  });

  test('03.4 — L\'action Voir est disponible', async ({ page }) => {
    test.setTimeout(60_000);
    const conduit = new ConduitPage(page);
    await conduit.goto();
    await conduit.verifyViewActionAvailable();
  });

  test('03.5 — L\'action Supprimer est disponible', async ({ page }) => {
    test.setTimeout(60_000);
    const conduit = new ConduitPage(page);
    await conduit.goto();
    await conduit.verifyDeleteActionAvailable();
  });

  test('03.6 — Aucune valeur "undefined" dans la liste des leads', async ({ page }) => {
    test.setTimeout(60_000);
    const conduit = new ConduitPage(page);
    await conduit.goto();
    await conduit.verifyNoUndefinedValues();
  });

});
