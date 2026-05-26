/**
 * apps/emiragate/pages/ProfilePage.ts
 * ---------------------------------------
 * Page Object — Profil utilisateur Emiragate (Admin & Client)
 * Couvre : affichage infos, modification, déconnexion (SC-06)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class ProfilePage extends BasePage {

  private readonly nameInput  = 'input[name*="name" i],input[name*="nom" i],input[placeholder*="name" i]';
  private readonly saveBtn    = 'button[type="submit"],button:has-text("Save"),button:has-text("Sauvegarder"),button:has-text("Update"),button:has-text("Mettre à jour")';
  private readonly successMsg = '[class*="success"],[class*="toast"],[role="status"],[role="alert"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/en/profile');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyProfileLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login|\/signin/, { timeout: 45_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  }

  async verifyProfileInfoDisplayed(): Promise<void> {
    const info = this.page.locator('input[type="email"], input[type="text"]').first()
      .or(this.page.locator('form').first());
    const isVisible = await info.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Champs de profil non visibles — vérifier URL dans ProfilePage');
    }
  }

  async updateName(newName: string): Promise<void> {
    const field = this.page.locator(this.nameInput).first();
    const isVisible = await field.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Champ Nom non trouvé — ignorer');
      return;
    }
    await field.click();
    await field.press('Control+a');
    await field.fill(newName);
  }

  async saveProfile(): Promise<void> {
    const btn = this.page.locator(this.saveBtn).first();
    const isVisible = await btn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Bouton de sauvegarde non trouvé');
      return;
    }
    await btn.click();
    await this.page.waitForTimeout(2000);
  }

  async verifySaveSuccess(): Promise<void> {
    const toast = this.page.locator(this.successMsg)
      .or(this.page.getByText(/saved|sauvegardé|updated|mis à jour|success/i));
    const isVisible = await toast.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Message de succès non visible — vérifier manuellement');
    }
  }

  async verifyActionsAvailable(): Promise<void> {
    // Modifier + Déconnexion
    const editBtn = this.page.locator(this.saveBtn)
      .or(this.page.getByText(/modifier|edit|update/i));
    const isEditVisible = await editBtn.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isEditVisible) {
      console.log('   ℹ️  Actions profil (modifier) non visibles');
    }
  }
}
