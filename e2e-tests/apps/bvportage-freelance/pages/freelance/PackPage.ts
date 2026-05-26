import { Page } from '@playwright/test';
import { BasePage } from '../common/BasePage';

export class PackPage extends BasePage {
  // Locators
  readonly classicPackButton = 'button:has-text("Classic"), button:has-text("79")';
  readonly selectPackButton = 'button:has-text("Choisir"), button:has-text("Souscrire")';
  readonly paymentButton = 'button:has-text("Payer"), button[type="submit"]:visible';
  readonly stripeFrame = 'iframe[title*="Stripe"]';
  readonly cardNumberInput = 'input[placeholder*="1234"]';
  readonly expiryInput = 'input[placeholder*="MM"]';
  readonly cvcInput = 'input[placeholder*="CVC"]';
  readonly payButton = 'button:has-text("Pay"), button:has-text("Payer")';
  readonly successMessage = '.success-message, .alert-success, text=succès';
  readonly packConfirmation = 'text=Pack, text=activé';

  constructor(page: Page) {
    super(page);
  }

  async selectClassicPack() {
    await this.click(this.classicPackButton);
  }

  async proceedToPayment() {
    await this.click(this.selectPackButton);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async fillPaymentDetails(cardNumber: string, expiry: string, cvc: string) {
    // Try to fill payment form
    const stripeFrames = await this.page.$$(this.stripeFrame);
    if (stripeFrames.length > 0) {
      const frame = this.page.frameLocator(this.stripeFrame).first();
      await frame.locator(this.cardNumberInput).fill(cardNumber);
      await frame.locator(this.expiryInput).fill(expiry);
      await frame.locator(this.cvcInput).fill(cvc);
    }
  }

  async completePayment() {
    await this.click(this.payButton);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successMessage);
  }

  async isSuccessVisible(): Promise<boolean> {
    return await this.isVisible(this.successMessage);
  }

  async isPackActivated(): Promise<boolean> {
    return await this.isVisible(this.packConfirmation);
  }
}
