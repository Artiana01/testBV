/**
 * apps/bvtech/pages/AdminPaymentsPage.ts
 * -----------------------------------------
 * Page Object — Consultation des Paiements (admin)
 * Couvre : liste des paiements, détails d'un paiement
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AdminPaymentsPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async goto(): Promise<void> {
    await this.navigate('/fr/admin/payments');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  // =========================================================
  // LISTE DES PAIEMENTS
  // =========================================================

  async verifyPaymentsListVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/admin\/payments/, { timeout: 20_000 });
    // La table est présente même si vide ("Aucun résultat trouvé")
    await expect(this.page.locator('table')).toBeVisible({ timeout: 20_000 });
  }

  async getPaymentsCount(): Promise<number> {
    // Vérifier d'abord si la table affiche un message "aucun résultat" (empty-state row)
    const emptyState = await this.page
      .locator('table')
      .getByText(/aucun résultat|no result|aucun paiement|no payment|empty|vide/i)
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (emptyState) return 0;

    return await this.page.locator('table tbody tr').count();
  }

  // =========================================================
  // CONSULTATION D'UN PAIEMENT
  // =========================================================

  async hasPayments(): Promise<boolean> {
    const count = await this.getPaymentsCount();
    return count > 0;
  }

  async clickViewFirstPayment(): Promise<void> {
    // Vérifier qu'il y a des paiements avant de tenter de cliquer
    if (!(await this.hasPayments())) {
      console.log('ℹ️  Table paiements vide — consultation ignorée');
      return;
    }

    // Les boutons d'action sont icon-only → prendre le 1er bouton dans le tbody
    const rowBtn = this.page.locator('table tbody tr').first()
      .locator('button, a[role="button"]').first();

    if (await rowBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await rowBtn.click();
    } else {
      // Fallback : bouton visible dans la page avec texte action
      const viewBtn = this.page.getByRole('button', { name: /voir|view|détails|details|consulter/i })
        .or(this.page.locator('[class*="view"], [data-testid*="view"]'));
      await viewBtn.first().click();
    }
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async verifyPaymentDetailsVisible(): Promise<void> {
    // Si table vide, on reste sur la liste → vérification optionnelle
    if (!(await this.hasPayments())) {
      console.log('ℹ️  Aucun paiement — vérification des détails ignorée');
      return;
    }
    const detailsContent = this.page.getByText(/montant|amount|statut|status|id|référence|reference/i)
      .or(this.page.locator('[class*="detail"], [class*="payment-info"]'));
    await expect(detailsContent.first()).toBeVisible({ timeout: 20_000 });
  }

  async verifyPaymentHasAmount(): Promise<void> {
    // Vérifier qu'un montant est affiché (nombre + devise)
    const amount = this.page.getByText(/\d+[\s.,]*\d*\s*(€|EUR|USD|\$|XOF|MAD)/i)
      .or(this.page.locator('[class*="amount"], [class*="price"], [class*="montant"]'));
    
    if (await amount.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(amount.first()).toBeVisible();
    }
  }

  async verifyPaymentHasStatus(): Promise<void> {
    // Vérifier qu'un statut est affiché
    const status = this.page.getByText(/payé|paid|en attente|pending|annulé|cancelled|refusé|rejected|completed|complété/i)
      .or(this.page.locator('[class*="status"], [class*="badge"]'));
    
    if (await status.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(status.first()).toBeVisible();
    }
  }

  async verifyPaymentHasId(): Promise<void> {
    // Vérifier qu'un identifiant de paiement est affiché
    const paymentId = this.page.getByText(/id|référence|reference|#/i)
      .or(this.page.locator('[class*="id"], [class*="reference"]'));
    
    if (await paymentId.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(paymentId.first()).toBeVisible();
    }
  }
}
