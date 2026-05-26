/**
 * apps/bvtech/pages/ProfilePage.ts
 * -----------------------------------
 * Page Object — Profil utilisateur BV Tech
 * Couvre : page profil dans le dashboard
 *
 * Éléments attendus :
 * - Informations utilisateur (nom, email, téléphone)
 * - Formulaire de modification
 * - Bouton sauvegarder
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class ProfilePage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async goto(): Promise<void> {
    await this.navigate('/fr/profile');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  // =========================================================
  // AFFICHAGE DES INFORMATIONS
  // =========================================================

  async verifyProfilePageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/fr\/profile/, { timeout: 20_000 });
    // Utiliser getByRole('heading') pour éviter le mode strict (breadcrumb + h1 tous les deux présents)
    await expect(this.page.getByRole('heading', { name: 'Profil utilisateur' })).toBeVisible({ timeout: 20_000 });
  }

  async verifyUserInfoDisplayed(): Promise<void> {
    // Vérifier que les champs d'information utilisateur sont visibles
    const inputs = this.page.locator('input, [class*="info"], [class*="detail"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  }

  // =========================================================
  // MODIFICATION DU PROFIL
  // =========================================================

  async updateName(newName: string): Promise<void> {
    const textInput = this.page.locator(
      'input[type="text"], input[type="tel"], input:not([type="file"]):not([type="hidden"]):not([type="email"]):not([type="checkbox"]):not([type="radio"]):not([type="password"])'
    ).first();

    // Si déjà enabled (pas de bouton "Modifier" nécessaire), remplir directement
    if (await textInput.isEnabled().catch(() => false)) {
      await textInput.clear();
      await textInput.fill(newName);
      return;
    }

    // Essayer chaque bouton "Modifier" jusqu'à ce que l'input devienne enabled
    // (le 1er déverrouille les infos, le 2e ouvre le sélecteur de photo — l'ordre varie)
    const modifierBtns = this.page.getByRole('button', { name: /modifier/i });
    const btnCount = await modifierBtns.count();

    for (let i = 0; i < btnCount; i++) {
      await modifierBtns.nth(i).click();
      await this.page.waitForTimeout(800);
      if (await textInput.isEnabled().catch(() => false)) break;
    }

    // Vérifier que l'input est bien activé avant de remplir
    await expect(textInput).toBeEnabled({ timeout: 8_000 });
    await textInput.clear();
    await textInput.fill(newName);
  }

  async updatePhone(newPhone: string): Promise<void> {
    const phoneField = this.page.getByLabel(/téléphone|phone|tel|mobile/i)
      .or(this.page.locator('input[type="tel"]'))
      .or(this.page.locator('input[name="phone"]'))
      .or(this.page.locator('input[name="telephone"]'));

    if (await phoneField.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await phoneField.first().clear();
      await phoneField.first().fill(newPhone);
    }
  }

  async saveProfile(): Promise<void> {
    const saveBtn = this.page.getByRole('button', { name: /sauvegarder|enregistrer|save|mettre à jour|update/i })
      .or(this.page.locator('button[type="submit"]'));
    await saveBtn.first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async verifyProfileSaved(): Promise<void> {
    // Chercher un message de succès (toast, alert, ou texte)
    const successMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/sauvegardé|enregistré|mis à jour|updated|saved|success|succès/i))
      .or(this.page.locator('[class*="toast"], [class*="success"], [class*="notification"]'));
    await expect(successMsg.first()).toBeVisible({ timeout: 8_000 });
  }

  async verifyDataPersistence(expectedName: string): Promise<void> {
    // Recharger la page et vérifier que le nom apparaît sur la page
    await this.page.reload();
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);

    // Le nom peut être affiché comme texte (champs verrouillés par défaut)
    // ou dans un input après avoir cliqué "Modifier"
    const nameText = this.page.getByText(expectedName, { exact: false });
    if (await nameText.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(nameText.first()).toBeVisible();
      return;
    }

    // Sinon déverrouiller les champs et lire la valeur
    const textInput = this.page.locator(
      'input[type="text"], input:not([type="file"]):not([type="hidden"]):not([type="email"]):not([type="checkbox"]):not([type="radio"]):not([type="password"])'
    ).first();

    if (!(await textInput.isEnabled().catch(() => false))) {
      const modifierBtns = this.page.getByRole('button', { name: /modifier/i });
      const btnCount = await modifierBtns.count();
      for (let i = 0; i < btnCount; i++) {
        await modifierBtns.nth(i).click();
        await this.page.waitForTimeout(800);
        if (await textInput.isEnabled().catch(() => false)) break;
      }
    }

    await expect(textInput).toBeEnabled({ timeout: 8_000 });
    const value = await textInput.inputValue();
    expect(value).toContain(expectedName);
  }
}
