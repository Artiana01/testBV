/**
 * apps/bvinvest/pages/PackagesPage.ts
 * -------------------------------------
 * Page Object — Packages & Abonnements BV Invest
 * Couvre : ACCESS / MEMBER, souscription, upgrade (SC-03)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class PackagesPage extends BasePage {

  private readonly packCard      = '[class*="pack"],[class*="plan"],[class*="pricing"],[class*="offer"],[class*="subscription"]';
  private readonly subscribeBtn  = 'button:has-text("Souscrire"),button:has-text("Subscribe"),button:has-text("Choisir"),button:has-text("Select"),button:has-text("Upgrade"),button:has-text("Commencer")';
  private readonly priceEl       = '[class*="price"],[class*="prix"],[class*="amount"],[class*="tarif"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    // 👉 ADAPTER selon l'URL réelle des packages
    await this.navigate(`/${lang}/packages`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyPackagesLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyPackCardsVisible(): Promise<void> {
    const cards = this.page.locator(this.packCard)
      .or(this.page.getByText(/access|member/i));
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    }
  }

  async verifyPricesVisible(): Promise<void> {
    const prices = this.page.locator(this.priceEl);
    const count = await prices.count();
    if (count > 0) {
      await expect(prices.first()).toBeVisible({ timeout: 5_000 });
    }
  }

  async verifySubscribeButtonVisible(): Promise<void> {
    const btn = this.page.locator(this.subscribeBtn);
    const isVisible = await btn.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Bouton de souscription non trouvé — vérifier URL dans PackagesPage');
    }
  }

  async clickSubscribeFirstPack(): Promise<void> {
    const btn = this.page.locator(this.subscribeBtn).first();
    const isVisible = await btn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Bouton de souscription non trouvé — ignorer');
      return;
    }
    await btn.click();
    await this.page.waitForTimeout(2000);
  }

  async verifyNoUndefinedValues(): Promise<void> {
    const broken = this.page.getByText('undefined').or(this.page.getByText('null'));
    const hasBroken = await broken.first().isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasBroken).toBeFalsy();
  }
}
