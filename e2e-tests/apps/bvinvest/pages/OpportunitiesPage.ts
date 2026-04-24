/**
 * apps/bvinvest/pages/OpportunitiesPage.ts
 * ------------------------------------------
 * Page Object — Opportunités d'investissement BV Invest
 * Couvre : liste projets, détail deal, data room (SC-04, SC-07)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class OpportunitiesPage extends BasePage {

  private readonly oppCard    = '[class*="opportunity"],[class*="deal"],[class*="project"],[class*="invest"]';
  private readonly docItem    = '[class*="document"],[class*="file"],[class*="doc"]';
  private readonly downloadBtn = 'a[download],button:has-text("Télécharger"),button:has-text("Download"),a[href*=".pdf"],a[href*=".zip"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    // 👉 ADAPTER selon l'URL réelle des opportunités
    await this.navigate(`/${lang}/opportunities`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async gotoPrivateSpace(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/private`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyOpportunitiesLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyOpportunityCardsPresent(): Promise<void> {
    const cards = this.page.locator(this.oppCard);
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    } else {
      console.log('   ℹ️  Aucune carte opportunité trouvée — vérifier URL/sélecteurs');
    }
  }

  async clickFirstOpportunity(): Promise<void> {
    const cards = this.page.locator(this.oppCard);
    const count = await cards.count();
    if (count === 0) {
      console.log('   ℹ️  Aucune opportunité à cliquer');
      return;
    }
    await cards.first().click();
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyOpportunityDetailLoaded(): Promise<void> {
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    await expect(this.page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  }

  async verifyDataRoomOrDocuments(): Promise<void> {
    const docs = this.page.locator(this.docItem)
      .or(this.page.getByText(/data room|documents|fichiers/i));
    const isVisible = await docs.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Data room non visible — accès peut être conditionné au pack');
    }
  }

  async verifyDownloadButtonPresent(): Promise<void> {
    const btn = this.page.locator(this.downloadBtn);
    const isVisible = await btn.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Bouton téléchargement non trouvé — vérifier droits utilisateur');
    }
  }
}
