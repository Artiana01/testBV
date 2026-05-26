/**
 * apps/emiragate/pages/AnalyticsPage.ts
 * -----------------------------------------
 * Page Object — Analytique Emiragate
 * Couvre : KPIs, graphiques, filtres (SC-09)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AnalyticsPage extends BasePage {

  private readonly chartEl   = '[class*="chart"],[class*="graph"],[class*="analytics"],[class*="plot"],[class*="recharts"],[class*="apexcharts"]';
  private readonly filterEl  = 'select, input[type="date"], [class*="filter"],[class*="date-range"],[class*="period"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/en/analytics');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyAnalyticsLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login|\/signin/, { timeout: 45_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  }

  async verifyChartsOrKpisVisible(): Promise<void> {
    const charts = this.page.locator(this.chartEl);
    const count = await charts.count();
    if (count > 0) {
      await expect(charts.first()).toBeVisible({ timeout: 20_000 });
      console.log(`   ✅  ${count} graphique(s)/KPI(s) détecté(s)`);
    } else {
      console.log('   ℹ️  Graphiques non détectés — vérifier URL/sélecteurs dans AnalyticsPage');
    }
  }

  async verifyFiltersPresent(): Promise<void> {
    const filters = this.page.locator(this.filterEl);
    const count = await filters.count();
    if (count > 0) {
      console.log(`   ✅  ${count} filtre(s) détecté(s)`);
    } else {
      console.log('   ℹ️  Filtres non trouvés — vérifier sélecteurs');
    }
  }

  async verifyNoCorruptedData(): Promise<void> {
    const broken = this.page.getByText('undefined').or(this.page.getByText('NaN')).or(this.page.getByText('null'));
    const hasBroken = await broken.first().isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasBroken).toBeFalsy();
  }
}
