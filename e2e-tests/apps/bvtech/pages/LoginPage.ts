/**
 * apps/bvtech/pages/LoginPage.ts
 * --------------------------------
 * Page Object — Authentification BV Tech
 * Couvre : /fr/login, /fr/signup, /fr/forgot-password
 *
 * Sélecteurs adaptatifs : utilise getByRole, getByLabel, getByPlaceholder
 * pour être résistant aux changements de CSS/classes.
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class LoginPage extends BasePage {

  // --- Sélecteurs Login ---
  private readonly emailInput    = 'input[type="email"]';
  private readonly passwordInput = 'input[type="password"]';
  private readonly submitBtn     = 'button[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async navigateToLogin(): Promise<void> {
    await this.navigate('/fr/login');
    await this.waitForLoad();
    // Déjà connecté via storageState → redirigé hors de /login, pas besoin d'attendre le formulaire
    if (!this.page.url().includes('/login')) return;
    await this.page.locator(this.emailInput).waitFor({ state: 'visible', timeout: 15_000 });
  }

  async navigateToSignup(): Promise<void> {
    await this.navigate('/fr/signup');
    await this.waitForLoad();
  }

  async navigateToForgotPassword(): Promise<void> {
    await this.navigate('/fr/forgot-password');
    await this.waitForLoad();
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.page.locator(this.emailInput).fill(email);
    await this.page.locator(this.passwordInput).fill(password);
  }

  async submitLoginForm(): Promise<void> {
    await this.page.locator(this.submitBtn).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Connexion complète : navigation + remplissage + soumission
   */
  async login(
    email: string = process.env.TEST_EMAIL ?? '',
    password: string = process.env.TEST_PASSWORD ?? ''
  ): Promise<void> {
    await this.navigateToLogin();
    // Déjà connecté via storageState → navigateToLogin a redirigé hors de /login
    if (!this.page.url().includes('/login')) return;
    await this.fillLoginForm(email, password);
    await this.submitLoginForm();
  }

  async loginAsAdmin(): Promise<void> {
    const BASE = process.env.BASE_URL ?? 'https://dev.bluevaloristech.com';
    // Navigation vers /login — si storageState actif, redirection automatique vers dashboard
    await this.page.goto(`${BASE}/fr/login`, { waitUntil: 'domcontentloaded', timeout: 45_000 });

    // Déjà connecté via storageState → on sort sans remplir le formulaire
    if (!this.page.url().includes('/login')) return;

    // Connexion classique
    await this.fillLoginForm(
      process.env.ADMIN_EMAIL ?? 'webmaster@bluevaloris.com',
      process.env.ADMIN_PASSWORD ?? '123456789Ca!'
    );
    await this.submitLoginForm();
  }

  // =========================================================
  // VÉRIFICATIONS LOGIN
  // =========================================================

  async verifyLoginSuccess(): Promise<void> {
    // Après connexion réussie, on ne doit plus être sur /login
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 45_000 });
    // On doit être sur le dashboard ou une page authentifiée
    await expect(this.page.locator('body')).toBeVisible();
  }

  async verifyLoginError(): Promise<void> {
    // On doit rester sur la page login
    await this.page.waitForTimeout(2000);
    const url = this.page.url();
    const isOnLogin = url.includes('/login');
    // Chercher un message d'erreur (toast, alert, ou texte)
    const errorMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/invalid|incorrect|erreur|identifiant|mot de passe|email|password/i));
    
    if (isOnLogin) {
      // Soit on est resté sur login (cas normal d'erreur)
      expect(isOnLogin).toBeTruthy();
    } else {
      // Soit il y a un message d'erreur visible
      await expect(errorMsg.first()).toBeVisible({ timeout: 5_000 });
    }
  }

  async verifyRedirectToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/dashboard|account|profil|home/i, { timeout: 15_000 });
  }

  // =========================================================
  // DÉCONNEXION
  // =========================================================

  async logout(): Promise<void> {
    // Chercher un bouton de déconnexion dans le menu ou la sidebar
    const logoutBtn = this.page.getByRole('button', { name: /déconnexion|logout|sign out|se déconnecter/i })
      .or(this.page.getByRole('link', { name: /déconnexion|logout|sign out|se déconnecter/i }))
      .or(this.page.locator('[href*="logout"]'))
      .or(this.page.locator('text=/déconnexion|logout/i'));

    if (await logoutBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.first().click();
    } else {
      // Essai 2 : ouvrir un menu utilisateur d'abord
      const userMenu = this.page.getByRole('button', { name: /profil|account|user|mon compte|menu/i })
        .or(this.page.locator('nav button').last())
        .or(this.page.locator('[data-testid*="avatar"], [data-testid*="user"], [data-testid*="menu"]'));
      
      if (await userMenu.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await userMenu.first().click();
        await this.page.waitForTimeout(500);
        await this.page.getByText(/déconnexion|logout|sign out|se déconnecter/i).first().click();
      }
    }

    await this.page.waitForLoadState('domcontentloaded');
  }

  async verifyLoggedOut(): Promise<void> {
    // Après déconnexion, on doit être redirigé vers la page d'accueil ou login
    await expect(this.page).toHaveURL(/\/$|\/login|\/fr\/?$/i, { timeout: 20_000 });
  }
}
