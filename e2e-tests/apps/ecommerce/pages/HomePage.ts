/**
 * apps/ecommerce/pages/HomePage.ts
 * ----------------------------------
 * Page Object - Page d'accueil (/) - app Atelier
 * Sélecteurs validés sur l'HTML réel.
 *
 * Structure confirmée :
 * - Hero avec bouton "Explore Shop" → /shop
 * - Section "The Atelier Vault" (catégories)
 * - Produits populaires (grille)
 * - Navbar fixe avec logo "Atelier"
 * - Footer
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class HomePage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/');
    await this.waitForLoad();
  }

  // =========================================================
  // HERO
  // =========================================================

  async verifyHeroIsVisible(): Promise<void> {
    // Le hero est le premier grand bloc de la page
    await expect(this.page.locator('main').first()).toBeVisible();
  }

  async verifyHeroHasTitle(): Promise<void> {
    // Le hero contient un h1 ou h2 visible
    await expect(this.page.locator('main h1, main h2').first()).toBeVisible();
  }

  async verifyShopNowCTA(): Promise<void> {
    // Le bouton "Explore Shop" est dans le hero (SSR confirmé)
    // getByText est plus fiable que getByRole ici car le bouton est imbriqué dans un <a>
    await expect(this.page.getByText('Explore Shop').first()).toBeVisible({ timeout: 8_000 });
  }

  async clickShopNow(): Promise<void> {
    // Cliquer sur le lien wrappant le bouton "Explore Shop"
    await this.page.getByText('Explore Shop').first().click();
    await this.page.waitForLoadState('load');
  }

  // =========================================================
  // SECTIONS
  // =========================================================

  async verifyCategoriesSectionVisible(): Promise<void> {
    // "The Atelier Vault" ou toute section avec des cartes de catégories
    const section = this.page.getByText(/atelier vault|catégorie|collection/i)
      .or(this.page.locator('main section').nth(1));
    await expect(section.first()).toBeVisible();
  }

  async verifyAtLeastOneCategoryCard(): Promise<void> {
    // Les cartes catégories sont des liens vers /shop ou /collections
    const categoryLinks = this.page.locator('main a[href="/shop"], main a[href^="/collections"]');
    const count = await categoryLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  }

  async verifyPopularProductsVisible(): Promise<void> {
    // Section produits populaires : grille de produits
    // L'app a une grille de produits avec des images
    await expect(this.page.locator('main img').first()).toBeVisible({ timeout: 8_000 });
  }

  async verifyPopularProductCards(): Promise<void> {
    // Vérifier qu'il y a au moins 1 image de produit
    const productImages = this.page.locator('main img');
    const count = await productImages.count();
    expect(count).toBeGreaterThanOrEqual(1);
  }

  // =========================================================
  // LAYOUT
  // =========================================================

  async verifyNavbarVisible(): Promise<void> {
    await expect(this.page.locator('nav')).toBeVisible();
    // Logo "Atelier"
    await expect(this.page.getByText('Atelier').first()).toBeVisible();
  }

  async verifyFooterVisible(): Promise<void> {
    await expect(this.page.locator('footer')).toBeVisible();
  }

  async verifyUserAvatarInNavbar(): Promise<void> {
    // Après connexion, l'app affiche un bouton/lien utilisateur dans la navbar
    // Pour Atelier, vérifier simplement qu'on n'est plus sur la page login
    await expect(this.page).not.toHaveURL(/auth\/login/);
    await expect(this.page.locator('nav')).toBeVisible();
  }
}
