/**
 * apps/ecommerce/pages/WishlistPage.ts
 * --------------------------------------
 * Page Object - Wishlist - app Atelier
 *
 * La wishlist Atelier est stockée en localStorage (Zustand persist).
 * Elle n'est PAS liée au compte utilisateur - la connexion n'est pas requise
 * pour que la wishlist fonctionne, mais les tests l'utilisent quand même.
 *
 * Structure confirmée :
 * - ProductCard (shop) : bouton rounded-full absolu avec Heart SVG
 *   → actif quand Heart a fill-red-500 text-red-500
 * - WishlistCard (/wishlist) : div.rounded-3xl.ghost-border avec h3 (nom) et bouton Trash
 *   → bouton Trash est opacity-0 par défaut, visible au hover (forcer le clic)
 * - Bouton "Tout ajouter au panier" visible si products.length > 1
 * - État vide : "Aucun favori pour l'instant"
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class WishlistPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/wishlist');
    await this.waitForLoad();
    // La page wishlist est un Client Component - attendre la fin du chargement
    await this.page.waitForFunction(
      () => !document.querySelector('.animate-pulse'),
      { timeout: 8_000 }
    );
  }

  // =========================================================
  // TOGGLE DEPUIS LA BOUTIQUE (/shop)
  // =========================================================

  /**
   * Clique sur le bouton cœur du premier produit dans la grille /shop.
   * Le bouton est toujours visible (pas de opacity-0) sur les ProductCards.
   */
  async toggleWishlistOnFirstShopProduct(): Promise<void> {
    // Bouton wishlist des ProductCards : button.rounded-full avec Heart SVG
    // Le shop est client-side - attendre qu'au moins un bouton soit présent
    const wishlistBtns = this.page.locator('main button.rounded-full').filter({
      has: this.page.locator('svg'),
    });
    await wishlistBtns.first().waitFor({ state: 'visible', timeout: 10_000 });
    await wishlistBtns.first().click();
    await this.page.waitForTimeout(500);
  }

  async verifyWishlistHeartActive(): Promise<void> {
    // Le cœur actif a les classes fill-red-500 text-red-500 sur le SVG
    const activeHeart = this.page.locator('svg.lucide-heart.fill-red-500, .lucide-heart.fill-red-500');
    await expect(activeHeart.first()).toBeVisible({ timeout: 5_000 });
  }

  // =========================================================
  // PAGE WISHLIST (/wishlist)
  // =========================================================

  /**
   * Vérifie qu'il y a au moins un article dans la wishlist.
   * Chaque WishlistCard a un h3 avec le nom du produit.
   */
  async verifyWishlistHasItems(): Promise<void> {
    await expect(this.page.locator('main h3').first()).toBeVisible({ timeout: 8_000 });
  }

  async getWishlistItemCount(): Promise<number> {
    // Chaque WishlistCard a un h3 (nom produit)
    return await this.page.locator('main h3').count();
  }

  async verifyItemInWishlist(productName: string): Promise<void> {
    await expect(
      this.page.getByText(productName, { exact: false }).first()
    ).toBeVisible({ timeout: 5_000 });
  }

  async verifyWishlistIsEmpty(): Promise<void> {
    // Texte de l'état vide : "Aucun favori pour l'instant"
    await expect(
      this.page.getByText(/aucun favori|votre liste.*vide/i)
    ).toBeVisible({ timeout: 5_000 });
  }

  // =========================================================
  // ACTIONS
  // =========================================================

  /**
   * Clique sur "Tout ajouter au panier" (visible uniquement si > 1 article).
   * Retourne true si l'action a été effectuée.
   */
  async addAllToCart(): Promise<boolean> {
    const btn = this.page.getByRole('button', { name: /tout ajouter au panier/i });
    if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(800);
      return true;
    }
    return false;
  }

  /**
   * Supprime le premier article de la wishlist.
   * Le bouton Trash est hidden (opacity-0) jusqu'au hover - on utilise force: true.
   */
  async removeFirstItem(): Promise<void> {
    // Cibler la première WishlistCard (div avec ghost-border et rounded-3xl)
    const firstCard = this.page.locator('main div.rounded-3xl.overflow-hidden').first();
    await firstCard.hover();
    await this.page.waitForTimeout(300); // laisser la transition CSS s'effectuer

    // Bouton Trash : button:has(.lucide-trash-2) dans la card
    const trashBtn = firstCard.locator('button').filter({
      has: this.page.locator('svg'),
    }).first();
    await trashBtn.click({ force: true }); // force car opacity-0 par défaut
    await this.page.waitForTimeout(500);
  }

  async removeItemByName(productName: string): Promise<void> {
    // Trouver la card contenant le nom du produit
    const card = this.page.locator('main div.rounded-3xl.overflow-hidden').filter({
      hasText: productName,
    });
    await card.hover();
    await this.page.waitForTimeout(300);
    const trashBtn = card.locator('button').filter({ has: this.page.locator('svg') }).first();
    await trashBtn.click({ force: true });
    await this.page.waitForTimeout(500);
  }
}
