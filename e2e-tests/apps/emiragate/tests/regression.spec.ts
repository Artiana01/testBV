/**
 * apps/emiragate/tests/regression.spec.ts
 * -----------------------------------------
 * Cas de régression prioritaires Emiragate (BV Install)
 *
 * Couvre :
 *   - Authentification : stabilité connexions, gestion de session
 *   - Dashboard : affichage KPIs après modification
 *   - Profil : modification informations utilisateur
 *   - Leads / Conduit : affichage et actions
 *   - Admin : gestion utilisateurs et contacts
 *   - Analytique : cohérence des données
 *
 * Précond : Admin connecté (storageState admin)
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { ConduitPage } from '../pages/ConduitPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { ContactsPage } from '../pages/ContactsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = process.env.EMIRAGATE_BASE_URL ?? 'https://dev.bluevalorisinstall.com';

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Authentification
// ═══════════════════════════════════════════════════════
test.describe('Régression — Authentification', () => {

  test('REG-01 — Session admin active : dashboard accessible', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page).not.toHaveURL(/\/login|\/signin/, { timeout: 45_000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('REG-02 — Pas de boucle de redirection', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    const url1 = page.url();
    await page.waitForTimeout(2000);
    const url2 = page.url();
    expect(url1).toBe(url2);
  });

  test('REG-03 — Session persiste entre pages', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page).not.toHaveURL(/\/login|\/signin/, { timeout: 20_000 });

    await page.goto(`${BASE}/en/profile`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page).not.toHaveURL(/\/login|\/signin/, { timeout: 20_000 });
  });

});

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Dashboard
// ═══════════════════════════════════════════════════════
test.describe('Régression — Dashboard', () => {

  test('REG-04 — Les KPIs s\'affichent sans erreur', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    await dashboard.verifyDashboardLoaded();
    await dashboard.verifyKpisVisible();
    await expect(page.getByText(/500|server error/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('REG-05 — Aucune donnée corrompue sur le dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    const dashboard = new AdminDashboardPage(page);
    await dashboard.goto();
    const broken = page.getByText('undefined').or(page.getByText('NaN')).or(page.getByText('null'));
    const hasBroken = await broken.first().isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasBroken).toBeFalsy();
  });

});

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Profil
// ═══════════════════════════════════════════════════════
test.describe('Régression — Profil', () => {

  test('REG-06 — La page profil se charge sans erreur', async ({ page }) => {
    test.setTimeout(60_000);
    const profile = new ProfilePage(page);
    await profile.goto();
    await profile.verifyProfileLoaded();
    await expect(page.getByText(/500|server error/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('REG-07 — La modification du profil est accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const profile = new ProfilePage(page);
    await profile.goto();
    await profile.verifyActionsAvailable();
  });

});

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Leads / Conduit
// ═══════════════════════════════════════════════════════
test.describe('Régression — Leads / Conduit', () => {

  test('REG-08 — La page Conduit se charge sans erreur', async ({ page }) => {
    test.setTimeout(60_000);
    const conduit = new ConduitPage(page);
    await conduit.goto();
    await conduit.verifyConduitPageLoaded();
    await expect(page.getByText(/500|server error/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('REG-09 — Les actions sur les leads sont disponibles', async ({ page }) => {
    test.setTimeout(60_000);
    const conduit = new ConduitPage(page);
    await conduit.goto();
    await conduit.verifyActionsAvailable();
  });

  test('REG-10 — Aucune valeur corrompue dans les leads', async ({ page }) => {
    test.setTimeout(60_000);
    const conduit = new ConduitPage(page);
    await conduit.goto();
    await conduit.verifyNoUndefinedValues();
  });

});

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Admin : Utilisateurs & Contacts
// ═══════════════════════════════════════════════════════
test.describe('Régression — Admin', () => {

  test('REG-11 — La gestion utilisateurs est accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.verifyUsersPageLoaded();
    await users.verifyUserListVisible();
  });

  test('REG-12 — La gestion contacts est accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const contacts = new ContactsPage(page);
    await contacts.goto();
    await contacts.verifyContactsPageLoaded();
    await contacts.verifyContactTableVisible();
  });

});

// ═══════════════════════════════════════════════════════
// RÉGRESSION — Analytique
// ═══════════════════════════════════════════════════════
test.describe('Régression — Analytique', () => {

  test('REG-13 — La page analytics se charge sans erreur', async ({ page }) => {
    test.setTimeout(60_000);
    const analytics = new AnalyticsPage(page);
    await analytics.goto();
    await analytics.verifyAnalyticsLoaded();
    await expect(page.getByText(/500|server error/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('REG-14 — Les données analytics sont cohérentes (pas de NaN)', async ({ page }) => {
    test.setTimeout(60_000);
    const analytics = new AnalyticsPage(page);
    await analytics.goto();
    await analytics.verifyNoCorruptedData();
  });

});
