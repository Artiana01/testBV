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

  // Retourne true si le formulaire d'édition a été ouvert, false sinon
  async clickEditFirstPack(): Promise<boolean> {
    await this.page.waitForTimeout(1000);
    const firstRow = this.page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) return false;

    // Chercher bouton edit par texte/label d'abord
    const editByLabel = this.page.getByRole('button', { name: /edit|modifier|éditer/i }).first()
      .or(this.page.locator('[title*="edit" i], [title*="modifier" i], [aria-label*="edit" i], [aria-label*="modifier" i]').first());
    if (await editByLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await editByLabel.click();
      await this.page.waitForTimeout(1500);
      return true;
    }

    // Chercher dans la ligne : tous les boutons/liens cliquables
    const btns = firstRow.locator('button, a');
    const btnCount = await btns.count();
    console.log(`📍 Trouvé ${btnCount} boutons dans la ligne pack`);

    for (let i = 0; i < Math.min(btnCount, 3); i++) {
      const btn = btns.nth(i);
      if (await btn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await btn.click();
        await this.page.waitForTimeout(1500);
        // Vérifier si un formulaire/dialog s'est ouvert
        const hasForm = await this.page.locator('[role="dialog"], [role="sheet"], form input').first().isVisible({ timeout: 2_000 }).catch(() => false);
        if (hasForm) return true;
      }
    }

    // Cliquer sur la ligne elle-même (certaines apps ouvrent un panel)
    await firstRow.click();
    await this.page.waitForTimeout(1500);
    const hasFormAfterClick = await this.page.locator('[role="dialog"], [role="sheet"], form input').first().isVisible({ timeout: 2_000 }).catch(() => false);
    return hasFormAfterClick;
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
    const dialog = this.page.locator('[role="dialog"], [role="sheet"]');
    const inDialog = await dialog.first().isVisible({ timeout: 2_000 }).catch(() => false);
    const scope = inDialog ? dialog.first() : this.page.locator('body');

    const saveBtn = scope.getByRole('button', {
      name: /sauvegarder|enregistrer|save|mettre à jour|update|confirmer|appliquer|valider|soumettre|submit|ok/i,
    }).or(scope.locator('button[type="submit"]'))
      .or(scope.locator('[aria-label*="save"], [aria-label*="sauve"], [aria-label*="enregistr"]'));

    if (await saveBtn.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await saveBtn.first().click();
      await this.page.waitForLoadState('domcontentloaded');
    } else {
      console.log('ℹ️  Bouton save pack non trouvé — formulaire peut-être non ouvert');
    }
  }

  async verifyPackSaved(): Promise<void> {
    const successMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/sauvegardé|enregistré|mis à jour|updated|saved|success|succès|modifié/i))
      .or(this.page.locator('[class*="toast"], [class*="success"], [class*="notification"]'));
    await expect(successMsg.first()).toBeVisible({ timeout: 8_000 });
  }
}
