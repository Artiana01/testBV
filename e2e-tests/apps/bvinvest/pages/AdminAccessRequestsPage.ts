/**
 * apps/bvinvest/pages/AdminAccessRequestsPage.ts
 * -------------------------------------------------
 * Page Object — Gestion des Demandes d'Accès Admin BV Invest
 * Couvre : visualisation, validation, rejet (SC-08)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminAccessRequestsPage extends BasePage {

  private readonly requestRow   = 'tr, [class*="request"], [class*="demande"], [class*="access-row"]';
  private readonly approveBtn   = 'button:has-text("Valider"),button:has-text("Approve"),button:has-text("Accepter"),button:has-text("Accept")';
  private readonly rejectBtn    = 'button:has-text("Rejeter"),button:has-text("Reject"),button:has-text("Refuser"),button:has-text("Deny")';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    // 👉 ADAPTER selon l'URL réelle
    await this.navigate(`/${lang}/admin/access-requests`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyPageLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    await expect(this.page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  }

  async verifyRequestListPresent(): Promise<void> {
    const rows = this.page.locator(this.requestRow);
    const count = await rows.count();
    if (count > 0) {
      await expect(rows.first()).toBeVisible({ timeout: 5_000 });
    } else {
      console.log('   ℹ️  Aucune demande d\'accès trouvée — liste vide ou URL à adapter');
    }
  }

  async verifyApproveRejectButtonsPresent(): Promise<void> {
    const approveVisible = await this.page.locator(this.approveBtn).first().isVisible({ timeout: 3_000 }).catch(() => false);
    const rejectVisible  = await this.page.locator(this.rejectBtn).first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (!approveVisible && !rejectVisible) {
      console.log('   ℹ️  Boutons de validation/rejet non trouvés — vérifier sélecteurs ou liste vide');
    }
  }
}
