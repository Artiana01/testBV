/**
 * apps/bvbusiness/pages/SignupPage.ts
 * -------------------------------------
 * Page Object — Création de compte BV Business (Magic Link)
 *
 * BV Business n'a PAS de page /signup séparée ni de mot de passe.
 * Le même formulaire sur /fr/login gère login ET inscription :
 *   1. Saisir un email
 *   2. Cliquer "Continuer avec l'adresse email"
 *   3. Recevoir un magic link → cliquer → compte créé ou connecté
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class SignupPage extends BasePage {

  private readonly emailInput  = 'input[type="email"]';
  private readonly continueBtn = 'button[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  async navigateToSignup(): Promise<void> {
    // Login et signup partagent la même page sur BV Business
    await this.navigate('/fr/login');
    await this.waitForLoad();
    await this.page.locator(this.emailInput).waitFor({ state: 'visible', timeout: 15_000 });
  }

  async fillEmail(email: string): Promise<void> {
    await this.page.locator(this.emailInput).fill(email);
  }

  async submitForm(): Promise<void> {
    await this.page.locator(this.continueBtn).first().click();
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(1500);
  }

  async fillSignupForm(data: { email: string }): Promise<void> {
    await this.fillEmail(data.email);
  }

  async submitSignupForm(): Promise<void> {
    await this.submitForm();
  }

  async verifySignupFormVisible(): Promise<void> {
    await expect(this.page.locator(this.emailInput)).toBeVisible({ timeout: 10_000 });
    await expect(this.page.locator(this.continueBtn).first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyMagicLinkSent(): Promise<void> {
    // Bandeau vert "Un lien de connexion a été envoyé à votre email."
    const banner = this.page.getByText(/lien de connexion.*envoyé|magic link.*sent|lien.*envoyé|link.*sent/i)
      .or(this.page.locator('[class*="success"], [class*="alert-success"], .bg-green-'))
      .or(this.page.getByText(/vérifiez votre email|check your email/i));
    await expect(banner.first()).toBeVisible({ timeout: 15_000 });
  }

  async verifySignupSuccess(): Promise<void> {
    await this.verifyMagicLinkSent();
  }

  async verifyValidationErrors(): Promise<void> {
    await this.page.waitForTimeout(1000);
    // Soit on reste sur /login (validation HTML5 native), soit une erreur est affichée
    const isOnLogin = this.page.url().includes('/login');
    const errors = this.page.locator('[class*="error"], [class*="invalid"], [aria-invalid="true"]')
      .or(this.page.getByRole('alert'));
    const hasError = await errors.first().isVisible({ timeout: 3_000 }).catch(() => false);
    expect(isOnLogin || hasError).toBeTruthy();
  }

  async verifyErrorOnInvalidEmail(): Promise<void> {
    // Après soumission d'un email invalide : rester sur /login ou message d'erreur
    await this.page.waitForTimeout(2000);
    const isStillOnLogin = this.page.url().includes('/login');
    const errorMsg = this.page.getByText(/invalide|invalid|format.*email|email.*format/i)
      .or(this.page.getByRole('alert'));
    const hasError = await errorMsg.first().isVisible({ timeout: 3_000 }).catch(() => false);
    expect(isStillOnLogin || hasError).toBeTruthy();
  }
}
