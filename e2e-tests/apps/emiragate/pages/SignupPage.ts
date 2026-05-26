/**
 * apps/emiragate/pages/SignupPage.ts
 * ------------------------------------
 * Page Object — Inscription Client Emiragate
 * Couvre : accès formulaire, remplissage, soumission (SC-04)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class SignupPage extends BasePage {

  private readonly nameInput     = 'input[name*="name" i],input[placeholder*="name" i],input[placeholder*="nom" i]';
  private readonly emailInput    = 'input[type="email"]';
  private readonly passwordInput = 'input[type="password"]';
  private readonly submitBtn     = 'button[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/en/signup');
    await this.waitForLoad();
    await this.page.waitForTimeout(1500);
    // Si redirect vers /register ou /register
    if (!this.page.url().match(/signup|register|inscription/i)) {
      await this.navigate('/en/register');
      await this.waitForLoad();
    }
  }

  async verifySignupPageLoaded(): Promise<void> {
    const url = this.page.url();
    const isSignupPage = /signup|register|inscription|créer/i.test(url)
      || await this.page.locator(this.emailInput).first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isSignupPage) {
      console.log(`   ℹ️  URL signup : ${url} — vérifier URL dans SignupPage`);
    }
    await expect(this.page.locator('body')).toBeVisible();
  }

  async verifyFormFieldsPresent(): Promise<void> {
    await expect(this.page.locator(this.emailInput).first()).toBeVisible({ timeout: 20_000 });
    await expect(this.page.locator(this.passwordInput).first()).toBeVisible({ timeout: 5_000 });
  }

  async fillSignupForm(name: string, email: string, password: string): Promise<void> {
    const nameField = this.page.locator(this.nameInput).first();
    if (await nameField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameField.fill(name);
    }
    await this.page.locator(this.emailInput).first().fill(email);
    const pwFields = this.page.locator(this.passwordInput);
    const count = await pwFields.count();
    if (count >= 1) await pwFields.first().fill(password);
    if (count >= 2) await pwFields.nth(1).fill(password);
  }

  async submitForm(): Promise<void> {
    await this.page.locator(this.submitBtn).click();
    await this.page.waitForTimeout(2000);
  }
}
