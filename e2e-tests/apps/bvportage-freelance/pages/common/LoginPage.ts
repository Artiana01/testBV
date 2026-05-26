import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Selectors matching the actual BV Portage DOM
  // Email: placeholder "johndoe@gmail.com" (or type=email)
  readonly emailField = 'input[type="email"], input[placeholder*="@"], input[name="email"]';
  // Password: placeholder "••••••••" (or type=password)
  readonly passwordField = 'input[type="password"], input[name="password"]';
  // Submit: "Continuer avec mon adresse e-mail" OR type=submit
  readonly loginButton = [
    'button:has-text("Continuer avec mon adresse e-mail")',
    'button[type="submit"]',
    'input[type="submit"]',
  ].join(', ');
  readonly errorMessage = '[role="alert"], .error-message, .alert-danger, .text-red-500, .text-destructive';
  readonly signupLink = 'a:has-text("inscription"), a[href*="signup"], a[href*="inscription"]';

  constructor(page: Page) {
    super(page);
  }

  async login(email: string, password: string) {
    // Sélecteurs précis basés sur l'inspection DOM réelle de BV Portage
    const emailInput = this.page.getByPlaceholder('johndoe@gmail.com');
    await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
    await emailInput.click();
    await emailInput.fill(email);
    // Fallback pressSequentially si fill ignoré par React (input contrôlé)
    const filledEmail = await emailInput.inputValue().catch(() => '');
    if (filledEmail !== email) {
      await emailInput.clear();
      await emailInput.pressSequentially(email, { delay: 30 });
    }

    const pwInput = this.page.locator('input[type="password"]').first();
    await pwInput.click();
    await pwInput.fill(password);

    // Bouton "Continuer avec mon adresse e-mail" (texte exact du DOM)
    const submitBtn = this.page.getByRole('button', { name: /Continuer avec mon adresse e-mail/i });
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await this.page.locator('button[type="submit"]').first().click().catch(async () => {
        await this.page.keyboard.press('Enter');
      });
    }

    await this.page.waitForURL(url => !url.includes('/connexion') && !url.includes('/login'), { timeout: 60_000 }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  // The BV Portage site has no "Freelance" profile button — this is a no-op
  async chooseFreelanceProfile() {
    const freelanceBtn = this.page.locator('button:has-text("Freelance"), label:has-text("Freelance")').first();
    if (await freelanceBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await freelanceBtn.click();
      await this.page.waitForURL(url => !url.includes('/connexion') && !url.includes('/login'), { timeout: 15_000 }).catch(() => {});
    }
    // If button doesn't exist, just continue — no profile selection needed
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.isVisible(this.errorMessage);
  }

  async goToSignup() {
    await this.click(this.signupLink);
    await this.page.waitForLoadState('domcontentloaded', { timeout: 60_000 }).catch(() => {});
  }
}
