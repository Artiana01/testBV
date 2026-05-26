import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  // Header
  readonly manifeste_link    = this.page.getByRole('link', { name: /manifeste/i });
  readonly mathieu_link      = this.page.getByRole('link', { name: /mathieu/i });
  readonly lang_selector     = this.page.locator('button:has-text("FR"), button:has-text("EN"), [aria-label*="langue"], [aria-label*="language"]');
  readonly login_link        = this.page.locator(
    'a[href*="/connexion"], a[href*="/login"], a[href*="/signin"], ' +
    'a:has-text("Connexion"), a:has-text("connexion"), a:has-text("Se connecter"), ' +
    'button:has-text("Connexion"), button:has-text("connexion"), button:has-text("Se connecter"), ' +
    'a:has-text("Espace client"), button:has-text("Espace client"), ' +
    'a:has-text("Mon espace"), button:has-text("Mon espace"), ' +
    'a:has-text("Accès"), button:has-text("Accès")'
  );

  // CTA principaux
  readonly cta_decouvrir_manifeste = this.page.getByRole('link', { name: /découvrir le manifeste/i })
    .or(this.page.getByRole('button', { name: /découvrir le manifeste/i }));
  readonly cta_lire_manifeste      = this.page.getByRole('link', { name: /lire le manifeste/i })
    .or(this.page.getByRole('button', { name: /lire le manifeste/i }));
  readonly cta_obtenir_manifeste   = this.page.getByRole('link', { name: /obtenir le manifeste/i })
    .or(this.page.getByRole('button', { name: /obtenir le manifeste/i }));
  readonly cta_ecosysteme          = this.page.getByRole('link', { name: /découvrir.*écosystème.*blue valoris/i })
    .or(this.page.getByRole('button', { name: /écosystème.*blue valoris/i }));

  // Footer
  readonly footer = this.page.locator('footer');

  constructor(page: Page) {
    super(page);
  }

  async navigate() {
    await this.goto(this.baseURL);
  }

  async navigateEN() {
    await this.goto(`${this.baseURL}/en`);
  }

  async verifyHeaderLoaded() {
    await expect(this.page.locator('header, nav').first()).toBeVisible({ timeout: 20_000 });
  }

  async verifyFooterLoaded() {
    await expect(this.footer).toBeVisible({ timeout: 20_000 });
  }

  async switchToEN() {
    // Chercher sélecteur de langue (bouton FR/EN ou dropdown)
    const langBtn = this.page.locator('a[href*="/en"], button:has-text("EN"), [hreflang="en"]').first();
    if (await langBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await langBtn.click();
      await this.waitForLoad();
    }
  }
}
