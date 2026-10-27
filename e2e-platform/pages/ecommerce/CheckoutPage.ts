import { Page, expect } from '@playwright/test';
import { BasePage } from '../common/BasePage';

export interface ShippingInfo {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  country: string;
}

export class CheckoutPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/checkout');
    await this.waitForPageLoad();
  }

  async fillShipping(info: ShippingInfo) {
    await this.page.getByLabel(/first name|prénom/i).fill(info.firstName);
    await this.page.getByLabel(/last name|nom/i).fill(info.lastName);
    await this.page.getByLabel(/email/i).fill(info.email);
    await this.page.getByLabel(/address|adresse/i).fill(info.address);
    await this.page.getByLabel(/city|ville/i).fill(info.city);
    await this.page.getByLabel(/zip|postal/i).fill(info.zip);
    await this.page.getByLabel(/country|pays/i).selectOption(info.country);
  }

  async fillCardDetails(cardNumber = '4242424242424242', expiry = '12/28', cvc = '123') {
    // Stripe test card - adapt iframe selectors to your payment provider
    const stripe = this.page.frameLocator('iframe[name*="card"]').first();
    await stripe.locator('[placeholder*="card number"]').fill(cardNumber);
    await stripe.locator('[placeholder*="MM"]').fill(expiry);
    await stripe.locator('[placeholder*="CVC"]').fill(cvc);
  }

  async placeOrder() {
    await this.page.getByRole('button', { name: /place order|passer la commande/i }).click();
    await this.waitForPageLoad();
  }

  async assertOrderConfirmed() {
    await expect(
      this.page.getByRole('heading', { name: /order confirmed|commande confirmée/i })
    ).toBeVisible({ timeout: 15_000 });
  }

  async assertOrderSummaryContains(productName: string) {
    await expect(this.page.getByText(productName)).toBeVisible();
  }
}
