import { test, expect } from '../../fixtures/base.fixture';
import shop1 from '../../apps/shop1';

test.describe('@ecommerce - Cart', () => {
  test.use({ baseURL: shop1.baseURL });

  test('add a product to the cart', async ({ productPage, cartPage }) => {
    await productPage.goto();

    // Open the first product and add it to cart
    await productPage.openProduct('');           // adapt: pass a real product name or rely on first()
    await productPage.addToCart();
    await productPage.assertAddedToCart();

    await cartPage.goto();
    await expect(cartPage.page.locator('[data-testid="cart-item"]')).toHaveCount(1);
  });

  test('update quantity in cart', async ({ cartPage, productPage }) => {
    // Pre-condition: add a product first
    await productPage.goto();
    await productPage.addToCart();

    await cartPage.goto();
    await cartPage.updateQuantity('', 3);   // adapt: pass product name

    await expect(cartPage.page.getByRole('spinbutton').first()).toHaveValue('3');
  });

  test('remove an item from cart', async ({ cartPage, productPage }) => {
    await productPage.goto();
    await productPage.addToCart();

    await cartPage.goto();
    await cartPage.removeItem('');          // adapt: pass product name
    await cartPage.assertEmpty();
  });

  test('empty cart shows empty state', async ({ cartPage }) => {
    await cartPage.goto();
    await cartPage.assertEmpty();
  });
});
