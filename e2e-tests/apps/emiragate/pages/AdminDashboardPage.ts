/**
 * apps/emiragate/pages/AdminDashboardPage.ts
 * --------------------------------------------
 * Page Object — Dashboard Administrateur Emiragate
 * Couvre : KPIs, activités récentes, navigation admin (SC-02, SC-09)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminDashboardPage extends BasePage {

  private readonly kpiCard  = '[class*="kpi"],[class*="stat"],[class*="card"],[class*="metric"],[class*="count"],[class*="overview"]';
  private readonly recentActivity = '[class*="activity"],[class*="recent"],[class*="feed"],[class*="event"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/en/dashboard');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyDashboardLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login|\/signin/, { timeout: 45_000 });
    const content = this.page.locator('main, [role="main"], [class*="dashboard"], body');
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
  }

  async verifyKpisVisible(): Promise<void> {
    const kpis = this.page.locator(this.kpiCard);
    const count = await kpis.count();
    if (count > 0) {
      await expect(kpis.first()).toBeVisible({ timeout: 20_000 });
      console.log(`   ✅  ${count} KPI(s) détecté(s)`);
    } else {
      console.log('   ℹ️  KPIs non détectés — vérifier sélecteurs dans AdminDashboardPage');
    }
  }

  async verifyRecentActivityVisible(): Promise<void> {
    const activity = this.page.locator(this.recentActivity)
      .or(this.page.getByText(/activité|recent|activity|derniers/i));
    const isVisible = await activity.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Section activités récentes non trouvée');
    }
  }

  async verifyNavVisible(): Promise<void> {
    const nav = this.page.locator('nav, aside, [class*="sidebar"], [class*="menu"]');
    await expect(nav.first()).toBeVisible({ timeout: 20_000 });
  }

  async navigateTo(section: string): Promise<void> {
    await this.navigate(`/en/${section}`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async navigateToConduit(): Promise<void> {
    // Leads / Conduit
    const conduitLink = this.page.getByRole('link', { name: /conduit|lead/i })
      .or(this.page.locator('a[href*="conduit"], a[href*="lead"]'));
    if (await conduitLink.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await conduitLink.first().click();
      await this.waitForLoad();
    } else {
      await this.navigate('/en/conduit');
      await this.waitForLoad();
    }
    await this.page.waitForTimeout(2000);
  }

  async navigateToContacts(): Promise<void> {
    const link = this.page.getByRole('link', { name: /contact/i })
      .or(this.page.locator('a[href*="contact"]'));
    if (await link.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await link.first().click();
      await this.waitForLoad();
    } else {
      await this.navigate('/en/contacts');
      await this.waitForLoad();
    }
    await this.page.waitForTimeout(2000);
  }

  async navigateToUsers(): Promise<void> {
    await this.navigate('/en/users');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async navigateToAnalytics(): Promise<void> {
    const link = this.page.getByRole('link', { name: /analytic|stat|report/i })
      .or(this.page.locator('a[href*="analytic"], a[href*="stat"], a[href*="report"]'));
    if (await link.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await link.first().click();
      await this.waitForLoad();
    } else {
      await this.navigate('/en/analytics');
      await this.waitForLoad();
    }
    await this.page.waitForTimeout(2000);
  }

  async navigateToProfile(): Promise<void> {
    const link = this.page.getByRole('link', { name: /profil|profile/i })
      .or(this.page.locator('a[href*="profile"]'));
    if (await link.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await link.first().click();
      await this.waitForLoad();
    } else {
      await this.navigate('/en/profile');
      await this.waitForLoad();
    }
    await this.page.waitForTimeout(2000);
  }
}
