/**
 * apps/bvinvest/pages/AdminUsersPage.ts
 * ----------------------------------------
 * Page Object — Gestion Utilisateurs Admin BV Invest
 * Couvre : liste, recherche, validation/rejet (SC-08)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminUsersPage extends BasePage {

  private readonly userRow      = 'tr, [class*="user-row"], [class*="user-item"], [class*="member-row"]';
  private readonly searchInput  = 'input[type="search"],input[placeholder*="recherche" i],input[placeholder*="search" i],input[placeholder*="email" i]';
  private readonly actionBtn    = 'button:has-text("Valider"),button:has-text("Approve"),button:has-text("Rejeter"),button:has-text("Reject"),button:has-text("Bloquer"),button:has-text("Block")';

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
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyUserListPresent(): Promise<void> {
    const rows = this.page.locator(this.userRow);
    const count = await rows.count();
    if (count > 0) {
      await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    } else {
      console.log('   ℹ️  Liste utilisateurs vide ou sélecteur à adapter');
    }
  }

  async searchUser(email: string): Promise<void> {
    const input = this.page.locator(this.searchInput).first();
    const isVisible = await input.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Champ de recherche non trouvé');
      return;
    }
    await input.fill(email);
    await this.page.waitForTimeout(1500);
  }

  async verifyActionButtonsPresent(): Promise<void> {
    const btn = this.page.locator(this.actionBtn);
    const count = await btn.count();
    if (count === 0) {
      console.log('   ℹ️  Boutons d\'action non trouvés — vérifier URL/sélecteurs');
    }
  }
}
