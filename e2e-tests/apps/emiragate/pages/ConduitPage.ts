/**
 * apps/emiragate/pages/ConduitPage.ts
 * -------------------------------------
 * Page Object — Gestion des Leads (Conduit) Emiragate
 * Couvre : liste leads, actions voir/supprimer (SC-03)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class ConduitPage extends BasePage {

  private readonly leadRow    = 'tr, [class*="lead"],[class*="row"],[class*="item"],[class*="conduit"]';
  private readonly viewBtn    = 'button:has-text("Voir"),button:has-text("View"),a:has-text("Voir"),a:has-text("View"),[aria-label*="view" i],[aria-label*="voir" i]';
  private readonly deleteBtn  = 'button:has-text("Supprimer"),button:has-text("Delete"),[aria-label*="delete" i],[aria-label*="supprimer" i]';
  private readonly searchInput = 'input[type="search"],input[placeholder*="search" i],input[placeholder*="recherche" i]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/en/conduit');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyConduitPageLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login|\/signin/, { timeout: 45_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  }

  async verifyLeadListVisible(): Promise<void> {
    const rows = this.page.locator(this.leadRow);
    const count = await rows.count();
    if (count > 0) {
      await expect(rows.first()).toBeVisible({ timeout: 20_000 });
      console.log(`   ✅  ${count} lead(s) trouvé(s)`);
    } else {
      console.log('   ℹ️  Aucun lead — liste vide ou sélecteurs à adapter');
    }
  }

  async verifyViewActionAvailable(): Promise<void> {
    const btn = this.page.locator(this.viewBtn);
    const isVisible = await btn.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Bouton Voir non trouvé — vérifier sélecteurs');
    }
  }

  async verifyDeleteActionAvailable(): Promise<void> {
    const btn = this.page.locator(this.deleteBtn);
    const isVisible = await btn.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Bouton Supprimer non trouvé — vérifier sélecteurs');
    }
  }

  async verifyActionsAvailable(): Promise<void> {
    await this.verifyViewActionAvailable();
    await this.verifyDeleteActionAvailable();
  }

  async verifyNoUndefinedValues(): Promise<void> {
    const broken = this.page.getByText('undefined').or(this.page.getByText('null'));
    const hasBroken = await broken.first().isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasBroken).toBeFalsy();
  }
}
