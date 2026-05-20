import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ManifestePage extends BasePage {
  // Tunnel de commande
  readonly order_section   = this.page.locator('form, [class*="order"], [class*="checkout"], [class*="tunnel"]').first();
  readonly price_display   = this.page.locator('[class*="price"], [class*="montant"], text=/\d+.*EUR|\d+.*€/').first();
  readonly discount_badge  = this.page.locator('[class*="discount"], [class*="reduction"], text=/-5|réduction|remise/i').first();

  // Paiement Stripe
  readonly stripe_frame    = this.page.frameLocator('iframe[title*="Stripe"], iframe[src*="stripe"]').first();
  readonly card_number     = this.stripe_frame.locator('input[name="cardnumber"], input[placeholder*="1234"]');
  readonly card_expiry     = this.stripe_frame.locator('input[name="exp-date"], input[placeholder*="MM"]');
  readonly card_cvc        = this.stripe_frame.locator('input[name="cvc"], input[placeholder*="CVC"]');
  readonly card_name       = this.page.locator('input[name="name"], input[placeholder*="Nom"]').first();
  readonly pay_btn         = this.page.getByRole('button', { name: /payer|commander|valider/i }).first();

  // Succès
  readonly success_msg     = this.page.getByText(/merci|commande confirmée|paiement.*réussi|télécharger/i).first();
  readonly download_btn    = this.page.getByRole('link', { name: /télécharger|download/i })
    .or(this.page.getByRole('button', { name: /télécharger|download/i }));

  constructor(page: Page) {
    super(page);
  }

  async navigateToManifeste() {
    // Essayer différentes URLs possibles
    await this.goto(`${this.baseURL}/manifeste`);
  }

  async navigateToOrder() {
    await this.goto(`${this.baseURL}/commande`);
  }

  async verifyPriceDisplayed(expectedAmount?: string) {
    await expect(this.price_display).toBeVisible({ timeout: 10_000 });
    if (expectedAmount) {
      await expect(this.price_display).toContainText(expectedAmount, { timeout: 5_000 });
    }
  }

  async verifyDiscountApplied() {
    // Vérifier que la réduction de -5€ est affichée pour les utilisateurs connectés
    const discount = this.page.locator('text=/-5|réduction|remise|-5 EUR/i').first();
    await expect(discount).toBeVisible({ timeout: 10_000 });
  }

  async fillStripePayment(cardNumber: string, expiry: string, cvc: string, name: string) {
    // Attendre que la frame Stripe soit chargée
    await this.page.waitForTimeout(2000);

    try {
      await this.card_number.fill(cardNumber);
      await this.card_expiry.fill(expiry);
      await this.card_cvc.fill(cvc);
    } catch {
      console.log('Note: Iframe Stripe non accessible en mode headless');
    }

    // Nom du titulaire (hors iframe)
    if (await this.card_name.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await this.card_name.fill(name);
    }
  }

  async clickPay() {
    await this.pay_btn.click();
    await this.page.waitForLoadState('load', { timeout: 30_000 }).catch(() => {});
  }

  async verifyPaymentSuccess() {
    await expect(this.success_msg).toBeVisible({ timeout: 30_000 });
  }

  async verifyDownloadAvailable() {
    await expect(this.download_btn).toBeVisible({ timeout: 10_000 });
  }
}
