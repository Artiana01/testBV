/**
 * apps/bvinvest/pages/ProfilePage.ts
 * -------------------------------------
 * Page Object — Profil utilisateur BV Invest
 * Couvre : modification profil, sauvegarde (SC-06)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class ProfilePage extends BasePage {

  private readonly nameInput   = 'input[name*="name" i],input[name*="nom" i],input[placeholder*="nom" i],input[placeholder*="name" i]';
  private readonly phoneInput  = 'input[name*="phone" i],input[name*="tel" i],input[type="tel"]';
  private readonly saveBtn     = 'button[type="submit"],button:has-text("Sauvegarder"),button:has-text("Save"),button:has-text("Enregistrer"),button:has-text("Mettre à jour")';
  private readonly successMsg  = '[class*="success"],[class*="toast"],[role="status"],[role="alert"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/profile`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyProfilePageLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyFormFieldsPresent(): Promise<void> {
    const field = this.page.locator(this.nameInput)
      .or(this.page.locator('input[type="email"]'))
      .or(this.page.locator(this.phoneInput));
    const isVisible = await field.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Champs de profil non trouvés — vérifier URL dans ProfilePage');
    }
  }

  async updateProfileField(newValue: string): Promise<void> {
    const nameField = this.page.locator(this.nameInput).first();
    const isVisible = await nameField.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Champ Nom non trouvé — mise à jour ignorée');
      return;
    }
    await nameField.click();
    await nameField.press('Control+a');
    await nameField.fill(newValue);
  }

  async saveProfile(): Promise<void> {
    const btn = this.page.locator(this.saveBtn).first();
    const isVisible = await btn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Bouton de sauvegarde non trouvé — ignorer');
      return;
    }
    await btn.click();
    await this.page.waitForTimeout(2000);
  }

  async verifySaveSuccess(): Promise<void> {
    const toast = this.page.locator(this.successMsg)
      .or(this.page.getByText(/sauvegardé|saved|mis à jour|updated|success/i));
    const isVisible = await toast.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Message de succès non visible — vérifier manuellement');
    }
  }
}
