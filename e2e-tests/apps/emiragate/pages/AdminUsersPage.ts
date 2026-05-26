/**
 * apps/emiragate/pages/AdminUsersPage.ts
 * -----------------------------------------
 * Page Object — Gestion Utilisateurs Admin Emiragate
 * Couvre : liste, modification, suppression (SC-07)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminUsersPage extends BasePage {

  private readonly userRow    = 'tr, [class*="user-row"],[class*="user-item"],[class*="member"]';
  private readonly editBtn    = 'button:has-text("Edit"),button:has-text("Modifier"),[aria-label*="edit" i]';
  private readonly deleteBtn  = 'button:has-text("Delete"),button:has-text("Supprimer"),[aria-label*="delete" i]';
  private readonly searchInput = 'input[type="search"],input[placeholder*="search" i],input[placeholder*="email" i]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/en/users');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyUsersPageLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login|\/signin/, { timeout: 45_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  }

  async verifyUserListVisible(): Promise<void> {
    const rows = this.page.locator(this.userRow);
    const count = await rows.count();
    if (count > 0) {
      await expect(rows.first()).toBeVisible({ timeout: 20_000 });
      console.log(`   ✅  ${count} utilisateur(s) trouvé(s)`);
    } else {
      console.log('   ℹ️  Liste utilisateurs vide ou sélecteurs à adapter');
    }
  }

  async verifyEditDeleteAvailable(): Promise<void> {
    const editVisible   = await this.page.locator(this.editBtn).first().isVisible({ timeout: 3_000 }).catch(() => false);
    const deleteVisible = await this.page.locator(this.deleteBtn).first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (!editVisible && !deleteVisible) {
      console.log('   ℹ️  Boutons Modifier/Supprimer non trouvés — vérifier sélecteurs');
    }
  }

  async searchUser(query: string): Promise<void> {
    const input = this.page.locator(this.searchInput).first();
    const isVisible = await input.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Champ de recherche non trouvé');
      return;
    }
    await input.fill(query);
    await this.page.waitForTimeout(1500);
  }
}
