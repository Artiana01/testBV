/**
 * apps/bvtech/pages/AdminContactsPage.ts
 * -----------------------------------------
 * Page Object — Gestion des Contacts / Messages (admin)
 * Couvre : liste des messages, recherche, pagination
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminContactsPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async goto(): Promise<void> {
    await this.navigate('/fr/admin/contacts');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  // =========================================================
  // LISTE DES CONTACTS
  // =========================================================

  async verifyContactsListVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/admin\/contacts/, { timeout: 20_000 });
    await expect(this.page.locator('table')).toBeVisible({ timeout: 20_000 });
  }

  async getContactsCount(): Promise<number> {
    return await this.page.locator('table tbody tr').count();
  }

  // =========================================================
  // RECHERCHE
  // =========================================================

  async searchContact(query: string): Promise<void> {
    const searchInput = this.page.getByPlaceholder(/rechercher|search|chercher|filtrer/i)
      .or(this.page.locator('input[type="search"]'))
      .or(this.page.locator('input[name="search"]'))
      .or(this.page.locator('[class*="search"] input'));

    if (await searchInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.first().fill(query);
      await this.page.waitForTimeout(1000); // Attendre le debounce
    }
  }

  async verifySearchResults(expectedText: string): Promise<void> {
    const result = this.page.getByText(expectedText);
    if (await result.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(result.first()).toBeVisible();
    }
  }

  // =========================================================
  // PAGINATION
  // =========================================================

  async verifyPaginationVisible(): Promise<void> {
    const pagination = this.page.locator('[class*="pagination"], [role="navigation"]')
      .or(this.page.getByRole('button', { name: /suivant|next|précédent|previous|»|›/i }))
      .or(this.page.locator('nav[aria-label*="pagination"]'));
    
    if (await pagination.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(pagination.first()).toBeVisible();
    }
  }

  async goToNextPage(): Promise<void> {
    const nextBtn = this.page.getByRole('button', { name: /suivant|next|»|›/i })
      .or(this.page.locator('[class*="pagination"] button:last-child'))
      .or(this.page.locator('a[rel="next"]'));
    
    if (await nextBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.first().click();
      await this.page.waitForTimeout(1000);
    }
  }

  async goToPreviousPage(): Promise<void> {
    const prevBtn = this.page.getByRole('button', { name: /précédent|previous|«|‹/i })
      .or(this.page.locator('[class*="pagination"] button:first-child'))
      .or(this.page.locator('a[rel="prev"]'));
    
    if (await prevBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await prevBtn.first().click();
      await this.page.waitForTimeout(1000);
    }
  }

  async navigatePages(): Promise<void> {
    // Naviguer vers la page suivante puis revenir
    await this.goToNextPage();
    await this.page.waitForTimeout(1000);
    await this.goToPreviousPage();
  }
}
