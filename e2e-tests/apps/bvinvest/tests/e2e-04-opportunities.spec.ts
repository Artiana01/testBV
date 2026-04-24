/**
 * apps/bvinvest/tests/e2e-04-opportunities.spec.ts
 * ---------------------------------------------------
 * SC-04 : Accès aux opportunités d'investissement (CRITIQUE)
 * SC-07 : Accès aux documents
 *
 * Préconditions : utilisateur connecté (storageState client)
 * Couvre : liste projets, détail deal, data room, téléchargement
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { OpportunitiesPage } from '../pages/OpportunitiesPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.BVINVEST_BASE_URL ?? 'https://dev.bluevalorisinvest.com';

test.describe('SC-04 — Opportunités d\'investissement (CRITIQUE)', () => {

  test('04.1 — La page opportunités est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const oppPage = new OpportunitiesPage(page);
    await oppPage.goto();
    await oppPage.verifyOpportunitiesLoaded();
  });

  test('04.2 — L\'espace privé est accessible et contient des projets', async ({ page }) => {
    test.setTimeout(30_000);
    const oppPage = new OpportunitiesPage(page);
    await oppPage.gotoPrivateSpace();
    await oppPage.verifyOpportunitiesLoaded();
    await oppPage.verifyOpportunityCardsPresent();
  });

  test('04.3 — Sélection d\'un projet affiche son détail', async ({ page }) => {
    test.setTimeout(30_000);
    const oppPage = new OpportunitiesPage(page);
    await oppPage.goto();
    await oppPage.clickFirstOpportunity();
    await oppPage.verifyOpportunityDetailLoaded();
  });

  test('04.4 — Accès conditionné selon le pack (data room)', async ({ page }) => {
    test.setTimeout(30_000);
    const oppPage = new OpportunitiesPage(page);
    await oppPage.goto();
    await oppPage.clickFirstOpportunity();
    await oppPage.verifyDataRoomOrDocuments();
  });

});

test.describe('SC-07 — Accès aux documents', () => {

  test('07.1 — Les documents sont visibles selon les droits', async ({ page }) => {
    test.setTimeout(30_000);
    const oppPage = new OpportunitiesPage(page);
    await oppPage.goto();
    await oppPage.clickFirstOpportunity();
    await oppPage.verifyDataRoomOrDocuments();
  });

  test('07.2 — Bouton de téléchargement présent si droits suffisants', async ({ page }) => {
    test.setTimeout(30_000);
    const oppPage = new OpportunitiesPage(page);
    await oppPage.goto();
    await oppPage.clickFirstOpportunity();
    await oppPage.verifyDownloadButtonPresent();
  });

});
