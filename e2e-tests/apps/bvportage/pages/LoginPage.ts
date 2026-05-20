/**
 * pages/LoginPage.ts
 * Gère le formulaire de connexion BV Portage
 * URL réelle : /fr/connexion
 */
import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class LoginPage extends BasePage {
  // Sélecteurs exacts basés sur l'inspection du DOM réel
  readonly emailInput    = this.page.getByPlaceholder('johndoe@gmail.com');
  readonly passwordInput = this.page.getByPlaceholder('••••••••').first();
  readonly loginButton   = this.page.getByRole('button', { name: /Continuer avec mon adresse e-mail/i });
  readonly errorMessage  = this.page.locator('[role="alert"], .error, .text-red-500');

  async navigate(path = '/fr/connexion') {
    // Normaliser les anciens chemins /login → /fr/connexion
    const normalized = path === '/login' ? '/fr/connexion' : path;
    await super.navigate(normalized);
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    // Attendre la navigation hors de la page de connexion
    await this.page.waitForURL(url => !url.includes('/connexion'), { timeout: 30_000 }).catch(() => {});
    await this.page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});
  }

  async verifyLoginError() {
    await expect(this.errorMessage).toBeVisible({ timeout: 8000 });
  }
}
