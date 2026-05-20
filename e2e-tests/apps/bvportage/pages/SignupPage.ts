/**
 * pages/SignupPage.ts
 * Gère le formulaire d'inscription des agences
 * 
 * Sélecteurs basés sur l'inspection réelle du DOM (05/2026) :
 *   last_name     → "Saisir votre nom"
 *   first_name    → "Saisir votre prénom"
 *   email         → "Saisir votre email ex. nom@gmail.com"
 *   password      → "••••••••"
 *   confirmPassword → "••••••••"
 *   civility      → input[type="radio"] (Monsieur / Madame)
 *   nationalité   → button custom dropdown "Sélectionnez votre nationalité"
 *   birth_date    → input[type="date"]
 *   submit        → button[type="submit"] "Créer mon compte"
 *   google        → button "Continuer avec Google"
 */
import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class SignupPage extends BasePage {
  // ── Champs du formulaire ──────────────────────────────────────────────────
  readonly lastNameInput        = this.page.locator('input[name="last_name"]');
  readonly firstNameInput       = this.page.locator('input[name="first_name"]');
  readonly emailInput           = this.page.locator('input[name="email"][type="email"]');
  readonly passwordInput        = this.page.locator('input[name="password"]');
  readonly confirmPasswordInput = this.page.locator('input[name="confirmPassword"]');
  readonly birthDateInput       = this.page.locator('input[name="birth_date"]');

  // Civilité → radio buttons (Monsieur / Madame)
  readonly civilityMrRadio      = this.page.locator('input[type="radio"][name="civility"]').first();
  readonly civilityMrsRadio     = this.page.locator('input[type="radio"][name="civility"]').last();

  // Nationalité → bouton custom dropdown
  readonly nationalityButton    = this.page.locator('button:has-text("Sélectionnez votre nationalité")');
  // Pays de résidence → bouton custom dropdown
  readonly countryButton        = this.page.locator('button:has-text("Sélectionnez le pays de votre résidence")');

  // Bouton de soumission
  readonly signupButton         = this.page.locator('button[type="submit"]');

  // Bouton Google
  readonly googleButton         = this.page.locator('button:has-text("Continuer avec Google")');

  // Messages
  readonly errorMessage         = this.page.locator('[role="alert"], .error, .text-red');
  readonly successMessage       = this.page.locator('[role="status"], .success, .text-green');

  // ── Navigation ────────────────────────────────────────────────────────────
  /**
   * Normalise les chemins courts → chemin réel de l'application.
   *   /signup  →  /fr/inscription
   */
  async navigate(path: string = '/fr/inscription'): Promise<void> {
    const map: Record<string, string> = {
      '/signup':      '/fr/inscription',
      '/inscription': '/fr/inscription',
    };
    const normalized = map[path] ?? path;
    await super.navigate(normalized);
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ── Méthodes utilitaires ──────────────────────────────────────────────────

  /**
   * Sélectionne la civilité via les boutons radio.
   * @param civility "M." | "Mme" | "Monsieur" | "Madame"
   */
  async selectCivility(civility: string): Promise<void> {
    const isMme = /^(Mme|Madame)$/i.test(civility.trim());
    if (isMme) {
      await this.civilityMrsRadio.check();
    } else {
      await this.civilityMrRadio.check();
    }
  }

  /**
   * Sélectionne la nationalité dans le custom dropdown.
   * @param nationality Texte de la nationalité, ex. "Française"
   */
  async selectNationality(nationality: string): Promise<void> {
    await this.nationalityButton.click();
    // Attendre l'ouverture du dropdown puis cliquer sur l'option
    await this.page.waitForTimeout(300);
    await this.page.locator(`li:has-text("${nationality}"), [role="option"]:has-text("${nationality}")`).first().click();
  }

  /**
   * Sélectionne le pays de résidence dans le custom dropdown.
   * @param country Texte du pays, ex. "France"
   */
  async selectCountry(country: string): Promise<void> {
    await this.countryButton.click();
    await this.page.waitForTimeout(300);
    await this.page.locator(`li:has-text("${country}"), [role="option"]:has-text("${country}")`).first().click();
  }

  /**
   * Remplit le formulaire d'inscription complet.
   */
  async fillSignupForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    civility?: string;
    nationality?: string;
    birthDate?: string;
    country?: string;
  }): Promise<void> {
    await this.lastNameInput.fill(data.lastName);
    await this.firstNameInput.fill(data.firstName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.password);

    if (data.civility) {
      await this.selectCivility(data.civility);
    }

    if (data.nationality) {
      await this.selectNationality(data.nationality);
    }

    if (data.birthDate) {
      await this.birthDateInput.fill(data.birthDate);
    }

    if (data.country) {
      await this.selectCountry(data.country);
    }
  }

  /**
   * Coche la case des conditions si elle existe (optionnel dans le formulaire réel).
   */
  async acceptTerms(): Promise<void> {
    try {
      const checkbox = this.page.locator('input[type="checkbox"]');
      const visible = await checkbox.isVisible({ timeout: 2000 }).catch(() => false);
      if (visible) {
        await checkbox.check();
      }
    } catch {
      // Pas de checkbox dans cette version du formulaire
    }
  }

  async submitSignup(): Promise<void> {
    await this.signupButton.click();
  }

  async verifySignupSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });
  }

  async verifyValidationError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible({ timeout: 8000 });
  }

  async verifyGoogleButtonExists(): Promise<void> {
    await expect(this.googleButton).toBeVisible();
  }
}
