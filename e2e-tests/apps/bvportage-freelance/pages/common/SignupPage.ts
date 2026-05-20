import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SignupPage extends BasePage {
  // Locators
  readonly nameField = 'input[name*="name"]';
  readonly firstNameField = 'input[name*="first"]';
  readonly lastNameField = 'input[name*="last"]';
  readonly emailField = 'input[type="email"]';
  readonly passwordField = 'input[type="password"]';
  readonly confirmPasswordField = 'input[name*="confirm"]';
  readonly civilityField = 'select[name*="civility"], input[name*="civility"]';
  readonly signupButton = 'button[type="submit"]';
  readonly errorMessage = '.error-message, .alert-danger, [role="alert"]';
  readonly successMessage = '.success-message, .alert-success';
  readonly freelanceChoice = 'button:has-text("Freelance"), label:has-text("Freelance")';

  constructor(page: Page) {
    super(page);
  }

  async fillSignupForm(name: string, email: string, password: string, civility: string = 'M.') {
    // Try different name field combinations
    const nameFields = ['input[name*="name"]', 'input[name*="nom"]', 'input[placeholder*="Nom"]'];
    for (const field of nameFields) {
      if (await this.isVisible(field)) {
        await this.fill(field, name);
        break;
      }
    }

    const emailFields = ['input[type="email"]', 'input[name*="email"]'];
    for (const field of emailFields) {
      if (await this.isVisible(field)) {
        await this.fill(field, email);
        break;
      }
    }

    const pwFields = ['input[type="password"]:nth-of-type(1)', 'input[name*="password"]:not([name*="confirm"])'];
    for (const field of pwFields) {
      if (await this.isVisible(field)) {
        await this.fill(field, password);
        break;
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
    await this.click(this.signupButton);
    await this.page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.isVisible(this.errorMessage);
  }

  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successMessage);
  }

  async isSuccessVisible(): Promise<boolean> {
    return await this.isVisible(this.successMessage);
  }
}
