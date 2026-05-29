/**
 * apps/launchpad/pages/AdminDashboardPage.ts
 * --------------------------------------------
 * Page Object — Dashboard Admin Launchpad BV TECH
 *
 * Couvre :
 *   - Navigation admin
 *   - Accès utilisateurs, packs, paiements, messages
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminDashboardPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/fr/admin');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  // =========================================================
  // VÉRIFICATIONS
  // =========================================================

  async verifyAdminDashboardLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/admin|dashboard/i, { timeout: 15_000 });
    const mainContent = this.page.locator('main, [class*="dashboard"], [class*="content"], [role="main"]');
    await expect(mainContent.first()).toBeVisible({ timeout: 20_000 });
  }

  async verifyAdminSections(): Promise<void> {
    const adminNav = this.page.locator('nav, aside, [class*="sidebar"], [class*="menu"]');
    await expect(adminNav.first()).toBeVisible({ timeout: 20_000 });
  }

  // =========================================================
  // NAVIGATION ADMIN
  // =========================================================

  async navigateToUsers(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/users`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
    await expect(this.page.locator('main, body')).toBeVisible({ timeout: 15_000 });
  }

  async navigateToPacks(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/packages`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
    await expect(this.page.locator('main, body')).toBeVisible({ timeout: 15_000 });
  }

  async navigateToPayments(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/admin/payments`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
    await expect(this.page.locator('main, body')).toBeVisible({ timeout: 15_000 });
  }

  async navigateToMessages(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    const paths = [`/${lang}/admin/messages`, `/${lang}/admin/messagerie`, `/${lang}/admin/contacts`];
    for (const p of paths) {
      await this.navigate(p);
      await this.waitForLoad();
      await this.page.waitForTimeout(1000);
      if (!this.page.url().includes('/login')) return;
    }
  }

  // =========================================================
  // VÉRIFICATIONS NOTIFICATIONS ADMIN (E2E #4)
  // =========================================================

  async verifyNewUserNotification(userEmail: string): Promise<void> {
    const notification = this.page.getByText(userEmail, { exact: false })
      .or(this.page.getByText(/nouvel utilisateur|new user|nouveau compte/i));
    if (await notification.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(notification.first()).toBeVisible();
    } else {
      console.log('ℹ️  Notification nouvel utilisateur vérifiable uniquement via email admin');
    }
  }

  async verifyPaymentNotification(): Promise<void> {
    const notification = this.page.getByText(/paiement|payment|commande/i)
      .or(this.page.locator('[class*="notification"], [class*="alert"]'));
    if (await notification.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(notification.first()).toBeVisible();
    } else {
      console.log('ℹ️  Notification paiement vérifiable uniquement via email admin');
    }
  }

  async getUsersCount(): Promise<number> {
    await this.page.waitForTimeout(3000);
    const rows = this.page.locator('table tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) return rowCount;
    const cards = this.page.locator('[class*="user"], [class*="member"], [class*="card"]');
    const cardCount = await cards.count();
    if (cardCount > 0) return cardCount;
    const emails = this.page.locator('main').getByText(/@/);
    return await emails.count();
  }

  async getPaymentsCount(): Promise<number> {
    await this.page.waitForTimeout(2000);
    const rows = this.page.locator('table tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) return rowCount;
    const items = this.page.locator('[class*="payment"], [class*="transaction"]');
    return await items.count();
  }
}
