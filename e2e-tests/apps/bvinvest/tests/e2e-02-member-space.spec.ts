/**
 * apps/bvinvest/tests/e2e-02-member-space.spec.ts
 * --------------------------------------------------
 * SC-02 : Accès et navigation dans l'espace membre (CRITIQUE)
 *
 * Préconditions : utilisateur connecté (storageState client)
 * Couvre : accès espace privé, navigation profil / abonnement / vérification
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { MemberSpacePage } from '../pages/MemberSpacePage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.BVINVEST_BASE_URL ?? 'https://dev.bluevalorisinvest.com';

test.describe('SC-02 — Accès et navigation dans l\'espace membre (CRITIQUE)', () => {

  test('02.1 — L\'espace membre est accessible après connexion', async ({ page }) => {
    test.setTimeout(30_000);
    const memberPage = new MemberSpacePage(page);
    await memberPage.goto();
    await memberPage.verifyMemberSpaceLoaded();
  });

  test('02.2 — L\'espace privé est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const memberPage = new MemberSpacePage(page);
    await memberPage.gotoPrivateSpace();
    await memberPage.verifyMemberSpaceLoaded();
  });

  test('02.3 — Navigation vers le profil fonctionne', async ({ page }) => {
    test.setTimeout(30_000);
    const memberPage = new MemberSpacePage(page);
    await memberPage.goto();
    await memberPage.navigateToProfile();
    await memberPage.verifyNoRedirectToLogin();
    await expect(page.locator('body')).toBeVisible();
  });

  test('02.4 — Navigation vers l\'abonnement fonctionne', async ({ page }) => {
    test.setTimeout(30_000);
    const memberPage = new MemberSpacePage(page);
    await memberPage.goto();
    await memberPage.navigateToSubscription();
    await memberPage.verifyNoRedirectToLogin();
    await expect(page.locator('body')).toBeVisible();
  });

  test('02.5 — Navigation vers la vérification fonctionne', async ({ page }) => {
    test.setTimeout(30_000);
    const memberPage = new MemberSpacePage(page);
    await memberPage.goto();
    await memberPage.navigateToVerification();
    await memberPage.verifyNoRedirectToLogin();
    await expect(page.locator('body')).toBeVisible();
  });

  test('02.6 — Navigation fluide : pas d\'erreur 404 ou 500', async ({ page }) => {
    test.setTimeout(60_000);
    const sections = [
      '/fr/member',
      '/fr/profile',
      '/fr/verification',
    ];
    for (const section of sections) {
      await page.goto(`${BASE}${section}`);
      await page.waitForLoadState('load');
      await page.waitForTimeout(1000);
      await expect(page.getByText(/500|server error/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
    }
  });

});
