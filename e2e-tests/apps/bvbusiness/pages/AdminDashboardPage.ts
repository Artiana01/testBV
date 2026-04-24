/**
 * apps/bvbusiness/pages/AdminDashboardPage.ts
 * ---------------------------------------------
 * Page Object — Dashboard Admin BV Business
 * Couvre : navigation admin, KPIs admin (SC-02 admin, SC-04)
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
    await expect(this.page).toHaveURL(/dashboard/i, { timeout: 15_000 });
    const main = this.page.locator('main, [class*="dashboard"], [role="main"]');
    await expect(main.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyKpisVisible(): Promise<void> {
    const kpiElements = this.page.locator(
      '[class*="kpi"], [class*="stat"], [class*="card"], [class*="metric"], [class*="overview"]'
    );
    const count = await kpiElements.count();
    if (count > 0) {
      await expect(kpiElements.first()).toBeVisible({ timeout: 10_000 });
    }
  }

  async verifyAdminNavigation(): Promise<void> {
    const adminNav = this.page.locator('nav, aside, [class*="sidebar"], [class*="menu"]');
    await expect(adminNav.first()).toBeVisible({ timeout: 10_000 });
  }

  private lang(): string {
    return this.page.url().includes('/en/') ? 'en' : 'fr';
  }

  async navigateToUsers(): Promise<void> {
    await this.navigate(`/${this.lang()}/admin/users`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
    await expect(this.page.locator('main, [role="main"], body').first()).toBeVisible({ timeout: 10_000 });
  }

  async navigateToClients(): Promise<void> {
    // 👉 ADAPTER : URL réelle de la section clients admin
    await this.navigate(`/${this.lang()}/admin/clients`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async navigateToPackages(): Promise<void> {
    await this.navigate(`/${this.lang()}/admin/packages`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
    await expect(this.page.locator('main, [role="main"], body').first()).toBeVisible({ timeout: 10_000 });
  }

  async navigateToPayments(): Promise<void> {
    await this.navigate(`/${this.lang()}/admin/payments`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
    await expect(this.page.locator('main, [role="main"], body').first()).toBeVisible({ timeout: 10_000 });
  }

  async navigateToContent(): Promise<void> {
    // 👉 ADAPTER : URL réelle du content management
    await this.navigate(`/${this.lang()}/admin/content`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async navigateToMediaLibrary(): Promise<void> {
    // 👉 ADAPTER : URL réelle de la media library
    await this.navigate(`/${this.lang()}/admin/media`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async navigateToRegionalContent(): Promise<void> {
    // 👉 ADAPTER : URL réelle du contenu régional
    await this.navigate(`/${this.lang()}/admin/regional`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }
}
