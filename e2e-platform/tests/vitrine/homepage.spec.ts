import { test, expect } from '../../fixtures/base.fixture';
import vitrine1 from '../../apps/vitrine1';

test.describe('@vitrine - Homepage', () => {
  test.use({ baseURL: vitrine1.baseURL });

  test('homepage loads and shows hero section', async ({ homePage }) => {
    await homePage.goto();
    await homePage.assertHeroVisible();
  });

  test('page title is set', async ({ homePage }) => {
    await homePage.goto();
    // Ensure the <title> tag is not empty or default
    const title = await homePage.getTitle();
    expect(title.length).toBeGreaterThan(0);
    expect(title).not.toMatch(/localhost|undefined/i);
  });

  test('CTA button is visible and clickable', async ({ homePage }) => {
    await homePage.goto();
    await homePage.assertCTAVisible();
    await homePage.clickCTA();
    // After click we should have navigated somewhere (not stayed on /)
    await expect(homePage.page).not.toHaveURL(/^\/$/);
  });

  test('meta description is present', async ({ homePage }) => {
    await homePage.goto();
    const metaDesc = await homePage.page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDesc).toBeTruthy();
  });
});
