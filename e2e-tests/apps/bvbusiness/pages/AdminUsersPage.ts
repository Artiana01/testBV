/**
 * apps/bvbusiness/pages/AdminUsersPage.ts
 * -----------------------------------------
 * Page Object — Gestion Users & Clients Admin BV Business
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminUsersPage extends BasePage {

  // 👉 ADAPTER : sélecteurs réels de la page admin users
  private readonly usersTable   = 'table, [class*="table"], [class*="list"], [class*="grid"]';
  private readonly searchInput  = 'input[type="search"], input[placeholder*="search" i], input[placeholder*="recherche" i]';
  private readonly userRows     = 'tr[class*="user"], [class*="user-row"], tbody tr';
  private readonly paginationEl = '[class*="pagination"], nav[aria-label*="pagination" i]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/users`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyUsersPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/admin.*user|user.*admin/i, { timeout: 15_000 });
    const content = this.page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyUsersTableVisible(): Promise<void> {
    const table = this.page.locator(this.usersTable).first();
    await expect(table).toBeVisible({ timeout: 10_000 });
  }

  async searchUser(query: string): Promise<void> {
    const searchField = this.page.locator(this.searchInput).first();
    if (await searchField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchField.fill(query);
      await this.page.waitForTimeout(1500);
    }
  }

  async verifyUserInList(identifier: string): Promise<void> {
    const userRow = this.page.getByText(identifier);
    await expect(userRow.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyPaginationIfPresent(): Promise<void> {
    const pagination = this.page.locator(this.paginationEl);
    const hasPagination = await pagination.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasPagination) {
      await expect(pagination).toBeVisible();
    }
  }
}
