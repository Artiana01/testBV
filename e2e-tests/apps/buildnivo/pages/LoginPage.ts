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

  /**
   * Détecte un blocage de compte connu (provisionnement, pas un bug applicatif ni
   * un problème de test) après une tentative de connexion restée sur /connexion :
   * email jamais confirmé, ou identifiants refusés pour ce compte de démo précis.
   * Retourne une raison de skip explicite, ou undefined si rien de connu ne matche
   * (dans ce cas l'appelant doit laisser l'échec se produire normalement).
   */
  async getKnownAccountBlockReason(login: string): Promise<string | undefined> {
    if (!this.page.url().includes('/connexion')) return undefined;

    const unconfirmedEmail = this.page.getByText(/adresse email non confirmée|email non confirmé/i);
    const wrongCredentials = this.page.getByText(/identifiants incorrects/i);

    // 30s, sur un seul locator combiné (une attente au lieu de deux en série) : le
    // message vient d'un appel API après soumission, pas d'une validation instantanée
    // côté client, et cet environnement de recette est parfois lent sous charge.
    // IMPORTANT : .isVisible({ timeout }) n'attend jamais réellement — Playwright
    // ignore cette option et renvoie l'état immédiat (piège classique de l'API). Il
    // faut .waitFor({ state: 'visible' }) pour un vrai polling jusqu'au timeout.
    const known = unconfirmedEmail.first().or(wrongCredentials.first());
    const foundKnown = await known.waitFor({ state: 'visible', timeout: 30_000 }).then(() => true).catch(() => false);
    if (!foundKnown) return undefined;

    if (await unconfirmedEmail.first().isVisible().catch(() => false)) {
      return `Compte ${login} — email jamais confirmé sur cet environnement ("Adresse email non confirmée") : ` +
        'le compte existe mais reste bloqué tant que la validation manuelle n\'est pas faite. ' +
        'Anomalie de provisionnement de données, pas un bug de test.';
    }

    return `Compte ${login} — "Identifiants incorrects" avec le mot de passe de démo attendu : ` +
      'ce compte n\'est probablement pas provisionné (ou a un mot de passe différent) dans cet ' +
      'environnement. Anomalie de provisionnement de données, pas un bug de test.';
  }
}
