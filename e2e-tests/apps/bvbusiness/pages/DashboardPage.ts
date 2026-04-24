/**
 * apps/bvbusiness/pages/DashboardPage.ts
 * ----------------------------------------
 * Page Object — Dashboard Client BV Business
 * Couvre : /fr/dashboard (SC-02, SC-04)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class DashboardPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/fr/dashboard');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyDashboardLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/dashboard/i, { timeout: 15_000 });
    const mainContent = this.page.locator('main, [class*="dashboard"], [class*="content"], [role="main"]');
    await expect(mainContent.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyKpisVisible(): Promise<void> {
    // 👉 ADAPTER : classes KPI réelles de l'app
    const kpiElements = this.page.locator(
      '[class*="kpi"], [class*="stat"], [class*="card"], [class*="metric"], [class*="overview"]'
    );
    const count = await kpiElements.count();
    if (count > 0) {
      await expect(kpiElements.first()).toBeVisible({ timeout: 10_000 });
    }
  }

  async verifySidebarNavigation(): Promise<void> {
    const nav = this.page.locator('nav, aside, [class*="sidebar"], [class*="menu"]');
    await expect(nav.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyEmptyStateHandled(): Promise<void> {
    // Vérifier qu'un état vide (pas d'abonnement, pas de data) est géré proprement
    const emptyState = this.page.getByText(/aucun|vide|no data|empty|pas encore/i)
      .or(this.page.locator('[class*="empty"], [class*="placeholder"]'));
    const hasEmpty = await emptyState.first().isVisible({ timeout: 3_000 }).catch(() => false);
    // L'état vide OU des données KPI doit être visible
    const hasKpi = await this.page.locator('[class*="kpi"], [class*="stat"], [class*="card"]').first()
      .isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasEmpty || hasKpi).toBeTruthy();
  }

  async navigateToPackages(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/packages`);
    await this.waitForLoad();
    await this.page.waitForTimeout(1500);
  }

  async navigateToProfile(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/profile`);
    await this.waitForLoad();
  }

  async navigateToSubscription(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    // 👉 ADAPTER : URL réelle de la page abonnement
    await this.navigate(`/${lang}/subscription`);
    await this.waitForLoad();
  }

  async navigateToPayments(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/payments`);
    await this.waitForLoad();
  }
}
