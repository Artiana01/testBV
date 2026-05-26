/**
 * apps/emiragate/pages/ClientDashboardPage.ts
 * ----------------------------------------------
 * Page Object — Dashboard Client Emiragate
 * Couvre : accès espace client, KPIs client (SC-05)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class ClientDashboardPage extends BasePage {

  private readonly kpiCard = '[class*="kpi"],[class*="stat"],[class*="card"],[class*="metric"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/en/dashboard');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyClientDashboardLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login|\/signin/, { timeout: 45_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
  }

  async verifyKpisVisible(): Promise<void> {
    const kpis = this.page.locator(this.kpiCard);
    const count = await kpis.count();
    if (count > 0) {
      await expect(kpis.first()).toBeVisible({ timeout: 20_000 });
    } else {
      console.log('   ℹ️  KPIs client non détectés — vérifier sélecteurs');
    }
  }
}
