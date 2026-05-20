import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Locators
  readonly emailField = 'input[name="email"]';
  readonly passwordField = 'input[name="password"]';
  readonly loginButton = 'button[type="submit"]';
  readonly errorMessage = '.error-message, .alert-danger, [role="alert"]';
  readonly freelanceChoice = 'button:has-text("Freelance")';
  readonly signupLink = 'a:has-text("inscription"), a[href*="signup"]';

  constructor(page: Page) {
    super(page);
  }

  async login(email: string, password: string) {
    await this.fill(this.emailField, email);
    await this.fill(this.passwordField, password);
    await this.click(this.loginButton);
    await this.page.waitForURL(url => !url.includes('/connexion'), { timeout: 30000 }).catch(() => {});
    await this.page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});
  }

  async chooseFreelanceProfile() {
    await this.click(this.freelanceChoice);
    await this.page.waitForURL(url => !url.includes('/connexion'), { timeout: 30000 }).catch(() => {});
    await this.page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.isVisible(this.errorMessage);
  }

  async goToSignup() {
    await this.click(this.signupLink);
    await this.page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  }
}
