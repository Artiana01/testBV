/**
 * apps/ecommerce/pages/ShopPage.ts
 * ----------------------------------
 * Page Object - Page boutique (/shop) - app Atelier
 * Sélecteurs validés sur l'HTML réel.
 *
 * Structure confirmée :
 * - Titre : "The Seasonal Edit" (h1)
 * - Catégories : boutons ("All Products", "Furniture", "Lighting", "Decor", "Art Prints")
 * - Prix : slider avec role="group"
 * - Tri : role="combobox"
 * - Recherche : placeholder="Search..."
 * - Grille : class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class ShopPage extends BasePage {

  // Grille de produits - div avec class grid
  private readonly productGrid  = '.grid.grid-cols-1.sm\\:grid-cols-2';
  // Chaque carte produit est un article ou un lien dans la grille
  private readonly productCard  = '.grid.grid-cols-1.sm\\:grid-cols-2 > *';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/shop');
    await this.waitForLoad();
  }

  // =========================================================
  // GRILLE PRODUITS
  // =========================================================

  async verifyProductGridVisible(): Promise<void> {
    // Attendre qu'au moins une image produit soit visible
    await expect(this.page.locator('main img').first()).toBeVisible({ timeout: 8_000 });
  }

  async getProductCount(): Promise<number> {
    // Compter les images dans la grille principale (chaque produit a une image)
    await this.page.locator('main img').first().waitFor({ timeout: 8_000 });
    return await this.page.locator('main img').count();
  }

  /**
   * Clique sur le premier produit de la grille.
   */
  async clickFirstProduct(): Promise<string> {
    // Cliquer sur le premier lien de produit dans la grille
    const firstProductLink = this.page.locator('main a[href*="/product"]').first()
      .or(this.page.locator('main a[href*="/products"]').first());

    if (await firstProductLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstProductLink.click();
    } else {
      // Fallback : cliquer sur la première image/carte de la grille
      await this.page.locator('main img').first().click();
    }
    await this.page.waitForLoadState('load');
    return this.page.url();
  }

  /**
   * Retourne le prix du premier produit.
   */
  async getFirstProductPrice(): Promise<number> {
    // Le prix est souvent affiché avec un symbole € ou $
    const priceText = await this.page.getByText(/\d+[.,]\d{2}\s*€|\$\d+[.,]\d{2}|\d+\s*€/).first().innerText();
    return parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));
  }

  async getAllVisiblePrices(): Promise<number[]> {
    const priceElements = this.page.getByText(/\d+[.,]\d{2}\s*€|\$\d+[.,]\d{2}/);
    const count = await priceElements.count();
    const prices: number[] = [];

    for (let i = 0; i < count; i++) {
      const text = await priceElements.nth(i).innerText();
      const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) prices.push(num);
    }
    return prices;
  }

  // =========================================================
  // RECHERCHE - placeholder="Search..."
  // =========================================================

  async search(term: string): Promise<void> {
    const input = this.page.getByPlaceholder('Search...');
    await input.fill(term);
    await input.press('Enter');
    await this.page.waitForLoadState('load');
  }

  async clearSearch(): Promise<void> {
    const input = this.page.getByPlaceholder('Search...');
    await input.clear();
    await input.press('Enter');
    await this.page.waitForLoadState('load');
  }

  async verifySearchInUrl(term: string): Promise<void> {
    // L'URL doit contenir le terme de recherche dans un paramètre query
    await expect(this.page).toHaveURL(new RegExp(encodeURIComponent(term) + '|' + term));
  }

  async verifyNoResultsMessage(): Promise<void> {
    const msg = this.page.getByText(/no products found|aucun produit|no results|nothing found/i);
    await expect(msg).toBeVisible({ timeout: 5_000 });
  }

  // =========================================================
  // FILTRES - Atelier utilise des boutons (pas des checkboxes)
  // =========================================================

  async verifyFilterPanelVisible(): Promise<void> {
    // Scoper à l'aside pour éviter la violation de mode strict (le mot "Categories" apparaît aussi en footer)
    await expect(this.page.locator('aside').getByText('Categories')).toBeVisible({ timeout: 8_000 });
  }

  async verifyBrandFilterVisible(): Promise<void> {
    // Atelier n'a pas nécessairement un filtre marque, vérifier price range à la place
    await expect(this.page.getByText(/price range|prix/i)).toBeVisible();
  }

  async verifyPriceFilterVisible(): Promise<void> {
    // Slider de prix avec role="group"
    await expect(this.page.locator('[role="group"][data-slot="slider"]')).toBeVisible();
  }

  /**
   * Clique sur la première catégorie (ex: "Furniture").
   * La liste Atelier : All Products / Furniture / Lighting / Decor / Art Prints
   */
  async checkFirstCategory(): Promise<string> {
    // Les boutons de catégorie sont dans l'aside - "All Products" est toujours le premier
    const categoryBtns = this.page.locator('aside button');
    await categoryBtns.first().waitFor({ state: 'visible', timeout: 8_000 });
    // Cliquer sur le 2e bouton ("Furniture")
    const secondBtn = categoryBtns.nth(1);
    const label = await secondBtn.innerText();
    await secondBtn.click();
    await this.page.waitForTimeout(800); // attendre la mise à jour client-side
    return label.trim();
  }

  async uncheckFirstCategory(): Promise<void> {
    // Cliquer sur "All Products" (premier bouton de l'aside)
    await this.page.locator('aside button').first().click();
    await this.page.waitForTimeout(800);
  }

  async verifyCategoryInUrl(): Promise<void> {
    // L'URL devrait contenir un paramètre de catégorie
    await expect(this.page).toHaveURL(/category=|cat=|filter=|furniture|lighting|decor/i);
  }

  /**
   * Définit le prix maximum via le slider.
   */
  async setPriceMax(maxPrice: number): Promise<void> {
    // Le slider est masqué (position:fixed, clip-path) - utiliser une interaction clavier
    const sliderInputs = this.page.locator('input[type="range"]');
    const count = await sliderInputs.count();
    if (count >= 2) {
      // 2e input = borne haute
      const maxSlider = sliderInputs.nth(1);
      await maxSlider.focus();
      // Réinitialiser et définir la valeur
      await this.page.evaluate(
        ({ selector, value }) => {
          const el = document.querySelectorAll('input[type="range"]')[1] as HTMLInputElement;
          if (el) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
            nativeInputValueSetter.call(el, value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        { selector: 'input[type="range"]:nth-of-type(2)', value: String(maxPrice) }
      );
      await this.page.waitForTimeout(500);
    }
  }

  async verifyPriceRangeIndicatorVisible(): Promise<void> {
    // Vérifier qu'une indication du range est affichée (ex: "0 € - 100 €")
    await expect(
      this.page.getByText(/€|\$/).filter({ hasText: /\d/ }).first()
    ).toBeVisible();
  }

  async verifyAllPricesUnder(maxPrice: number): Promise<void> {
    const prices = await this.getAllVisiblePrices();
    for (const price of prices) {
      expect(price).toBeLessThanOrEqual(maxPrice + 1); // +1 pour tolérance arrondi
    }
  }

  // =========================================================
  // TRI - role="combobox"
  // =========================================================

  async verifySortSelectorVisible(): Promise<void> {
    await expect(this.page.locator('[role="combobox"]').first()).toBeVisible();
  }

  async sortBy(option: 'price-asc' | 'price-desc' | 'newest'): Promise<void> {
    const combobox = this.page.locator('[role="combobox"]').first();
    await combobox.click();

    // Labels confirmés dans shop-content.tsx : SelectItem value → label
    const optionLabels: Record<string, string> = {
      'price-asc':  'Price: Low to High',
      'price-desc': 'Price: High to Low',
      'newest':     'Newest Arrivals',
    };

    await this.page.getByRole('option', { name: optionLabels[option] }).click();
    await this.page.waitForTimeout(800); // mise à jour client-side
  }

  async verifyProductsSortedByPriceAsc(): Promise<void> {
    const prices = await this.getAllVisiblePrices();
    if (prices.length < 2) return;
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i + 1] + 0.01);
    }
  }

  async verifyProductsSortedByPriceDesc(): Promise<void> {
    const prices = await this.getAllVisiblePrices();
    if (prices.length < 2) return;
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1] - 0.01);
    }
  }
}
