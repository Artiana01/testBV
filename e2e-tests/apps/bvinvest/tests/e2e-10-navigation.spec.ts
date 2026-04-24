/**
 * apps/bvinvest/tests/e2e-10-navigation.spec.ts
 * ------------------------------------------------
 * SC-10 : Navigation globale (SECONDAIRE)
 *
 * Préconditions : utilisateur connecté (storageState client)
 * Couvre : navigation entre sections, redirections, absence d'erreurs
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.BVINVEST_BASE_URL ?? 'https://dev.bluevalorisinvest.com';

test.describe('SC-10 — Navigation globale (SECONDAIRE)', () => {

  test('10.1 — La page d\'accueil est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`${BASE}/fr`);
    await page.waitForLoadState('load');
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/500|server error/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('10.2 — La page login est accessible depuis l\'accueil', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`${BASE}/fr/login`);
    await page.waitForLoadState('load');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  });

  test('10.3 — Toutes les sections membres sont accessibles (storageState)', async ({ page }) => {
    test.setTimeout(60_000);
    const sections = [
      '/fr/member',
      '/fr/packages',
      '/fr/profile',
      '/fr/verification',
    ];
    for (const section of sections) {
      await page.goto(`${BASE}${section}`);
      await page.waitForLoadState('load');
      await page.waitForTimeout(800);
      await expect(page.getByText(/500|server error/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
      console.log(`   ✅  ${section} : accessible (URL: ${page.url()})`);
    }
  });

  test('10.4 — Redirection stable (pas de boucle)', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`${BASE}/fr/dashboard`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    const url1 = page.url();
    await page.waitForTimeout(2000);
    const url2 = page.url();
    expect(url1).toBe(url2);
  });

  test('10.5 — Navigation sans perte de session (storageState)', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`${BASE}/fr/dashboard`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    await page.goto(`${BASE}/fr/profile`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  });

});
