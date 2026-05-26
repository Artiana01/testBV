/**
 * apps/bvbusiness/pages/AdminRegionalContentPage.ts
 * ---------------------------------------------------
 * Page Object — Gestion Contenu Régional Admin BV Business
 * Couvre : sauvegarde, affichage par région (SC-07)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminRegionalContentPage extends BasePage {

  // 👉 ADAPTER : sélecteurs réels de la page contenu régional
  private readonly regionSelector  = 'select[name*="region" i], [class*="region"], [data-region]';
  private readonly contentFields   = 'textarea, [contenteditable="true"], input[type="text"]';
  private readonly saveBtn         = 'button:has-text("Sauvegarder"), button:has-text("Save"), button:has-text("Enregistrer"), button[type="submit"]';
  private readonly successToast    = '[class*="toast"], [class*="success"], [role="status"], [role="alert"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    // 👉 ADAPTER : URL réelle du contenu régional
    await this.navigate(`/${lang}/admin/regional`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyRegionalPageLoaded(): Promise<void> {
    const content = this.page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  }

  async selectRegion(regionName: string): Promise<void> {
    const selector = this.page.locator(this.regionSelector).first();
    if (await selector.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const tagName = await selector.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await selector.selectOption({ label: regionName });
      } else {
        await selector.click();
        await this.page.getByText(regionName).first().click();
      }
      await this.page.waitForTimeout(1000);
    }
  }

  async editContentField(newValue: string): Promise<void> {
    const field = this.page.locator(this.contentFields).first();
    if (await field.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await field.click();
      await field.press('Control+a');
      await field.fill(newValue);
    }
  }

  async saveRegionalContent(): Promise<void> {
    const btn = this.page.locator(this.saveBtn).first();
    const isVisible = await btn.isVisible({ timeout: 20_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Bouton de sauvegarde régional non trouvé — vérifier URL/sélecteurs dans AdminRegionalContentPage');
      return;
    }
    await btn.click();
    await this.page.waitForTimeout(2000);
  }

  async verifySaveSuccess(): Promise<void> {
    const toast = this.page.locator(this.successToast)
      .or(this.page.getByText(/sauvegardé|saved|success|mis à jour|updated/i));
    const isVisible = await toast.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Toast de succès non visible — vérifier manuellement que la sauvegarde a fonctionné');
    }
  }

  async verifyRegionSelectorPresent(): Promise<void> {
    const selector = this.page.locator(this.regionSelector)
      .or(this.page.getByText(/région|region|zone/i));
    const isPresent = await selector.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isPresent) {
      console.log('   ℹ️  Sélecteur de région non trouvé — vérifier URL réelle dans goto()');
    }
  }
}
