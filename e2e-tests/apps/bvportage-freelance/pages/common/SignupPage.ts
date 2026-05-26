import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SignupPage extends BasePage {
  // Selectors matching the actual BV Portage DOM
  readonly nameField = 'input[name*="name"], input[name*="nom"], input[placeholder*="Nom" i], input[placeholder*="votre nom" i]';
  readonly firstNameField = 'input[name*="first"], input[name*="prenom"], input[placeholder*="prénom" i], input[placeholder*="prenom" i]';
  readonly lastNameField = 'input[name*="last"], input[name*="nom"], input[placeholder*="nom" i]';
  readonly emailField = 'input[type="email"], input[name="email"], input[placeholder*="@"]';
  readonly passwordField = 'input[type="password"]';
  readonly confirmPasswordField = 'input[name*="confirm"], input[type="password"]:nth-of-type(2)';
  readonly civilityField = 'select[name*="civility"], input[type="radio"][name*="civility"], input[name*="civility"]';
  readonly signupButton = 'button[type="submit"], button:has-text("Créer mon compte"), button:has-text("S\'inscrire"), button:has-text("Inscription")';
  readonly errorMessage = '[role="alert"], .error-message, .alert-danger, .text-red-500, .text-destructive';
  readonly successMessage = '[role="status"], [role="alert"]:has-text("succès"), .success-message, .alert-success, .text-green';
  readonly freelanceChoice = 'button:has-text("Freelance"), label:has-text("Freelance"), input[value="freelance"], input[value="Freelance"]';

  constructor(page: Page) {
    super(page);
  }

  async fillSignupForm(name: string, email: string, password: string, civility: string = 'M.') {
    // Last name — BV Portage uses placeholder "Saisir votre nom"
    const lastNameLocator = this.page.locator([
      'input[name="last_name"]', 'input[name="lastName"]', 'input[name="nom"]',
      'input[placeholder*="votre nom" i]', 'input[placeholder*="nom" i]',
      'input[name*="name"]:not([name*="email"])',
    ].join(', ')).first();
    if (await lastNameLocator.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await lastNameLocator.click();
      await lastNameLocator.fill(name);
    }

    // First name — BV Portage uses placeholder "Saisir votre prénom"
    const firstNameLocator = this.page.locator([
      'input[name="first_name"]', 'input[name="firstName"]', 'input[name="prenom"]',
      'input[placeholder*="votre pr" i]', 'input[placeholder*="prénom" i]', 'input[placeholder*="prenom" i]',
    ].join(', ')).first();
    if (await firstNameLocator.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await firstNameLocator.click();
      await firstNameLocator.fill(name);
    }

    // Civility radio button (M./Monsieur by default)
    const civilityMr = this.page.locator('input[type="radio"][value="M"], input[type="radio"][value="M."], input[type="radio"][name*="civility"]').first();
    if (await civilityMr.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await civilityMr.check().catch(() => {});
    }

    // Birth date (required on BV Portage signup)
    const birthDateInput = this.page.locator('input[type="date"], input[name="birth_date"], input[name="birthDate"]').first();
    if (await birthDateInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await birthDateInput.fill('1990-01-15').catch(() => {});
    }

    // Nationality dropdown (required on BV Portage signup)
    const nationalityBtn = this.page.locator('button:has-text("Sélectionnez votre nationalité"), button:has-text("Nationalité"), select[name*="national"]').first();
    if (await nationalityBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await nationalityBtn.click();
      await this.page.waitForTimeout(300);
      const searchInput = this.page.locator('input[placeholder*="pays" i], input[placeholder*="recherch" i]').first();
      if (await searchInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await searchInput.fill('France');
        await this.page.waitForTimeout(300);
      }
      const option = this.page.locator('li:has-text("France"), [role="option"]:has-text("France")').first();
      if (await option.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await option.click();
      }
    }

    // Email — use pressSequentially fallback for React controlled inputs
    const emailLocator = this.page.locator('input[type="email"], input[name="email"], input[placeholder*="@"]').first();
    await emailLocator.waitFor({ state: 'visible', timeout: 10_000 });
    await emailLocator.click();
    await emailLocator.fill(email);
    const filledEmail = await emailLocator.inputValue().catch(() => '');
    if (filledEmail !== email) {
      await emailLocator.clear();
      await emailLocator.pressSequentially(email, { delay: 30 });
    }

    // Password
    if (password) {
      const pwLocator = this.page.locator('input[type="password"]').first();
      await pwLocator.click();
      await pwLocator.fill(password);
      const filledPw = await pwLocator.inputValue().catch(() => '');
      if (filledPw !== password) {
        await pwLocator.clear();
        await pwLocator.pressSequentially(password, { delay: 30 });
      }

      // Confirm password if present
      const confirmLocator = this.page.locator('input[type="password"]').nth(1);
      if (await confirmLocator.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await confirmLocator.fill(password);
      }
    }
  }

  async selectCivility(civility: string) {
    if (await this.isVisible(this.civilityField)) {
      await this.click(this.civilityField);
      await this.click(`text="${civility}"`);
    }
  }

  async selectFreelance() {
    if (await this.isVisible(this.freelanceChoice)) {
      await this.click(this.freelanceChoice);
    }
  }

  async submit() {
    const btn = this.page.locator(this.signupButton).first();
    await btn.click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 60_000 }).catch(() => {});
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  async isErrorVisible(): Promise<boolean> {
    // Use locator with timeout so we wait for the server response
    const locator = this.page.locator(this.errorMessage).first();
    return await locator.isVisible({ timeout: 10_000 }).catch(() => false);
  }

  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successMessage);
  }

  // Success = redirect away from /inscription OR visible success toast/banner
  async isSuccessVisible(): Promise<boolean> {
    // Wait for either a redirect or a success indicator (up to 15s for server round-trip)
    try {
      await this.page.waitForURL(
        url => !url.includes('/inscription') && !url.includes('/signup'),
        { timeout: 15_000 }
      );
      return true;
    } catch {
      // No redirect — check for a visible success message
    }

    const toastOrBanner = this.page.locator(
      '[role="status"], [role="alert"]:not(:has-text("erreur")):not(:has-text("error")), ' +
      '.toast, .notification, .success-message, .alert-success, .text-green, [class*="success"]'
    ).first();
    return await toastOrBanner.isVisible({ timeout: 5_000 }).catch(() => false);
  }
}
