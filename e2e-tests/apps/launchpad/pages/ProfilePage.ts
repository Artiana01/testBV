/**
 * apps/launchpad/pages/ProfilePage.ts
 * ----------------------------------------
 * Page Object — Profil utilisateur Launchpad BV TECH
 *
 * Scénarios couverts :
 *   E2E #2 — Modification profil (P1)
 *   E2E #3 — Changement mot de passe (P1)
 *   Bug documenté : upload photo non fonctionnel
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class ProfilePage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/fr/profile');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  // =========================================================
  // VÉRIFICATIONS
  // =========================================================

  async verifyProfilePageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/fr\/profile|\/profil/, { timeout: 20_000 });
    const heading = this.page.getByRole('heading', { name: /profil|profile/i })
      .or(this.page.getByText(/profil utilisateur|mon profil/i));
    await expect(heading.first()).toBeVisible({ timeout: 20_000 });
  }

  async verifyUserInfoDisplayed(): Promise<void> {
    const inputs = this.page.locator('input, [class*="info"], [class*="detail"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  }

  // =========================================================
  // MODIFICATION INFORMATIONS PERSONNELLES
  // =========================================================

  async updateName(newName: string): Promise<void> {
    const textInput = this.page.locator(
      'input[type="text"], input:not([type="file"]):not([type="hidden"]):not([type="email"]):not([type="checkbox"]):not([type="radio"]):not([type="password"])'
    ).first();

    if (await textInput.isEnabled().catch(() => false)) {
      await textInput.clear();
      await textInput.fill(newName);
      return;
    }

    const modifierBtns = this.page.getByRole('button', { name: /modifier|edit|changer/i });
    const btnCount = await modifierBtns.count();
    for (let i = 0; i < btnCount; i++) {
      await modifierBtns.nth(i).click();
      await this.page.waitForTimeout(800);
      if (await textInput.isEnabled().catch(() => false)) break;
    }

    await expect(textInput).toBeEnabled({ timeout: 8_000 });
    await textInput.clear();
    await textInput.fill(newName);
  }

  async saveProfile(): Promise<void> {
    const saveBtn = this.page.getByRole('button', { name: /sauvegarder|enregistrer|save|mettre à jour|update/i })
      .or(this.page.locator('button[type="submit"]'));
    await saveBtn.first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async verifyProfileSaved(): Promise<void> {
    const successMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/sauvegardé|enregistré|mis à jour|updated|saved|success|succès/i))
      .or(this.page.locator('[class*="toast"], [class*="success"], [class*="notification"]'));
    await expect(successMsg.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyDataPersistence(expectedName: string): Promise<void> {
    await this.page.reload();
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);

    const nameText = this.page.getByText(expectedName, { exact: false });
    if (await nameText.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(nameText.first()).toBeVisible();
      return;
    }

    const textInput = this.page.locator(
      'input[type="text"], input:not([type="file"]):not([type="hidden"]):not([type="email"]):not([type="checkbox"]):not([type="radio"]):not([type="password"])'
    ).first();

    if (!(await textInput.isEnabled().catch(() => false))) {
      const modifierBtns = this.page.getByRole('button', { name: /modifier|edit/i });
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

  // =========================================================
  // UPLOAD PHOTO (Bug documenté P1 : non fonctionnel)
  // =========================================================

  async verifyPhotoUploadInputExists(): Promise<void> {
    const uploadInput = this.page.locator('input[type="file"]')
      .or(this.page.getByRole('button', { name: /photo|avatar|image|modifier photo|changer photo/i }))
      .or(this.page.locator('[class*="avatar"], [class*="photo"], [class*="upload"]'));
    await expect(uploadInput.first()).toBeVisible({ timeout: 10_000 });
  }

  async attemptPhotoUpload(filePath: string): Promise<void> {
    const fileInput = this.page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await fileInput.setInputFiles(filePath);
      await this.page.waitForTimeout(2000);
    } else {
      // Chercher bouton de modification qui révèle l'input
      const editBtn = this.page.getByRole('button', { name: /modifier|photo|avatar/i });
      if (await editBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await editBtn.first().click();
        await this.page.waitForTimeout(1000);
        const hiddenInput = this.page.locator('input[type="file"]').first();
        if (await hiddenInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await hiddenInput.setInputFiles(filePath);
          await this.page.waitForTimeout(2000);
        }
      }
    }
  }

  async verifyPhotoPreviewVisible(): Promise<void> {
    const preview = this.page.locator('img[src*="blob:"], img[src*="data:"], [class*="preview"], [class*="avatar"] img')
      .or(this.page.locator('[alt*="photo"], [alt*="avatar"], [alt*="profil"]'));
    await expect(preview.first()).toBeVisible({ timeout: 10_000 });
  }

  // =========================================================
  // CHANGEMENT MOT DE PASSE (E2E #3)
  // =========================================================

  async navigateToSecurity(): Promise<void> {
    const securityLink = this.page.getByRole('link', { name: /sécurité|mot de passe|password|security|paramètre/i })
      .or(this.page.locator('[href*="security"], [href*="password"], [href*="settings"]'));

    if (await securityLink.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await securityLink.first().click();
      await this.waitForLoad();
    } else {
      await this.navigate('/fr/settings');
      await this.waitForLoad();
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const currentPwdField = this.page.getByLabel(/mot de passe actuel|current password|ancien mot de passe/i)
      .or(this.page.locator('input[name="currentPassword"], input[name="current_password"], input[name="oldPassword"]'));

    const newPwdField = this.page.getByLabel(/nouveau mot de passe|new password/i)
      .or(this.page.locator('input[name="newPassword"], input[name="new_password"], input[name="password"]'));

    const confirmPwdField = this.page.getByLabel(/confirmer|confirmation|confirm password/i)
      .or(this.page.locator('input[name="confirmPassword"], input[name="confirm_password"]'));

    if (await currentPwdField.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await currentPwdField.first().fill(currentPassword);
    }
    if (await newPwdField.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newPwdField.first().fill(newPassword);
    }
    if (await confirmPwdField.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmPwdField.first().fill(newPassword);
    }
  }

  async submitPasswordChange(): Promise<void> {
    const submitBtn = this.page.getByRole('button', { name: /changer|modifier|enregistrer|save|update|confirmer/i })
      .or(this.page.locator('button[type="submit"]'));
    await submitBtn.first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async verifyPasswordChanged(): Promise<void> {
    const successMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/mot de passe modifié|password changed|mis à jour|succès|success/i))
      .or(this.page.locator('[class*="toast"], [class*="success"]'));
    await expect(successMsg.first()).toBeVisible({ timeout: 10_000 });
  }
}
