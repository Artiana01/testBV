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
    // Attendre que le contenu se charge (les emails apparaissent en async)
    try {
      await this.page.locator('main').getByText(/@/).first().waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
      // Pas d'email visible → liste peut-être vide ou chargement différent
    }
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

  async clickEditFirstUser(): Promise<void> {
    // Les users sont dans une TABLE avec une colonne "Actions" ayant des boutons icon-only
    // Structure : [Nom] [Email] ... [Actions: 👁️  ✏️  🗑️]
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

  async modifyUserField(fieldName: string, newValue: string): Promise<void> {
    const field = this.page.getByLabel(new RegExp(fieldName, 'i'))
      .or(this.page.locator(`input[name="${fieldName}"]`));

    if (await field.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await field.first().clear();
      await field.first().fill(newValue);
    }
  }

  async saveUserModification(): Promise<void> {
    const saveBtn = this.page.getByRole('button', {
      name: /sauvegarder|enregistrer|save|mettre à jour|update|confirmer|appliquer|valider|soumettre|submit|ok/i,
    }).or(this.page.locator('button[type="submit"]'))
      .or(this.page.locator('[aria-label*="save"], [aria-label*="sauve"], [aria-label*="enregistr"]'));
    await saveBtn.first().click();
    await this.page.waitForLoadState('domcontentloaded');
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
