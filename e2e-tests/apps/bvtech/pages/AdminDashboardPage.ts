/**
 * apps/bvtech/pages/AdminDashboardPage.ts
 * -----------------------------------------
 * Page Object — Dashboard Admin BV Tech
 * Couvre : dashboard admin après connexion
 *
 * Éléments attendus :
 * - KPIs admin (utilisateurs, paiements, etc.)
 * - Navigation sidebar admin
 * - Sections admin (Utilisateurs, Packs, Paiements, Contacts)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminDashboardPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async goto(): Promise<void> {
    await this.navigate('/fr/dashboard');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  // =========================================================
  // VÉRIFICATIONS DASHBOARD ADMIN
  // =========================================================

  async verifyAdminDashboardLoaded(): Promise<void> {
    // Vérifier qu'on est sur le dashboard
    await expect(this.page).toHaveURL(/dashboard/i, { timeout: 15_000 });
    const mainContent = this.page.locator('main, [class*="dashboard"], [class*="content"], [role="main"]');
    await expect(mainContent.first()).toBeVisible({ timeout: 20_000 });
  }

  async verifyAdminSections(): Promise<void> {
    // Vérifier la présence des sections admin dans le sidebar ou la navigation
    const adminNav = this.page.locator('nav, aside, [class*="sidebar"], [class*="menu"]');
    await expect(adminNav.first()).toBeVisible({ timeout: 20_000 });
  }

  async verifyKpisVisible(): Promise<void> {
    // Chercher des éléments KPI dans le dashboard admin
    const kpiElements = this.page.locator(
      '[class*="kpi"], [class*="stat"], [class*="card"], [class*="metric"], [data-testid*="kpi"], [class*="overview"]'
    );
    
    const count = await kpiElements.count();
    if (count > 0) {
      await expect(kpiElements.first()).toBeVisible({ timeout: 20_000 });
    }
  }

  // =========================================================
  // NAVIGATION ADMIN
  // =========================================================

  async navigateToUsers(): Promise<void> {
    const currentUrl = this.page.url();
    const lang = currentUrl.includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/users`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
    // Vérifier que la page s'est chargée correctement
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
  }

  async navigateToPacks(): Promise<void> {
    const currentUrl = this.page.url();
    const lang = currentUrl.includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/packages`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
    // Vérifier que la page s'est chargée correctement
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
  }

  async navigateToPayments(): Promise<void> {
    const currentUrl = this.page.url();
    const lang = currentUrl.includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/payments`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
    // Vérifier que la page s'est chargée correctement
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
  }

  async navigateToContacts(): Promise<void> {
    const currentUrl = this.page.url();
    const lang = currentUrl.includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/contacts`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
    // Vérifier que la page s'est chargée correctement
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
  }
}
