import { test, expect } from '../../fixtures/auth.fixture';
import saas1 from '../../apps/saas1';

test.describe('@saas - Dashboard', () => {
  test.use({ baseURL: saas1.baseURL, appConfig: saas1 });

  test('dashboard loads with stats visible', async ({ authenticatedPage, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.assertLoaded();
  });

  test('sidebar navigation works', async ({ authenticatedPage, dashboardPage, navigationPage }) => {
    await dashboardPage.goto();

    // Navigate to a section (adapt label to your app)
    await dashboardPage.navigateTo('Settings');
    await expect(dashboardPage.page).toHaveURL(/settings/);
  });

  test('logout redirects to login', async ({ authenticatedPage, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.logout();

    await expect(dashboardPage.page).toHaveURL(/login/);
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});
