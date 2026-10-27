import { test, expect } from '../../fixtures/base.fixture';
import vitrine1 from '../../apps/vitrine1';

test.describe('@vitrine - Navigation', () => {
  test.use({ baseURL: vitrine1.baseURL });

  // Adapt these to your actual nav links
  const navLinks = [
    { label: 'About', expectedURL: /about/ },
    { label: 'Services', expectedURL: /services/ },
    { label: 'Contact', expectedURL: /contact/ },
  ];

  for (const link of navLinks) {
    test(`nav link "${link.label}" navigates correctly`, async ({ navigationPage }) => {
      await navigationPage.goto('/');
      await navigationPage.clickNavLink(link.label);
      await expect(navigationPage.page).toHaveURL(link.expectedURL);
    });
  }

  test('logo click returns to homepage', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('link', { name: /home|logo|accueil/i }).first().click();
    await expect(page).toHaveURL(/^\/?$/);
  });

  test('mobile menu opens on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const menuBtn = page.getByRole('button', { name: /menu/i });
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });

  test('no broken links on homepage', async ({ page }) => {
    await page.goto('/');
    const links = await page.getByRole('link').all();

    for (const link of links) {
      const href = await link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto')) continue;

      const response = await page.request.get(href.startsWith('http') ? href : `/${href.replace(/^\//, '')}`);
      expect(response.status(), `Broken link: ${href}`).toBeLessThan(400);
    }
  });
});
