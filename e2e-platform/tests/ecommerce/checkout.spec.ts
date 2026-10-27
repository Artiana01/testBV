import { test, expect } from '../../fixtures/base.fixture';
import shop1 from '../../apps/shop1';
import { ShippingInfo } from '../../pages/ecommerce/CheckoutPage';

test.describe('@ecommerce - Checkout', () => {
  test.use({ baseURL: shop1.baseURL });

  const shippingInfo: ShippingInfo = {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    address: '12 Rue de la Paix',
    city: 'Paris',
    zip: '75001',
    country: 'FR',
  };

  test.beforeEach(async ({ productPage }) => {
    // Ensure at least one item in cart before each checkout test
    await productPage.goto();
    await productPage.addToCart();
  });

  test('complete checkout flow with valid data', async ({ cartPage, checkoutPage }) => {
    await cartPage.goto();
    await cartPage.proceedToCheckout();

    await checkoutPage.fillShipping(shippingInfo);
    await checkoutPage.fillCardDetails();       // uses Stripe test card 4242...
    await checkoutPage.placeOrder();

    await checkoutPage.assertOrderConfirmed();
  });

  test('order summary shows correct product', async ({ cartPage, checkoutPage }) => {
    await cartPage.goto();
    await cartPage.proceedToCheckout();

    // The product added in beforeEach should appear in summary
    await checkoutPage.assertOrderSummaryContains('');   // adapt: pass product name
  });

  test('cannot proceed with empty shipping fields', async ({ cartPage, checkoutPage }) => {
    await cartPage.goto();
    await cartPage.proceedToCheckout();

    await checkoutPage.placeOrder();    // submit without filling form

    // Expect required-field validation errors
    await expect(checkoutPage.page.getByRole('alert').or(
      checkoutPage.page.locator(':invalid')
    )).toBeVisible();
  });
});
