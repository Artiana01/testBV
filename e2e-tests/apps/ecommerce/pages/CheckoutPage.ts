/**
 * apps/ecommerce/pages/CheckoutPage.ts
 * --------------------------------------
 * Page Object pour le tunnel de commande (/checkout).
 * Couvre : shipping, livraison, paiement, confirmation.
 *
 * Les données de carte de test utilisent les numéros Stripe standard.
 * Adapter selon le fournisseur de paiement utilisé (Stripe, PayPal, Braintree...).
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class CheckoutPage extends BasePage {

  // --- Sélecteurs Adresse / Shipping ---
  private readonly firstNameInput   = 'input[name="firstName"]';          // 👉 ADAPTER
  private readonly lastNameInput    = 'input[name="lastName"]';           // 👉 ADAPTER
  private readonly addressInput     = 'input[name="address"]';            // 👉 ADAPTER
  private readonly cityInput        = 'input[name="city"]';               // 👉 ADAPTER
  private readonly postalCodeInput  = 'input[name="postalCode"]';         // 👉 ADAPTER
  private readonly countrySelect    = 'select[name="country"]';           // 👉 ADAPTER

  // --- Sélecteurs Livraison ---
  private readonly deliveryOption   = '[data-testid="delivery-option"]';  // 👉 ADAPTER (bouton radio)

  // --- Sélecteurs Paiement ---
  private readonly cardNumberInput  = 'input[name="cardNumber"]';         // 👉 ADAPTER
  private readonly cardExpiryInput  = 'input[name="cardExpiry"]';         // 👉 ADAPTER
  private readonly cardCvvInput     = 'input[name="cardCvv"]';            // 👉 ADAPTER

  // --- Sélecteurs Résumé commande ---
  private readonly orderSummary     = '[data-testid="order-summary"]';    // 👉 ADAPTER

  // --- Sélecteurs Navigation tunnel ---
  private readonly nextStepBtn      = '[data-testid="next-step-btn"]';    // 👉 ADAPTER
  private readonly submitOrderBtn   = '[data-testid="submit-order-btn"]'; // 👉 ADAPTER

  // --- Sélecteurs Confirmation ---
  private readonly successHeading   = '[data-testid="order-success"]';    // 👉 ADAPTER
  private readonly orderNumber      = '[data-testid="order-number"]';     // 👉 ADAPTER

  // --- Sélecteurs Validation ---
  private readonly validationError  = '[data-testid="field-error"]';      // 👉 ADAPTER

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/checkout');
    await this.waitForLoadState('load');
  }

  async waitForLoadState(state: 'networkidle' | 'domcontentloaded' | 'load' = 'networkidle'): Promise<void> {
    await this.page.waitForLoadState(state);
  }

  // =========================================================
  // VÉRIFICATION ACCÈS
  // =========================================================

  async verifyRedirectedToLogin(): Promise<void> {
    // Utilisateur non connecté → redirigé vers /auth/login ou formulaire inline
    const isLoginPage = this.page.url().includes('login') || this.page.url().includes('auth');
    const hasInlineLoginForm = await this.page.locator('input[type="email"]').isVisible();
    expect(isLoginPage || hasInlineLoginForm).toBeTruthy();
  }

  // =========================================================
  // ÉTAPE 1 - ADRESSE DE LIVRAISON
  // =========================================================

  async fillShippingAddress(data: {
    firstName?: string;
    lastName?: string;
    address: string;
    city: string;
    postalCode: string;
    country?: string;
  }): Promise<void> {
    if (data.firstName) {
      await this.page.locator(this.firstNameInput)
        .or(this.page.getByLabel(/prénom|first name/i))
        .fill(data.firstName);
    }
    if (data.lastName) {
      await this.page.locator(this.lastNameInput)
        .or(this.page.getByLabel(/nom|last name/i))
        .fill(data.lastName);
    }

    await this.page.locator(this.addressInput)
      .or(this.page.getByLabel(/adresse|address/i))
      .fill(data.address);

    await this.page.locator(this.cityInput)
      .or(this.page.getByLabel(/ville|city/i))
      .fill(data.city);

    await this.page.locator(this.postalCodeInput)
      .or(this.page.getByLabel(/code postal|postal code|zip/i))
      .fill(data.postalCode);

    if (data.country) {
      // 👉 ADAPTER : certains projets utilisent un <select>, d'autres un autocomplete
      const countryEl = this.page.locator(this.countrySelect);
      if (await countryEl.isVisible()) {
        await countryEl.selectOption({ label: data.country });
      } else {
        await this.page.getByLabel(/pays|country/i).fill(data.country);
      }
    }
  }

  async verifyOrderSummaryVisible(): Promise<void> {
    await expect(this.page.locator(this.orderSummary)).toBeVisible(); // 👉 ADAPTER
  }

  async goToNextStep(): Promise<void> {
    const btn = this.page.locator(this.nextStepBtn)
      .or(this.page.getByRole('button', { name: /continuer|suivant|next|continue/i }));
    await btn.click();
    await this.page.waitForLoadState('load');
  }

  // =========================================================
  // ÉTAPE 2 - MODE DE LIVRAISON
  // =========================================================

  async selectFirstDeliveryOption(): Promise<void> {
    // 👉 ADAPTER : les options de livraison peuvent être des radio buttons ou des cards cliquables
    const option = this.page.locator(this.deliveryOption)
      .or(this.page.getByRole('radio').first());
    await option.first().click();
    await this.page.waitForTimeout(300);
  }

  // =========================================================
  // ÉTAPE 3 - PAIEMENT
  // =========================================================

  /**
   * Remplit les informations de carte bancaire.
   * Numéros de test Stripe : 4242 4242 4242 4242
   *
   * Si l'application utilise un iframe Stripe, il faut utiliser frameLocator().
   * 👉 ADAPTER selon le fournisseur de paiement utilisé.
   */
  async fillPaymentInfo(data?: {
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
  }): Promise<void> {
    const cardNumber = data?.cardNumber ?? '4242 4242 4242 4242'; // Carte de test Stripe
    const expiry     = data?.expiry    ?? '12/28';
    const cvv        = data?.cvv       ?? '123';

    // Cas 1 : Champs de carte dans un iframe Stripe
    // const stripeFrame = this.page.frameLocator('[name="__privateStripeFrame"]'); // 👉 ADAPTER
    // await stripeFrame.locator('[name="cardnumber"]').fill(cardNumber);
    // await stripeFrame.locator('[name="exp-date"]').fill(expiry);
    // await stripeFrame.locator('[name="cvc"]').fill(cvv);

    // Cas 2 : Champs de carte directs dans la page (plus simple)
    const cardField = this.page.locator(this.cardNumberInput)
      .or(this.page.getByLabel(/numéro de carte|card number/i));
    if (await cardField.isVisible()) {
      await cardField.fill(cardNumber);
    }

    const expiryField = this.page.locator(this.cardExpiryInput)
      .or(this.page.getByLabel(/expiration|expiry|mm\/yy/i));
    if (await expiryField.isVisible()) {
      await expiryField.fill(expiry);
    }

    const cvvField = this.page.locator(this.cardCvvInput)
      .or(this.page.getByLabel(/cvv|cvc|code de sécurité/i));
    if (await cvvField.isVisible()) {
      await cvvField.fill(cvv);
    }
  }

  async submitOrder(): Promise<void> {
    const btn = this.page.locator(this.submitOrderBtn)
      .or(this.page.getByRole('button', { name: /passer la commande|place order|confirmer|payer/i }));
    await btn.click();
    // Attendre la redirection ou la confirmation (le paiement peut prendre quelques secondes)
    await this.page.waitForLoadState('load');
  }

  // =========================================================
  // CONFIRMATION
  // =========================================================

  async verifyOrderSuccess(): Promise<void> {
    // 👉 ADAPTER : vérifier la redirection vers /checkout/success ou /order/success
    await expect(this.page).toHaveURL(/checkout\/success|order\/success|commande\/succes|confirmation/i, {
      timeout: 15_000,
    });
  }

  async verifySuccessMessageVisible(): Promise<void> {
    const msg = this.page.locator(this.successHeading)
      .or(this.page.getByText(/commande confirmée|order confirmed|merci pour votre commande|thank you/i));
    await expect(msg).toBeVisible({ timeout: 10_000 });
  }

  async verifyOrderNumberPresent(): Promise<void> {
    const orderNum = this.page.locator(this.orderNumber)
      .or(this.page.getByText(/#\d+|order #|commande n°/i));
    await expect(orderNum).toBeVisible({ timeout: 5_000 });
  }

  // =========================================================
  // VALIDATION DES CHAMPS
  // =========================================================

  async verifyValidationErrorsVisible(): Promise<void> {
    // 👉 ADAPTER : les erreurs de validation peuvent être des <span>, <p> ou des aria-invalid
    const errors = this.page.locator(this.validationError)
      .or(this.page.locator('[aria-invalid="true"]'))
      .or(this.page.locator('.error, .field-error, [role="alert"]'));
    await expect(errors.first()).toBeVisible({ timeout: 5_000 });
  }
}
