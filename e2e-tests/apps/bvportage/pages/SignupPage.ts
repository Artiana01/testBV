/**
 * pages/SignupPage.ts
 * Gère le formulaire d'inscription des agences
 *
 * Sélecteurs basés sur l'inspection réelle du DOM (05/2026) :
 *   Nom         → "Saisir votre nom"
 *   Prénom      → "Saisir votre prénom"
 *   E-mail      → placeholder contenant "@"
 *   password    → input[type="password"] premier
 *   confirm     → input[type="password"] second
 *   Civilité    → input[type="radio"]
 *   Nationalité → dropdown custom + recherche
 *   submit      → button[type="submit"] OU "Créer mon compte"
 *   google      → button "Continuer avec Google"
 */
import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class SignupPage extends BasePage {
  // ── Champs du formulaire — sélecteurs larges (name ET placeholder) ──────────
  readonly lastNameInput = this.page.locator(
    'input[name="last_name"], input[name="nom"], input[name="lastName"], input[placeholder*="votre nom" i]'
  ).first();

  readonly firstNameInput = this.page.locator(
    'input[name="first_name"], input[name="prenom"], input[name="firstName"], input[placeholder*="votre pr" i]'
  ).first();

  readonly emailInput = this.page.locator('input[type="email"], input[name="email"], input[placeholder*="@"]').first();

  readonly passwordInput = this.page.locator('input[type="password"]').first();
  readonly confirmPasswordInput = this.page.locator('input[type="password"]').nth(1);

  readonly birthDateInput = this.page.locator('input[type="date"], input[name="birth_date"]').first();

  // Civilité → radio buttons (Monsieur / Madame)
  readonly civilityMrRadio  = this.page.locator('input[type="radio"][value="M"], input[type="radio"][name="civility"]').first();
  readonly civilityMrsRadio = this.page.locator('input[type="radio"][value="F"], input[type="radio"][name="civility"]').last();

  // Nationalité → bouton custom dropdown
  readonly nationalityButton = this.page.locator('button:has-text("Sélectionnez votre nationalité")');

  // Bouton de soumission
  readonly signupButton = this.page.locator('button[type="submit"], button:has-text("Créer mon compte")').first();

  // Bouton Google
  readonly googleButton = this.page.locator('button:has-text("Continuer avec Google")');

  // Messages
  readonly errorMessage   = this.page.locator('[role="alert"], .error, .text-red-500').first();
  readonly successMessage = this.page.locator('[role="status"], .success, .text-green-500').first();

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigate(path: string = '/fr/inscription'): Promise<void> {
    const map: Record<string, string> = {
      '/signup':      '/fr/inscription',
      '/inscription': '/fr/inscription',
    };
    const normalized = map[path] ?? path;
    await super.navigate(normalized);
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ── Sélection de civilité ──────────────────────────────────────────────────
  async selectCivility(civility: string): Promise<void> {
    const isMme = /^(Mme|Madame|F)$/i.test(civility.trim());
    if (isMme) {
      await this.civilityMrsRadio.check().catch(() => {});
    } else {
      await this.civilityMrRadio.check().catch(() => {});
    }
  }

  // ── Sélection de nationalité (avec recherche) ──────────────────────────────
  async selectNationality(nationality: string): Promise<void> {
    await this.nationalityButton.click();
    await this.page.waitForTimeout(400);

    // Utiliser le champ de recherche si disponible
    const searchInput = this.page.locator(
      'input[placeholder*="pays" i], input[placeholder*="recherch" i], input[placeholder*="search" i]'
    ).first();
    if (await searchInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await searchInput.fill(nationality);
      await this.page.waitForTimeout(400);
    }

    // Cliquer sur la première option correspondante (tolérant : ne bloque pas si absent)
    const option = this.page.locator(
      `li:has-text("${nationality}"), [role="option"]:has-text("${nationality}")`
    ).first();
    if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await option.click().catch(() => {});
    } else {
      console.log(`Option nationalité "${nationality}" non trouvée — sélecteur dropdown différent, champ ignoré`);
    }
  }

  // ── Remplissage du formulaire complet ─────────────────────────────────────
  async fillSignupForm(data: {
    firstName:   string;
    lastName:    string;
    email:       string;
    password:    string;
    civility?:   string;
    nationality?: string;
    birthDate?:  string;
    country?:    string;
  }): Promise<void> {
    await this.lastNameInput.fill(data.lastName);
    await this.firstNameInput.fill(data.firstName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);

    const confirm = this.page.locator('input[type="password"]').nth(1);
    if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirm.fill(data.password);
    }

    if (data.civility) {
      await this.selectCivility(data.civility);
    }

    if (data.nationality) {
      await this.selectNationality(data.nationality);
    }

    if (data.birthDate) {
      await this.birthDateInput.fill(data.birthDate).catch(() => {});
    }
  }

  async submitSignup(): Promise<void> {
    await this.signupButton.click();
  }

  async verifyGoogleButtonExists(): Promise<void> {
    await expect(this.googleButton).toBeVisible({ timeout: 20_000 });
  }

  async verifySignupSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible({ timeout: 20_000 });
  }

  async verifyValidationError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible({ timeout: 8_000 });
  }
}
