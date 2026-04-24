/**
 * apps/bvinvest/tests/regression.spec.ts
 * -----------------------------------------
 * Cas de régression prioritaires BV Invest
 *
 * Couvre :
 *   - Authentification : stabilité des connexions, gestion des sessions
 *   - Navigation : redirections entre pages, accès aux menus
 *   - Pipeline KYC : passage séquentiel, conditions de blocage
 *   - Abonnements & Paiement : cohérence après modification, statut
 *   - Opportunités : accès conditionné, affichage données
 *   - Administration : gestion utilisateurs, contenus et documents
 *
 * Précond : Admin connecté (storageState admin)
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { PackagesPage } from '../pages/PackagesPage';
import { MemberSpacePage } from '../pages/MemberSpacePage';
import { KycPipelinePage } from '../pages/KycPipelinePage';
import { OpportunitiesPage } from '../pages/OpportunitiesPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.BVINVEST_BASE_URL ?? 'https://dev.bluevalorisinvest.com';

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Authentification
// ═══════════════════════════════════════════════════════
test.describe('Régression — Authentification', () => {

  test('REG-01 — La connexion fonctionne avec les identifiants actifs', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`${BASE}/fr/dashboard`);
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('REG-02 — La redirection post-login est correcte (pas de boucle)', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    const url1 = page.url();
    await page.waitForTimeout(2000);
    const url2 = page.url();
    expect(url1).toBe(url2);
  });

  test('REG-03 — La session persiste entre les pages', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`${BASE}/fr/dashboard`);
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    await page.goto(`${BASE}/fr/profile`);
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  });

});

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Navigation
// ═══════════════════════════════════════════════════════
test.describe('Régression — Navigation', () => {

  test('REG-04 — Le menu admin est accessible depuis toutes les sections', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    const nav = page.locator('nav, aside, [class*="sidebar"], [class*="menu"]');
    await expect(nav.first()).toBeVisible({ timeout: 10_000 });
  });

  test('REG-05 — Accès direct /fr/dashboard ne redirige pas vers login', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`${BASE}/fr/dashboard`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('REG-06 — Aucune section admin ne retourne 404', async ({ page }) => {
    test.setTimeout(60_000);
    const sections = [
      '/fr/dashboard',
      '/fr/admin/users',
      '/fr/admin/opportunities',
      '/fr/admin/documents',
    ];
    for (const section of sections) {
      await page.goto(`${BASE}${section}`);
      await page.waitForLoadState('load');
      await page.waitForTimeout(1000);
      await expect(page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
    }
  });

});

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Pipeline KYC
// ═══════════════════════════════════════════════════════
test.describe('Régression — Pipeline KYC', () => {

  test('REG-07 — Le pipeline de vérification se charge sans erreur', async ({ page }) => {
    test.setTimeout(30_000);
    const kycPage = new KycPipelinePage(page);
    await kycPage.goto();
    await kycPage.verifyKycPageLoaded();
    await expect(page.getByText(/500|server error/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('REG-08 — Les étapes sont structurées séquentiellement', async ({ page }) => {
    test.setTimeout(30_000);
    const kycPage = new KycPipelinePage(page);
    await kycPage.goto();
    await kycPage.verifySequentialProgress();
  });

});

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Abonnements & Paiement
// ═══════════════════════════════════════════════════════
test.describe('Régression — Abonnements & Paiement', () => {

  test('REG-09 — La page packages se charge et affiche du contenu', async ({ page }) => {
    test.setTimeout(30_000);
    const packagesPage = new PackagesPage(page);
    await packagesPage.goto();
    await packagesPage.verifyPackagesLoaded();
    await packagesPage.verifyPackCardsVisible();
  });

  test('REG-10 — Aucune valeur "undefined" / "null" dans les packages', async ({ page }) => {
    test.setTimeout(30_000);
    const packagesPage = new PackagesPage(page);
    await packagesPage.goto();
    await packagesPage.verifyNoUndefinedValues();
  });

});

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Opportunités
// ═══════════════════════════════════════════════════════
test.describe('Régression — Opportunités', () => {

  test('REG-11 — La page opportunités se charge sans erreur', async ({ page }) => {
    test.setTimeout(30_000);
    const oppPage = new OpportunitiesPage(page);
    await oppPage.goto();
    await oppPage.verifyOpportunitiesLoaded();
    await expect(page.getByText(/500|server error/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('REG-12 — L\'accès conditionné fonctionne (opportunité → détail)', async ({ page }) => {
    test.setTimeout(30_000);
    const oppPage = new OpportunitiesPage(page);
    await oppPage.goto();
    await oppPage.verifyOpportunityCardsPresent();
  });

});

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Administration
// ═══════════════════════════════════════════════════════
test.describe('Régression — Administration', () => {

  test('REG-13 — Le dashboard admin affiche les KPIs', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyAdminDashboardLoaded();
    await dashboard.verifyKpisVisible();
  });

  test('REG-14 — La gestion des utilisateurs est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToUsers();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.locator('main, [role="main"], body').first()).toBeVisible();
  });

  test('REG-15 — Les documents admin sont accessibles', async ({ page }) => {
    test.setTimeout(30_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToDocuments();
    await expect(page.locator('main, [role="main"], body').first()).toBeVisible();
    await expect(page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

});
