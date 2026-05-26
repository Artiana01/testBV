/**
 * apps/bvtech/pages/SignupPage.ts
 * ---------------------------------
 * Page Object — Inscription BV Tech
 * Couvre : /fr/signup
 *
 * Le formulaire d'inscription contient les champs :
 * - Nom complet
 * - Email
 * - Mot de passe
 * - (éventuellement) Confirmation mot de passe
 * - (éventuellement) Téléphone
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

  async goto(): Promise<void> {
    await this.navigate('/fr/signup');
    await this.waitForLoad();
    // Attendre que le formulaire soit visible
    await this.page.waitForTimeout(2000);
  }

  // =========================================================
  // FORMULAIRE D'INSCRIPTION
  // =========================================================

  async fillRegistrationForm(data: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    phone?: string;
  }): Promise<void> {
    // Attendre que le formulaire soit pleinement chargé
    await this.page.waitForTimeout(1500);

    // --- Champ Prénom (firstName) ---
    const firstNameField = this.page.locator('input[name="firstName"], input[name="first_name"], input[id="firstName"]');
    if (await firstNameField.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      const parts = data.name.split(' ');
      await firstNameField.first().fill(parts[0]);
    }

    // --- Champ Nom (lastName) ---
    const lastNameField = this.page.locator('input[name="lastName"], input[name="last_name"], input[id="lastName"]');
    if (await lastNameField.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      const parts = data.name.split(' ');
      await lastNameField.first().fill(parts.slice(1).join(' ') || parts[0]);
    }

    // --- Champ Nom complet (si prénom/nom non trouvés séparément) ---
    const fullNameField = this.page.getByLabel(/^nom complet|^full.?name/i)
      .or(this.page.locator('input[name="name"], input[name="fullName"]'));
    if (await fullNameField.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await fullNameField.first().fill(data.name);
    } else {
      // Fallback : premier input[type=text] visible qui n'est pas email
      const allTextInputs = this.page.locator('input[type="text"]:visible');
      const count = await allTextInputs.count();
      if (count > 0) {
        // Vérifier si ce n'est pas déjà rempli
        const firstVal = await allTextInputs.first().inputValue();
        if (!firstVal) {
          await allTextInputs.first().fill(data.name);
        }
      }
    }

    // --- Champ Email ---
    const emailField = this.page.locator('input[type="email"], input[name="email"]');
    await emailField.first().fill(data.email);

    // --- Champ Téléphone (obligatoire ou optionnel) ---
    const phoneField = this.page.locator(
      'input[type="tel"], input[name="phone"], input[name="telephone"], input[name="phoneNumber"]'
    ).or(this.page.getByLabel(/téléphone|phone|mobile|numéro/i));
    if (await phoneField.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await phoneField.first().fill(data.phone ?? '+33612345678');
    }

    // --- Champs Mot de passe ---
    const passwordFields = this.page.locator('input[type="password"]');
    const passwordCount = await passwordFields.count();
    if (passwordCount >= 1) {
      await passwordFields.first().fill(data.password);
    }
    if (passwordCount >= 2) {
      await passwordFields.nth(1).fill(data.confirmPassword ?? data.password);
    }

    // --- Cases à cocher CGU / Conditions (si présentes) ---
    const checkboxes = this.page.locator(
      'input[type="checkbox"][name*="term"], input[type="checkbox"][name*="cgu"], ' +
      'input[type="checkbox"][name*="accept"], input[type="checkbox"][name*="agree"], ' +
      'input[type="checkbox"][name*="condition"]'
    );
    const checkboxCount = await checkboxes.count();
    for (let i = 0; i < checkboxCount; i++) {
      const cb = checkboxes.nth(i);
      if (await cb.isVisible({ timeout: 1000 }).catch(() => false)) {
        const checked = await cb.isChecked();
        if (!checked) await cb.check();
      }
    }
    // Aussi chercher des checkboxes génériques si CGU non trouvées
    if (checkboxCount === 0) {
      const allCheckboxes = this.page.locator('input[type="checkbox"]');
      const allCount = await allCheckboxes.count();
      for (let i = 0; i < allCount; i++) {
        const cb = allCheckboxes.nth(i);
        if (await cb.isVisible({ timeout: 500 }).catch(() => false)) {
          const checked = await cb.isChecked();
          if (!checked) await cb.check();
        }
      }
    }

    // Attendre que les validations réactives se déclenchent
    await this.page.waitForTimeout(800);
  }

  async submitRegistration(): Promise<void> {
    // Trouver le bouton submit
    const submitBtn = this.page.locator('button[type="submit"]')
      .or(this.page.getByRole('button', { name: /créer un compte|s'inscrire|register|sign up|continuer|continue/i }));

    // Attendre que le bouton soit activé (max 10s)
    await submitBtn.first().waitFor({ state: 'visible', timeout: 10_000 });
    
    // Attendre qu'il soit enabled (le formulaire peut avoir des validations async)
    try {
      await this.page.waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
          return btn && !btn.disabled;
        },
        { timeout: 10_000 }
      );
    } catch {
      // Si le bouton reste disabled, loguer et continuer quand même
      console.warn('Submit button still disabled after 10s, trying to click anyway...');
    }

    await submitBtn.first().click({ force: true });
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Inscription complète : navigation + remplissage + soumission
   */
  async register(data: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    phone?: string;
  }): Promise<void> {
    await this.goto();
    await this.fillRegistrationForm(data);
    await this.submitRegistration();
  }

  // =========================================================
  // VÉRIFICATIONS
  // =========================================================

  async verifyRegistrationSuccess(): Promise<void> {
    // Après inscription réussie, on ne doit plus être sur /signup
    await expect(this.page).not.toHaveURL(/\/signup/, { timeout: 45_000 });
  }

  async verifyRedirectToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/dashboard|account|profil/i, { timeout: 15_000 });
  }

  async verifyDashboardVisible(): Promise<void> {
    // Vérifier que le dashboard est affiché avec des éléments visibles
    await expect(this.page.locator('body')).toBeVisible();
    // Chercher des éléments typiques du dashboard
    const dashboardContent = this.page.locator('main, [class*="dashboard"], [class*="content"]');
    await expect(dashboardContent.first()).toBeVisible({ timeout: 20_000 });
  }

  async verifyRegistrationError(): Promise<void> {
    // On reste sur la page signup avec un message d'erreur
    await this.page.waitForTimeout(2000);
    const errorMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/déjà utilisé|already exists|email existe|already registered|erreur|error/i));
    await expect(errorMsg.first()).toBeVisible({ timeout: 5_000 });
  }
}
