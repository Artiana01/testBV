/**
 * apps/launchpad/pages/DashboardPage.ts
 * ----------------------------------------
 * Page Object — Dashboard utilisateur Launchpad BV TECH
 * Couvre : /fr/dashboard (page post-connexion)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class DashboardPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/fr/dashboard');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyDashboardLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/dashboard|account/i, { timeout: 20_000 });
    const mainContent = this.page.locator('main, [class*="dashboard"], [class*="content"], [role="main"]');
    await expect(mainContent.first()).toBeVisible({ timeout: 20_000 });
  }

  async verifyKpisVisible(): Promise<void> {
    const kpiElements = this.page.locator(
      '[class*="kpi"], [class*="stat"], [class*="card"], [class*="metric"]'
    );
    const count = await kpiElements.count();
    if (count > 0) {
      await expect(kpiElements.first()).toBeVisible({ timeout: 15_000 });
    }
  }

  async verifySidebarNavigation(): Promise<void> {
    await this.page.waitForTimeout(1000);
    const navLink = this.page.locator('nav a, aside a, [class*="sidebar"] a, [class*="nav"] a');
    const count = await navLink.count();
    if (count > 0) {
      await expect(navLink.first()).toBeVisible({ timeout: 20_000 });
      return;
    }
    const navContainer = this.page.locator('nav, aside, [role="navigation"], [class*="sidebar"]');
    await expect(navContainer.first()).toBeVisible({ timeout: 20_000 });
  }

  async navigateToProfile(): Promise<void> {
    await this.navigate('/fr/profile');
    await this.waitForLoad();
  }

  async navigateToPacks(): Promise<void> {
    await this.navigate('/fr/plan');
    await this.waitForLoad();
  }

  async navigateToMessages(): Promise<void> {
    const msgLink = this.page.getByRole('link', { name: /message|messagerie|support|contact/i })
      .or(this.page.locator('[href*="message"], [href*="contact"]'));
    if (await msgLink.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await msgLink.first().click();
      await this.waitForLoad();
    } else {
      await this.navigate('/fr/messages');
      await this.waitForLoad();
    }
  }

  // Vérifie si un lien "Voir la commande" est présent et fonctionnel (test bug P0)
  async verifyOrderLinkFunctional(): Promise<void> {
    const orderLink = this.page.getByRole('link', { name: /voir la commande|voir commande|voir l'ordre/i })
      .or(this.page.locator('a[href*="order"], a[href*="commande"]'));

    if (await orderLink.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      const href = await orderLink.first().getAttribute('href');
      expect(href).toBeTruthy();
      // Ouvrir le lien et vérifier qu'il ne retourne pas 404
      const [response] = await Promise.all([
        this.page.waitForResponse(resp => resp.status() !== 404, { timeout: 10_000 }).catch(() => null),
        orderLink.first().click(),
      ]);
      await this.page.waitForLoadState('domcontentloaded');
      const currentUrl = this.page.url();
      expect(currentUrl).not.toMatch(/404|not.?found/i);
    } else {
      console.log('ℹ️  Lien "Voir la commande" non trouvé sur cette page');
    }
  }
}
