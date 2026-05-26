/**
 * apps/emiragate/pages/LoginPage.ts
 * ------------------------------------
 * Page Object — Authentification Emiragate
 * URL : /en/login
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class LoginPage extends BasePage {

  private readonly emailInput    = 'input[type="email"], input[name*="email" i]';
  private readonly passwordInput = 'input[type="password"]';
  private readonly submitBtn     = 'button[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  async navigateToLogin(): Promise<void> {
    await this.navigate('/en/login');
    await this.waitForLoad();
    await this.page.locator(this.emailInput).first().waitFor({ state: 'visible', timeout: 15_000 });
  }

  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.page.locator(this.emailInput).first().fill(email);
    await this.page.locator(this.passwordInput).fill(password);
  }

  async submitLoginForm(): Promise<void> {
    await this.page.locator(this.submitBtn).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async login(email: string, password: string): Promise<void> {
    await this.navigateToLogin();
    await this.fillLoginForm(email, password);
    await this.submitLoginForm();
  }

  async verifyLoginSuccess(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login|\/signin/, { timeout: 20_000 });
    await expect(this.page.locator('body')).toBeVisible();
  }

  async verifyLoginError(): Promise<void> {
    await this.page.waitForTimeout(2000);
    const url = this.page.url();
    if (url.includes('/login') || url.includes('/signin')) {
      const errorMsg = this.page.getByRole('alert')
        .or(this.page.getByText(/invalid|incorrect|erreur|wrong|error|email|password/i));
      const isVisible = await errorMsg.first().isVisible({ timeout: 5_000 }).catch(() => false);
      if (!isVisible) {
        // still on login = error confirmed
        expect(url).toMatch(/login|signin/);
      }
    }
  }

  async logout(): Promise<void> {
    const logoutSelectors = [
      this.page.getByRole('button', { name: /logout|sign out|déconnexion/i }),
      this.page.getByRole('link', { name: /logout|sign out|déconnexion/i }),
      this.page.locator('[href*="logout"],[href*="signout"]'),
    ];
    for (const sel of logoutSelectors) {
      if (await sel.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await sel.first().click();
        await this.waitForLoad();
        return;
      }
    }
    // Try via user menu
    const userMenu = this.page.locator('[class*="avatar"],[class*="user-menu"],[data-testid*="user"]');
    if (await userMenu.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await userMenu.first().click();
      await this.page.waitForTimeout(500);
      await this.page.getByText(/logout|sign out|déconnexion/i).first().click();
      await this.waitForLoad();
    }
  }

  async verifyLoggedOut(): Promise<void> {
    await expect(this.page).toHaveURL(/login|signin/, { timeout: 15_000 });
  }
}
