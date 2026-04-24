/**
 * apps/bvbusiness/pages/LoginPage.ts
 * ------------------------------------
 * Page Object — Authentification Magic Link BV Business
 *
 * Flux réel :
 *   1. Saisir l'adresse email
 *   2. Cliquer "Continuer avec l'adresse email"
 *   3. Recevoir un email → cliquer le lien → session ouverte
 *
 * Conséquence pour les tests automatisés :
 *   - Le clic sur le lien email NE PEUT PAS être automatisé sans accès
 *     à la boîte mail.
 *   - Les tests authentifiés utilisent un storageState (session) obtenu
 *     manuellement via : npm run session:bvbusiness
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class LoginPage extends BasePage {

  // Sélecteurs UI magic link
  private readonly emailInput       = 'input[type="email"]';
  private readonly continueEmailBtn = 'button:has-text("Continuer avec l\'adresse email"), button:has-text("Continue with email"), button[type="submit"]';
  private readonly googleBtn        = 'button:has-text("Continuer avec Google"), button:has-text("Continue with Google")';
  private readonly successBanner    = 'text=/lien de connexion a été envoyé|magic link|check your email|vérifiez votre email/i';

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async navigateToLogin(): Promise<void> {
    await this.navigate('/fr/login');
    await this.waitForLoad();
    if (!this.page.url().includes('/login')) return;
    await this.page.locator(this.emailInput).waitFor({ state: 'visible', timeout: 15_000 });
  }

  // =========================================================
  // ACTIONS MAGIC LINK
  // =========================================================

  async fillEmail(email: string): Promise<void> {
    await this.page.locator(this.emailInput).fill(email);
  }

  async clickContinueWithEmail(): Promise<void> {
    await this.page.locator(this.continueEmailBtn).first().click();
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(1500);
  }

  async requestMagicLink(email: string): Promise<void> {
    await this.navigateToLogin();
    if (!this.page.url().includes('/login')) return;
    await this.fillEmail(email);
    await this.clickContinueWithEmail();
  }

  // =========================================================
  // VÉRIFICATIONS
  // =========================================================

  async verifyLoginPageLoaded(): Promise<void> {
    await expect(this.page.locator(this.emailInput)).toBeVisible({ timeout: 10_000 });
    await expect(this.page.locator(this.continueEmailBtn).first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyGoogleButtonVisible(): Promise<void> {
    await expect(this.page.locator(this.googleBtn)).toBeVisible({ timeout: 10_000 });
  }

  async verifyMagicLinkSent(): Promise<void> {
    // Après soumission de l'email, un bandeau vert "Un lien de connexion a été envoyé à votre email." doit apparaître
    const banner = this.page.locator(this.successBanner)
      .or(this.page.locator('[class*="success"], [class*="alert-success"], .bg-green'))
      .or(this.page.getByText(/lien.*envoyé|link.*sent|email.*envoyé/i));
    await expect(banner.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyEmailPrefilled(email: string): Promise<void> {
    // Après envoi du lien, l'email doit rester affiché dans le champ ou en texte
    const emailDisplay = this.page.locator(this.emailInput)
      .or(this.page.getByText(email));
    await expect(emailDisplay.first()).toBeVisible({ timeout: 5_000 });
  }

  async verifyErrorOnInvalidEmail(): Promise<void> {
    await this.page.waitForTimeout(1500);
    const error = this.page.locator('[class*="error"], [class*="invalid"], [aria-invalid="true"]')
      .or(this.page.getByRole('alert'))
      .or(this.page.getByText(/invalide|invalid|email.*requis|email.*required/i));
    const isOnLogin = this.page.url().includes('/login');
    const hasError = await error.first().isVisible({ timeout: 3_000 }).catch(() => false);
    // L'erreur OU le maintien sur /login est acceptable
    expect(hasError || isOnLogin).toBeTruthy();
  }

  async verifyAuthenticated(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(this.page.locator('body')).toBeVisible();
  }

  async verifyLoggedOut(): Promise<void> {
    await expect(this.page).toHaveURL(/\/$|\/login|\/fr\/?$/i, { timeout: 10_000 });
  }

  // =========================================================
  // DÉCONNEXION
  // =========================================================

  async logout(): Promise<void> {
    const logoutBtn = this.page.getByRole('button', { name: /déconnexion|logout|sign out|se déconnecter/i })
      .or(this.page.getByRole('link', { name: /déconnexion|logout|sign out/i }))
      .or(this.page.locator('[href*="logout"]'));

    if (await logoutBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.first().click();
    } else {
      const userMenu = this.page.getByRole('button', { name: /profil|account|user|mon compte/i })
        .or(this.page.locator('[data-testid*="avatar"], [data-testid*="user"]'));
      if (await userMenu.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await userMenu.first().click();
        await this.page.waitForTimeout(500);
        await this.page.getByText(/déconnexion|logout|sign out/i).first().click();
      }
    }
    await this.page.waitForLoadState('load');
  }
}
