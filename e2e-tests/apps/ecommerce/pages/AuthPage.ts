/**
 * apps/ecommerce/pages/AuthPage.ts
 * ---------------------------------
 * Page Object - Authentification (app Atelier)
 * Couvre : /auth/login, /auth/register, /auth/forgot-password
 *
 * Sélecteurs validés sur l'HTML réel de l'application.
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AuthPage extends BasePage {

  // --- Login - sélecteurs Atelier ---
  // Utilise le type plutôt que l'id : Base UI peut déplacer l'id sur un wrapper lors de l'hydratation
  private readonly emailInput    = 'input[type="email"]';
  private readonly passwordInput = 'input[type="password"]';
  private readonly submitLogin   = 'button[type="submit"]';

  // --- Register ---
  private readonly nameInput      = 'input[type="text"]';  // premier champ texte
  private readonly confirmPwInput = '#confirmPassword';

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async navigateToLogin(): Promise<void> {
    await this.navigate('/auth/login');
    await this.waitForLoad();
    // La page login est un Client Component - attendre que React hydrate le formulaire
    await this.page.locator(this.emailInput).waitFor({ state: 'visible', timeout: 10_000 });
  }

  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.page.locator(this.emailInput).fill(email);
    await this.page.locator(this.passwordInput).fill(password);
  }

  async submitLoginForm(): Promise<void> {
    await this.page.locator(this.submitLogin).click();
    await this.page.waitForLoadState('load');
  }

  /**
   * Connexion complète : navigation + remplissage + soumission.
   */
  async login(
    email: string = process.env.TEST_EMAIL ?? '',
    password: string = process.env.TEST_PASSWORD ?? ''
  ): Promise<void> {
    await this.navigateToLogin();
    await this.fillLoginForm(email, password);
    await this.submitLoginForm();
  }

  async loginAsAdmin(): Promise<void> {
    await this.login(
      process.env.ADMIN_EMAIL ?? 'admin@test.com',
      process.env.ADMIN_PASSWORD ?? 'Admin123!'
    );
  }

  async verifyLoginSuccess(): Promise<void> {
    // Vérifier qu'on n'est plus sur la page login
    await expect(this.page).not.toHaveURL(/auth\/login/, { timeout: 8_000 });
    // Vérifier qu'un lien "profil" ou "wishlist" est accessible (navbar visible)
    // L'app Atelier montre le bouton wishlist/cart pour tout le monde,
    // mais après login l'URL change vers / ou /shop
    await expect(this.page.locator('nav')).toBeVisible();
  }

  async verifyLoginError(): Promise<void> {
    // L'app doit rester sur /auth/login et afficher une erreur
    await expect(this.page).toHaveURL(/auth\/login/, { timeout: 5_000 });
    // Chercher un message d'erreur (toast, alert, ou texte)
    const errorMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/invalid|incorrect|wrong|erreur|identifiant|mot de passe/i));
    await expect(errorMsg.first()).toBeVisible({ timeout: 5_000 });
  }

  // =========================================================
  // REGISTER
  // =========================================================

  async navigateToRegister(): Promise<void> {
    await this.navigate('/auth/register');
    await this.waitForLoad();
  }

  async fillRegisterForm(name: string, email: string, password: string): Promise<void> {
    // Essayer d'abord #name, puis le premier input text
    const nameField = this.page.locator(this.nameInput);
    if (await nameField.isVisible()) {
      await nameField.fill(name);
    } else {
      // Fallback : premier champ texte (parfois le nom est le 1er champ)
      await this.page.locator('input[type="text"]').first().fill(name);
    }

    await this.page.locator(this.emailInput).fill(email);
    await this.page.locator(this.passwordInput).fill(password);

    // Confirmation du mot de passe si le champ existe
    const confirmField = this.page.locator(this.confirmPwInput);
    if (await confirmField.isVisible()) {
      await confirmField.fill(password);
    }
  }

  async submitRegisterForm(): Promise<void> {
    await this.page.locator(this.submitLogin).click();
    await this.page.waitForLoadState('load');
  }

  async register(name: string, email: string, password: string): Promise<void> {
    await this.navigateToRegister();
    await this.fillRegisterForm(name, email, password);
    await this.submitRegisterForm();
  }

  // =========================================================
  // MOT DE PASSE OUBLIÉ
  // =========================================================

  async navigateToForgotPassword(): Promise<void> {
    await this.navigate('/auth/forgot-password');
    await this.waitForLoad();
  }

  async submitForgotPasswordForm(email: string): Promise<void> {
    await this.page.locator(this.emailInput).fill(email);
    await this.page.locator(this.submitLogin).click();
    await this.page.waitForLoadState('load');
  }

  async verifyForgotPasswordConfirmation(): Promise<void> {
    // Chercher un message de confirmation (toast, texte de succès, ou changement d'URL)
    const successEl = this.page.getByRole('alert')
      .or(this.page.getByText(/email envoyé|check your email|sent|envoyé|vérifiez/i));
    await expect(successEl.first()).toBeVisible({ timeout: 8_000 });
  }

  // =========================================================
  // DÉCONNEXION
  // =========================================================

  async logout(): Promise<void> {
    // Atelier : chercher un bouton de déconnexion ou un menu utilisateur
    // Essai 1 : bouton direct "Sign out" / "Déconnexion"
    const directLogout = this.page.getByRole('button', { name: /sign out|déconnexion|logout/i })
      .or(this.page.getByRole('link', { name: /sign out|déconnexion|logout/i }));

    if (await directLogout.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await directLogout.first().click();
    } else {
      // Essai 2 : ouvrir un menu utilisateur puis cliquer sur déconnexion
      const userMenu = this.page.getByRole('button', { name: /account|profile|user|mon compte/i })
        .or(this.page.locator('nav button').last()); // dernier bouton de la navbar
      await userMenu.click();
      await this.page.getByRole('menuitem', { name: /sign out|déconnexion|logout/i }).click();
    }

    await this.page.waitForLoadState('load');
  }

  async verifyLoggedOut(): Promise<void> {
    // Après déconnexion, l'URL doit être / (pas /profile ou /dashboard)
    await expect(this.page).toHaveURL(/^\/$|^\/shop/, { timeout: 5_000 });
  }
}
