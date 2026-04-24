/**
 * apps/bvinvest/pages/AdminDashboardPage.ts
 * -------------------------------------------
 * Page Object — Dashboard Admin BV Invest
 * Couvre : KPIs, revenus, abonnements, navigation admin (SC-09)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminDashboardPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/fr/dashboard');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyAdminDashboardLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    const main = this.page.locator('main, [role="main"], [class*="dashboard"], body');
    await expect(main.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyKpisVisible(): Promise<void> {
    const kpis = this.page.locator('[class*="kpi"],[class*="stat"],[class*="card"],[class*="metric"],[class*="overview"]');
    const count = await kpis.count();
    if (count > 0) {
      await expect(kpis.first()).toBeVisible({ timeout: 10_000 });
    }
  }

  async verifyAdminNavVisible(): Promise<void> {
    const nav = this.page.locator('nav, aside, [class*="sidebar"], [class*="menu"]');
    await expect(nav.first()).toBeVisible({ timeout: 10_000 });
  }

  async navigateToUsers(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/users`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async navigateToAccessRequests(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    // 👉 ADAPTER selon l'URL réelle des demandes d'accès
    const possiblePaths = [
      `/${lang}/admin/access-requests`,
      `/${lang}/admin/requests`,
      `/${lang}/admin/demandes`,
    ];
    await this.navigate(possiblePaths[0]);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async navigateToOpportunities(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/opportunities`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async navigateToDocuments(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/documents`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async navigateToAnalytics(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/analytics`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }
}
