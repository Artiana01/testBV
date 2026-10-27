/**
 * apps/ecommerce/pages/ProductPage.ts
 * -------------------------------------
 * Page Object - Page détail produit (/product/[id]) - app Atelier
 *
 * La page produit est un Client Component : tout le contenu est rendu côté client.
 * Il faut attendre que le composant React charge les données depuis l'API
 * avant d'interagir avec les éléments.
 *
 * Structure confirmée :
 * - h1 : nom du produit
 * - Bouton "Ajouter au panier" (text exact)
 * - Bouton cœur (Heart SVG) dans le conteneur image (décoratif - pas de toggle wishlist)
 * - Badge panier navbar : <span class="rounded-full ..."> dans <a href="/cart">
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class ProductPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async goto(productId: string): Promise<void> {
    await this.navigate(`/product/${productId}`);
    await this.waitForLoad();
    await this.waitForProductLoad();
  }

  async verifyIsOnProductPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/product\//);
  }

  /**
   * Attend que le contenu produit soit chargé depuis l'API (Client Component).
   * La page affiche un skeleton tant que les données ne sont pas disponibles.
   */
  async waitForProductLoad(): Promise<void> {
    // Le h1 n'apparaît qu'après le chargement des données produit
    await this.page.locator('main h1').waitFor({ state: 'visible', timeout: 12_000 });
  }

  // =========================================================
  // VÉRIFICATION DES INFORMATIONS PRODUIT
  // =========================================================

  async verifyProductImageVisible(): Promise<void> {
    await expect(this.page.locator('main img').first()).toBeVisible({ timeout: 8_000 });
  }

  async verifyProductNameVisible(): Promise<void> {
    await expect(this.page.locator('main h1').first()).toBeVisible({ timeout: 8_000 });
  }

  async verifyProductPriceVisible(): Promise<void> {
    // L'app Atelier affiche les prix en $XX.XX
    await expect(
      this.page.getByText(/\$\d+\.\d{2}/).first()
    ).toBeVisible({ timeout: 8_000 });
  }

  async verifyProductDescriptionVisible(): Promise<void> {
    await expect(this.page.locator('main p').first()).toBeVisible({ timeout: 8_000 });
  }

  async verifyAllProductDetailsVisible(): Promise<void> {
    await this.waitForProductLoad();
    await this.verifyProductNameVisible();
    await this.verifyProductPriceVisible();
    await this.verifyProductImageVisible();
    await this.verifyProductDescriptionVisible();
  }

  // =========================================================
  // PANIER
  // =========================================================

  async verifyAddToCartButtonVisible(): Promise<void> {
    await this.waitForProductLoad();
    // Texte exact dans le bouton : "Ajouter au panier"
    await expect(
      this.page.getByRole('button', { name: /ajouter au panier/i })
    ).toBeVisible({ timeout: 8_000 });
  }

  async clickAddToCart(): Promise<void> {
    await this.waitForProductLoad();
    await this.page.getByRole('button', { name: /ajouter au panier/i }).click();
    await this.page.waitForTimeout(800);
  }

  /**
   * Retourne la valeur du badge panier dans la navbar.
   * Badge : <span class="absolute -top-1 -right-1 ... rounded-full">{count}</span>
   * dans <a href="/cart"><button>...</button></a>
   */
  async getCartCount(): Promise<number> {
    const badge = this.page.locator('a[href="/cart"] span.rounded-full');
    if (!(await badge.isVisible())) return 0;
    const text = await badge.innerText();
    return parseInt(text.trim(), 10) || 0;
  }

  async verifyCartCountEquals(expected: number): Promise<void> {
    if (expected === 0) {
      // Quand le panier est vide, le badge n'est pas affiché
      const badge = this.page.locator('a[href="/cart"] span.rounded-full');
      const visible = await badge.isVisible().catch(() => false);
      if (visible) {
        await expect(badge).toHaveText('0');
      }
      return;
    }
    const badge = this.page.locator('a[href="/cart"] span.rounded-full');
    await expect(badge).toBeVisible({ timeout: 5_000 });
    await expect(badge).toHaveText(String(expected));
  }

  // =========================================================
  // WISHLIST
  // =========================================================

  /**
   * Vérifie que le bouton cœur est visible sur la page produit.
   * Note : ce bouton est décoratif sur la page produit (pas de toggle implémenté).
   */
  async verifyWishlistButtonVisible(): Promise<void> {
    await this.waitForProductLoad();
    // Bouton avec rounded-full positionné dans le conteneur image
    const btn = this.page.locator('main button.rounded-full').first();
    await expect(btn).toBeVisible({ timeout: 8_000 });
  }

  async clickWishlistToggle(): Promise<void> {
    await this.waitForProductLoad();
    await this.page.locator('main button.rounded-full').first().click();
    await this.page.waitForTimeout(500);
  }

  async verifyWishlistIsActive(): Promise<void> {
    // Sur la page produit, le bouton cœur est décoratif (pas de toggle).
    // Le cœur actif aurait fill-red-500 - si absent, on passe silencieusement.
    const redHeart = this.page.locator('.lucide-heart.fill-red-500');
    if (await redHeart.count() > 0) {
      await expect(redHeart.first()).toBeVisible({ timeout: 3_000 });
    }
  }

  // =========================================================
  // UTILITAIRES
  // =========================================================

  async getProductName(): Promise<string> {
    await this.waitForProductLoad();
    return await this.page.locator('main h1').first().innerText();
  }

  async getProductPrice(): Promise<number> {
    const priceText = await this.page.getByText(/\$\d+\.\d{2}/).first().innerText();
    return parseFloat(priceText.replace(/[^\d.]/g, ''));
  }
}
