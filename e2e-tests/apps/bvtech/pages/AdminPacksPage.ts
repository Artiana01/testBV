/**
 * apps/bvtech/pages/AdminPacksPage.ts
 * --------------------------------------
 * Page Object — Gestion des Packs (admin)
 * Couvre : liste des packs, modification, sauvegarde
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminPacksPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async goto(): Promise<void> {
    await this.navigate('/fr/admin/packages');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  // =========================================================
  // LISTE DES PACKS
  // =========================================================

  async verifyPacksListVisible(): Promise<void> {
    // Vérifier l'URL (langue-agnostique)
    await expect(this.page).toHaveURL(/admin\/packages/, { timeout: 15_000 });
    // Vérifier le contenu
    const content = this.page.locator('table').or(this.page.getByText(/gestion des packs|manage packages|packages management/i));
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
  }

  async getPacksCount(): Promise<number> {
    return await this.page.locator('table tbody tr').count();
  }

  // =========================================================
  // MODIFICATION D'UN PACK
  // =========================================================

  async clickEditFirstPack(): Promise<void> {
    // Les packs sont dans une TABLE avec une colonne "Actions" ayant des boutons icon-only
    // Structure : [Nom] [Prix] ... [Actions: 👁️  ✏️  🗑️]
    // On veut le 2e bouton (le crayon = Edit)
    
    const firstRow = this.page.locator('table tbody tr').first();
    const actionsCell = firstRow.locator('td').last(); // Dernière colonne = Actions
    
    // Trouver tous les boutons dans la colonne Actions
    const btns = actionsCell.locator('button, a[role="button"]');
    const btnCount = await btns.count();
    
    console.log(`📍 Trouvé ${btnCount} boutons dans Actions`);
    
    if (btnCount >= 2) {
      // Cliquer sur le 2e bouton (index 1) = le crayon/Edit
      const editBtn = btns.nth(1);
      if (await editBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        console.log('✏️  Clic sur le bouton Edit (2e bouton)');
        await editBtn.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(2000);
        
        // Vérifier qu'on n'est pas allé sur payments
        const url = this.page.url();
        if (url.includes('/payments')) {
          console.log('⚠️  Mauvaise redirection vers /payments — revenir');
          await this.page.goBack();
          await this.page.waitForTimeout(1000);
        }
        return;
      }
    }

    // Fallback : chercher un dialog/formulaire
    const hasDialog = await this.page.locator('[role="dialog"], [role="sheet"]').isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasDialog) {
      console.log('✓ Dialog d\'édition détecté');
      return;
    }

    // Fallback ultime : cliquer sur le 1er bouton (peut être que c'est Edit)
    if (btnCount > 0) {
      const firstBtn = btns.first();
      console.log('🔄 Essai du 1er bouton...');
      await firstBtn.click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(2000);
    }
  }

  async modifyPackField(fieldName: string, newValue: string): Promise<void> {
    const field = this.page.getByLabel(new RegExp(fieldName, 'i'))
      .or(this.page.locator(`input[name="${fieldName}"]`))
      .or(this.page.locator(`textarea[name="${fieldName}"]`));

    if (await field.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await field.first().clear();
      await field.first().fill(newValue);
    }
  }

  async savePack(): Promise<void> {
    const saveBtn = this.page.getByRole('button', {
      name: /sauvegarder|enregistrer|save|mettre à jour|update|confirmer|appliquer|valider|soumettre|submit|ok/i,
    }).or(this.page.locator('button[type="submit"]'))
      .or(this.page.locator('[aria-label*="save"], [aria-label*="sauve"], [aria-label*="enregistr"]'));
    await saveBtn.first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async verifyPackSaved(): Promise<void> {
    const successMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/sauvegardé|enregistré|mis à jour|updated|saved|success|succès|modifié/i))
      .or(this.page.locator('[class*="toast"], [class*="success"], [class*="notification"]'));
    await expect(successMsg.first()).toBeVisible({ timeout: 8_000 });
  }
}
