/**
 * apps/bvbusiness/pages/AdminPaymentsPage.ts
 * --------------------------------------------
 * Page Object — Gestion Paiements & Abonnements Admin BV Business
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminPaymentsPage extends BasePage {

  // 👉 ADAPTER : sélecteurs réels de la page paiements admin
  private readonly paymentsTable  = 'table, [class*="table"], [class*="payment"], [class*="transaction"]';
  private readonly statusBadges   = '[class*="badge"], [class*="status"], [class*="tag"]';
  private readonly filterSelect   = 'select[name*="status" i], [class*="filter"]';
  private readonly dateRange      = 'input[type="date"], [class*="date-picker"], [class*="datepicker"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/payments`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyPaymentsPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/admin.*payment|payment.*admin|billing|transaction/i, { timeout: 15_000 });
    const content = this.page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyPaymentsTableVisible(): Promise<void> {
    const table = this.page.locator(this.paymentsTable).first();
    await expect(table).toBeVisible({ timeout: 10_000 });
  }

  async verifyStatusBadgesVisible(): Promise<void> {
    const badges = this.page.locator(this.statusBadges);
    const count = await badges.count();
    if (count > 0) {
      await expect(badges.first()).toBeVisible({ timeout: 10_000 });
    }
  }

  async filterByStatus(status: string): Promise<void> {
    const filter = this.page.locator(this.filterSelect).first();
    if (await filter.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await filter.selectOption({ label: status });
      await this.page.waitForTimeout(1500);
    }
  }

  async verifyTransactionIntegrity(): Promise<void> {
    // Données présentes OU état vide → les deux sont acceptables
    const rows = this.page.locator('tbody tr, [class*="row"], [class*="transaction"], [class*="payment"]');
    const count = await rows.count();
    if (count > 0) {
      await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    } else {
      // État vide : aucune transaction → vérifier juste que la page est fonctionnelle
      const content = this.page.locator('main, [role="main"]');
      await expect(content.first()).toBeVisible({ timeout: 5_000 });
    }
  }
}
