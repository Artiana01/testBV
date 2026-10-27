import { test, expect } from '../../fixtures/base.fixture';
import saas1 from '../../apps/saas1';

test.describe('@saas - Authentication', () => {
  test.use({ baseURL: saas1.baseURL });

  test('successful login redirects to dashboard', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(saas1.credentials!.email, saas1.credentials!.password);
    await loginPage.assertLoggedIn();
    await expect(loginPage.page).toHaveURL(/dashboard/);
  });

  test('wrong password shows error', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(saas1.credentials!.email, 'wrongpassword');
    await loginPage.assertLoginError();
  });

  test('empty fields show validation error', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.submit();

    await expect(
      loginPage.page.locator(':invalid').or(loginPage.page.getByRole('alert'))
    ).toBeVisible();
  });

  test('login page has correct title', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.assertTitle(/login|sign in|connexion/i);
  });
});
