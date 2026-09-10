/**
 * apps/buildnivo/pages/LoginPage.ts
 * -----------------------------------
 * Page Object — Authentification BuildNivo (/connexion, /inscription,
 * /mot-de-passe-oublie).
 *
 * Sélecteurs : le champ "login" accepte email OU nom d'utilisateur
 * (id="login-email"), le mot de passe est id="login-password".
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class LoginPage extends BasePage {

  private readonly loginInput    = '#login-email';
  private readonly passwordInput = '#login-password';
  private readonly submitBtn     = 'button[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async navigateToLogin(): Promise<void> {
    await this.page.goto('/connexion', { waitUntil: 'networkidle', timeout: 45_000 });
    // Déjà connecté via storageState → redirigé hors de /connexion
    if (!this.page.url().includes('/connexion')) return;
    await this.page.locator(this.loginInput).waitFor({ state: 'visible', timeout: 15_000 });
  }

  async navigateToSignup(): Promise<void> {
    await this.page.goto('/inscription', { waitUntil: 'domcontentloaded', timeout: 45_000 });
  }

  async navigateToForgotPassword(): Promise<void> {
    await this.page.goto('/connexion', { waitUntil: 'networkidle', timeout: 45_000 });
    await this.page.getByRole('button', { name: /mot de passe oublié/i }).click();
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async fillLoginForm(login: string, password: string): Promise<void> {
    const loginField = this.page.locator(this.loginInput);
    await loginField.click();
    await loginField.fill(login);
    if ((await loginField.inputValue().catch(() => '')) !== login) {
      await loginField.clear();
      await loginField.pressSequentially(login, { delay: 30 });
    }

    const passwordField = this.page.locator(this.passwordInput);
    await passwordField.click();
    await passwordField.fill(password);
    if ((await passwordField.inputValue().catch(() => '')) !== password) {
      await passwordField.clear();
      await passwordField.pressSequentially(password, { delay: 30 });
    }
  }

  async submitLoginForm(): Promise<void> {
    await this.page.locator(this.submitBtn).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async login(login: string, password: string): Promise<void> {
    await this.navigateToLogin();
    if (!this.page.url().includes('/connexion')) return;
    await this.fillLoginForm(login, password);
    await this.submitLoginForm();
  }

  // =========================================================
  // VÉRIFICATIONS
  // =========================================================

  async verifyLoginSuccess(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/connexion/, { timeout: 45_000 });
    await expect(this.page.locator('body')).toBeVisible();
  }

  async verifyLoginError(): Promise<void> {
    // On doit rester sur /connexion, et/ou un message d'erreur doit apparaître
    await this.page.waitForTimeout(1500);
    const url = this.page.url();
    const isOnLogin = url.includes('/connexion');
    const errorMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/incorrect|invalide|erreur|identifiants/i));

    if (isOnLogin) {
      expect(isOnLogin).toBeTruthy();
    } else {
      await expect(errorMsg.first()).toBeVisible({ timeout: 5_000 });
    }
  }

  async verifyThrottled(): Promise<void> {
    const throttleMsg = this.page.getByText(/trop de tentatives|too many|réessayer plus tard|patientez/i);
    await expect(throttleMsg.first()).toBeVisible({ timeout: 10_000 });
  }
}
