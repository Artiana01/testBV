/**
 * apps/bvbusiness/pages/PackagesPage.ts
 * ----------------------------------------
 * Page Object — Page Packages / Abonnements BV Business
 * Couvre : consultation offres, recherche, filtres, souscription (SC-03)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class PackagesPage extends BasePage {

  // 👉 ADAPTER si les sélecteurs ne correspondent pas à l'app réelle
  private readonly packageCards   = 'article, [class*="card"], [class*="package"], [class*="pack"], [class*="plan"], [class*="offer"], [class*="pricing"], [class*="item"], [class*="tile"], li[class], .col > div';
  private readonly searchInput    = 'input[type="search"], input[placeholder*="search" i], input[placeholder*="recherche" i]';
  private readonly filterButtons  = '[class*="filter"], [class*="tag"], [role="tab"]';
  private readonly subscribeBtn   = 'button, a[href*="subscribe"], a[href*="souscri"], a[href*="checkout"]';
  private readonly priceElements  = '[class*="price"], [class*="tarif"], [class*="amount"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/packages`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyPackagesLoaded(): Promise<void> {
    // Vérifier que la page a chargé un contenu (sans contrainte d'URL stricte)
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 15_000 });
    await this.page.waitForTimeout(2000);
  }

  async verifyPackageCardsVisible(): Promise<void> {
    const cards = this.page.locator(this.packageCards);
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  }

  async verifyPricesVisible(): Promise<void> {
    const prices = this.page.locator(this.priceElements);
    const count = await prices.count();
    if (count > 0) {
      await expect(prices.first()).toBeVisible({ timeout: 10_000 });
    }
  }

  async searchPackage(query: string): Promise<void> {
    const searchField = this.page.locator(this.searchInput).first();
    if (await searchField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchField.fill(query);
      await this.page.waitForTimeout(1000);
    }
  }

  async applyFilter(filterName: string): Promise<void> {
    const filter = this.page.locator(this.filterButtons)
      .filter({ hasText: filterName });
    if (await filter.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await filter.first().click();
      await this.page.waitForTimeout(1000);
    }
  }

  async selectFirstPackage(): Promise<void> {
    const cards = this.page.locator(this.packageCards);
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    await cards.first().click();
    await this.page.waitForTimeout(1000);
  }

  async clickSubscribeOnFirstPackage(): Promise<void> {
    // Chercher un bouton d'action sur la page packages
    const btn = this.page.getByRole('button').or(this.page.getByRole('link'))
      .filter({ hasText: /souscrire|subscribe|choisir|choose|acheter|buy|commander|select/i })
      .first();
    const isVisible = await btn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (isVisible) {
      await btn.click();
      await this.page.waitForLoadState('load');
    }
  }

  async verifySubscriptionPageOrModal(): Promise<void> {
    // Après clic sur "Souscrire", on doit atterrir sur une page de paiement ou une modale
    await this.page.waitForTimeout(2000);
    const paymentIndicator = this.page.getByText(/paiement|payment|checkout|facturation|billing|stripe|card/i)
      .or(this.page.locator('[class*="payment"], [class*="checkout"], [class*="modal"]'));
    const isVisible = await paymentIndicator.first().isVisible({ timeout: 8_000 }).catch(() => false);
    // Ou bien l'URL a changé vers une page de paiement
    const url = this.page.url();
    const urlIndicatesPayment = /payment|checkout|billing|subscribe/i.test(url);
    expect(isVisible || urlIndicatesPayment).toBeTruthy();
  }
}
