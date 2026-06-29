/**
 * apps/bvtech/pages/AdminUsersPage.ts
 * --------------------------------------
 * Page Object — Gestion des utilisateurs (admin)
 * Couvre : liste des utilisateurs, modification, recherche
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminUsersPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async goto(): Promise<void> {
    await this.navigate('/fr/admin/users');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  // =========================================================
  // LISTE DES UTILISATEURS
  // =========================================================

  async verifyUsersListVisible(): Promise<void> {
    // Vérifier l'URL (langue-agnostique)
    await expect(this.page).toHaveURL(/admin\/users/, { timeout: 15_000 });
    // Vérifier le contenu
    const heading = this.page.getByText(/gestion des utilisateurs|manage users|users management/i)
      .or(this.page.locator('main h1, main h2, h1, h2'));
    await expect(heading.first()).toBeVisible({ timeout: 20_000 });
  }

  async getUsersCount(): Promise<number> {
    await this.page.waitForTimeout(3000);
    // Essai 1 : lignes de tableau
    const rows = this.page.locator('table tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) return rowCount;
    // Essai 2 : cartes utilisateur
    const cards = this.page.locator('[class*="user"], [class*="member"], [class*="card"]');
    const cardCount = await cards.count();
    if (cardCount > 0) return cardCount;
    // Essai 3 : emails visibles
    const emails = this.page.locator('main').getByText(/@/);
    return await emails.count();
  }

  async searchUser(query: string): Promise<void> {
    const searchInput = this.page.getByPlaceholder('Rechercher...')
      .or(this.page.locator('input[placeholder*="Rechercher"]'));

    if (await searchInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.first().fill(query);
      await this.page.waitForTimeout(1000);
    }
  }

  // =========================================================
  // MODIFICATION D'UN UTILISATEUR
  // =========================================================

  // Retourne true si le formulaire d'édition a été ouvert, false sinon
  async clickEditFirstUser(): Promise<boolean> {
    await this.page.waitForTimeout(1000);
    const firstRow = this.page.locator('table tbody tr, [class*="user-row"]').first();
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
    console.log(`📍 Trouvé ${btnCount} boutons dans la ligne user`);

    for (let i = 0; i < Math.min(btnCount, 3); i++) {
      const btn = btns.nth(i);
      if (await btn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await btn.click();
        await this.page.waitForTimeout(1500);
        const url = this.page.url();
        if (url.includes('/payments')) { await this.page.goBack(); continue; }
        const hasForm = await this.page.locator('[role="dialog"], [role="sheet"], form input').first().isVisible({ timeout: 2_000 }).catch(() => false);
        if (hasForm) return true;
      }
    }

    // Cliquer sur la ligne elle-même
    await firstRow.click();
    await this.page.waitForTimeout(1500);
    const hasFormAfterClick = await this.page.locator('[role="dialog"], [role="sheet"], form input').first().isVisible({ timeout: 2_000 }).catch(() => false);
    return hasFormAfterClick;
  }

  async modifyUserField(fieldName: string, newValue: string): Promise<void> {
    const field = this.page.getByLabel(new RegExp(fieldName, 'i'))
      .or(this.page.locator(`input[name="${fieldName}"]`));

    if (await field.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await field.first().clear();
      await field.first().fill(newValue);
    }
  }

  async saveUserModification(): Promise<void> {
    // Si un dialog est ouvert, chercher le bouton dedans d'abord
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
      console.log('ℹ️  Bouton save non trouvé — formulaire peut-être non ouvert');
    }
  }

  async verifyModificationSaved(): Promise<void> {
    const successMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/sauvegardé|enregistré|mis à jour|updated|saved|success|succès|modifié/i))
      .or(this.page.locator('[class*="toast"], [class*="success"], [class*="notification"]'));
    await expect(successMsg.first()).toBeVisible({ timeout: 8_000 });
  }

  async verifyUserInList(identifier: string): Promise<void> {
    const userElement = this.page.getByText(identifier);
    await expect(userElement.first()).toBeVisible({ timeout: 5_000 });
  }
}
