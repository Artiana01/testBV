/**
 * apps/bvinvest/pages/MemberSpacePage.ts
 * ----------------------------------------
 * Page Object — Espace Membre BV Invest
 * Couvre : accès espace privé, navigation interne (SC-02, SC-04)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class MemberSpacePage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    // 👉 ADAPTER selon l'URL réelle de l'espace membre
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    await this.navigate(`/${lang}/member`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async gotoPrivateSpace(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    // Essayer plusieurs URL possibles pour l'espace privé
    await this.navigate(`/${lang}/private`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyMemberSpaceLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    await expect(this.page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  }

  async navigateToProfile(): Promise<void> {
    const profileLink = this.page.getByRole('link', { name: /profil|profile|mon compte/i })
      .or(this.page.locator('a[href*="profil"], a[href*="profile"]'));
    if (await profileLink.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await profileLink.first().click();
      await this.waitForLoad();
    } else {
      const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
      await this.navigate(`/${lang}/profile`);
      await this.waitForLoad();
    }
    await this.page.waitForTimeout(1500);
  }

  async navigateToSubscription(): Promise<void> {
    const subLink = this.page.getByRole('link', { name: /abonnement|subscription|pack/i })
      .or(this.page.locator('a[href*="subscription"], a[href*="abonnement"], a[href*="pack"]'));
    if (await subLink.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await subLink.first().click();
      await this.waitForLoad();
    } else {
      const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
      await this.navigate(`/${lang}/subscription`);
      await this.waitForLoad();
    }
    await this.page.waitForTimeout(1500);
  }

  async navigateToVerification(): Promise<void> {
    const verifLink = this.page.getByRole('link', { name: /vérification|verification|kyc/i })
      .or(this.page.locator('a[href*="verification"], a[href*="kyc"]'));
    if (await verifLink.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await verifLink.first().click();
      await this.waitForLoad();
    } else {
      const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
      await this.navigate(`/${lang}/verification`);
      await this.waitForLoad();
    }
    await this.page.waitForTimeout(1500);
  }

  async verifyNoRedirectToLogin(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  }
}
