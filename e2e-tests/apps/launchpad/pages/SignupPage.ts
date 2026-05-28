/**
 * apps/launchpad/pages/SignupPage.ts
 * ------------------------------------
 * Page Object — Activation & Inscription Launchpad BV TECH
 *
 * Flux spécifique Launchpad :
 *   1. Page d'accueil → bouton "Activer Launchpad"
 *   2. Formulaire d'inscription (nom, email, mot de passe, etc.)
 *   3. Vérification email (lien de confirmation)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class SignupPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async gotoHomepage(): Promise<void> {
    await this.navigate('/fr');
    await this.waitForLoad();
    await this.page.waitForTimeout(1500);
  }

  async gotoSignup(): Promise<void> {
    await this.navigate('/fr/signup');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  // =========================================================
  // ACTIVATION LAUNCHPAD
  // =========================================================

  async clickActivateLaunchpad(): Promise<void> {
    const activateBtn = this.page.getByRole('link', { name: /activer launchpad|activer|activate/i })
      .or(this.page.getByRole('button', { name: /activer launchpad|activer|activate/i }))
      .or(this.page.getByText(/activer launchpad/i));
    await expect(activateBtn.first()).toBeVisible({ timeout: 15_000 });
    await activateBtn.first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async verifyActivateButtonVisible(): Promise<void> {
    const activateBtn = this.page.getByRole('link', { name: /activer launchpad|activer|activate/i })
      .or(this.page.getByRole('button', { name: /activer launchpad|activer|activate/i }))
      .or(this.page.getByText(/activer launchpad/i));
    await expect(activateBtn.first()).toBeVisible({ timeout: 20_000 });
  }

  // =========================================================
  // FORMULAIRE D'INSCRIPTION
  // =========================================================

  async verifySignupFormVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/signup|inscription|register/i, { timeout: 20_000 });
    const form = this.page.locator('form')
      .or(this.page.locator('input[type="email"]'));
    await expect(form.first()).toBeVisible({ timeout: 20_000 });
  }

  async fillSignupForm(data: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    password: string;
    confirmPassword?: string;
    phone?: string;
  }): Promise<void> {
    await this.page.waitForTimeout(1500);

    // --- Prénom ---
    const firstNameField = this.page.locator('input[name="firstName"], input[name="first_name"], input[id="firstName"]');
    if (await firstNameField.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await firstNameField.first().fill(data.firstName ?? (data.name?.split(' ')[0] ?? 'Test'));
    }

    // --- Nom ---
    const lastNameField = this.page.locator('input[name="lastName"], input[name="last_name"], input[id="lastName"]');
    if (await lastNameField.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      const parts = (data.name ?? 'Test User').split(' ');
      await lastNameField.first().fill(data.lastName ?? (parts.slice(1).join(' ') || parts[0]));
    }

    // --- Nom complet (fallback) ---
    const fullNameField = this.page.getByLabel(/nom complet|full.?name/i)
      .or(this.page.locator('input[name="name"], input[name="fullName"]'));
    if (await fullNameField.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await fullNameField.first().fill(data.name ?? `${data.firstName ?? 'Test'} ${data.lastName ?? 'User'}`);
    }

    // --- Email ---
    const emailField = this.page.locator('input[type="email"], input[name="email"]');
    await emailField.first().fill(data.email);

    // --- Téléphone ---
    const phoneField = this.page.locator('input[type="tel"], input[name="phone"], input[name="telephone"]')
      .or(this.page.getByLabel(/téléphone|phone|mobile/i));
    if (await phoneField.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await phoneField.first().fill(data.phone ?? '+33612345678');
    }

    // --- Mot de passe ---
    const passwordFields = this.page.locator('input[type="password"]');
    const count = await passwordFields.count();
    if (count >= 1) await passwordFields.first().fill(data.password);
    if (count >= 2) await passwordFields.nth(1).fill(data.confirmPassword ?? data.password);

    // --- CGU / Cases à cocher ---
    const checkboxes = this.page.locator('input[type="checkbox"]');
    const cbCount = await checkboxes.count();
    for (let i = 0; i < cbCount; i++) {
      const cb = checkboxes.nth(i);
      if (await cb.isVisible({ timeout: 500 }).catch(() => false)) {
        if (!(await cb.isChecked())) await cb.check();
      }
    }

    await this.page.waitForTimeout(800);
  }

  async submitSignupForm(): Promise<void> {
    const submitBtn = this.page.locator('button[type="submit"]')
      .or(this.page.getByRole('button', { name: /créer un compte|s'inscrire|register|sign up|continuer|soumettre/i }));
    await submitBtn.first().waitFor({ state: 'visible', timeout: 10_000 });
    try {
      await this.page.waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
          return btn && !btn.disabled;
        },
        { timeout: 8_000 }
      );
    } catch {
      console.warn('Submit button still disabled — attempting click anyway');
    }
    await submitBtn.first().click({ force: true });
    await this.page.waitForLoadState('domcontentloaded');
  }

  // =========================================================
  // VÉRIFICATIONS POST-INSCRIPTION
  // =========================================================

  async verifySignupSuccess(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/signup|\/inscription/, { timeout: 30_000 });
  }

  async verifyConfirmationNotification(): Promise<void> {
    const notification = this.page.getByRole('alert')
      .or(this.page.getByText(/compte créé|inscription réussie|vérifiez votre email|confirmation envoyée|succès/i))
      .or(this.page.locator('[class*="toast"], [class*="success"], [class*="notification"]'));
    await expect(notification.first()).toBeVisible({ timeout: 15_000 });
  }

  async verifySignupError(): Promise<void> {
    await this.page.waitForTimeout(2000);
    const errorMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/déjà utilisé|already exists|email existe|erreur|error/i));
    await expect(errorMsg.first()).toBeVisible({ timeout: 5_000 });
  }
}
