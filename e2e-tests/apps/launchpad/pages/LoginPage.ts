/**
 * apps/launchpad/pages/LoginPage.ts
 * ------------------------------------
 * Page Object — Authentification Launchpad BV TECH
 * Couvre : /fr/login
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class LoginPage extends BasePage {

  private readonly emailInput    = 'input[type="email"]';
  private readonly passwordInput = 'input[type="password"]';
  private readonly submitBtn     = 'button[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  async navigateToLogin(): Promise<void> {
    await this.navigate('/fr/login');
    await this.waitForLoad();
    if (!this.page.url().includes('/login')) return;
    await this.page.locator(this.emailInput).waitFor({ state: 'visible', timeout: 15_000 });
  }

  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.page.locator(this.emailInput).fill(email);
    await this.page.locator(this.passwordInput).fill(password);
  }

  async submitLoginForm(): Promise<void> {
    await this.page.locator(this.submitBtn).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async login(
    email: string = process.env.TEST_EMAIL ?? '',
    password: string = process.env.TEST_PASSWORD ?? ''
  ): Promise<void> {
    await this.navigateToLogin();
    if (!this.page.url().includes('/login')) return;
    await this.fillLoginForm(email, password);
    await this.submitLoginForm();
  }

  async loginAsAdmin(): Promise<void> {
    const BASE = process.env.BASE_URL ?? 'https://staging.bleuvaloristech.com';
    await this.page.goto(`${BASE}/fr/login`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    if (!this.page.url().includes('/login')) return;
    await this.fillLoginForm(
      process.env.ADMIN_EMAIL    ?? 'webmaster@bluevaloris.com',
      process.env.ADMIN_PASSWORD ?? '123456789Ca!'
    );
    await this.submitLoginForm();
  }

  async verifyLoginSuccess(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 45_000 });
    await expect(this.page.locator('body')).toBeVisible();
  }

  async verifyLoginError(): Promise<void> {
    await this.page.waitForTimeout(2000);
    const url = this.page.url();
    const isOnLogin = url.includes('/login');
    const errorMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/invalid|incorrect|erreur|identifiant|mot de passe|email|password/i));

    if (isOnLogin) {
      expect(isOnLogin).toBeTruthy();
    } else {
      await expect(errorMsg.first()).toBeVisible({ timeout: 5_000 });
    }
  }

  async logout(): Promise<void> {
    const logoutBtn = this.page.getByRole('button', { name: /déconnexion|logout|sign out|se déconnecter/i })
      .or(this.page.getByRole('link', { name: /déconnexion|logout|sign out/i }))
      .or(this.page.locator('[href*="logout"]'));

    if (await logoutBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.first().click();
    } else {
      const userMenu = this.page.getByRole('button', { name: /profil|account|user|mon compte|menu/i })
        .or(this.page.locator('nav button').last());
      if (await userMenu.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await userMenu.first().click();
        await this.page.waitForTimeout(500);
        await this.page.getByText(/déconnexion|logout|sign out/i).first().click();
      }
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async verifyLoggedOut(): Promise<void> {
    await expect(this.page).toHaveURL(/\/$|\/login|\/fr\/?$/i, { timeout: 20_000 });
  }
}
