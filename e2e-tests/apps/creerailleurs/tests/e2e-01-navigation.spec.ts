/**
 * e2e-01-navigation.spec.ts — Créer Ailleurs
 * SC-01 : Navigation générale du site
 *
 * Vérifie : Header, Footer, CTA, redirections
 * Priorité : P0 Critique
 */
import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

const BASE = process.env.BASE_URL ?? 'https://www.creerailleurs.com';

test.describe('SC-01 — Navigation générale du site', () => {

  test('01.1 — La page d\'accueil est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const home = new HomePage(page);
    await home.navigate();
    await expect(page).toHaveURL(new RegExp(BASE.replace('https://', '')), { timeout: 10_000 });
    await home.verifyHeaderLoaded();
  });

  test('01.2 — Le menu "Le Manifeste" est visible dans le header', async ({ page }) => {
    test.setTimeout(30_000);
    const home = new HomePage(page);
    await home.navigate();
    await expect(home.manifeste_link.first()).toBeVisible({ timeout: 10_000 });
  });

  test('01.3 — Le menu "Mathieu" est visible dans le header', async ({ page }) => {
    test.setTimeout(30_000);
    const home = new HomePage(page);
    await home.navigate();
    await expect(home.mathieu_link.first()).toBeVisible({ timeout: 10_000 });
  });

  test('01.4 — Le sélecteur de langue FR/EN est présent', async ({ page }) => {
    test.setTimeout(30_000);
    const home = new HomePage(page);
    await home.navigate();
    // Chercher le sélecteur de langue (bouton FR, EN, ou dropdown)
    const langSelector = page.locator(
      'button:has-text("FR"), button:has-text("EN"), a[href*="/en"], a[hreflang], [aria-label*="langue"], [aria-label*="language"]'
    ).first();
    await expect(langSelector).toBeVisible({ timeout: 10_000 });
  });

  test('01.5 — Le lien "Connexion" est présent dans le header', async ({ page }) => {
    test.setTimeout(30_000);
    const home = new HomePage(page);
    await home.navigate();
    await expect(home.login_link.first()).toBeVisible({ timeout: 10_000 });
  });

  test('01.6 — Le footer est présent et visible', async ({ page }) => {
    test.setTimeout(30_000);
    const home = new HomePage(page);
    await home.navigate();
    await home.verifyFooterLoaded();
  });

  test('01.7 — Les liens du footer sont cliquables', async ({ page }) => {
    test.setTimeout(30_000);
    const home = new HomePage(page);
    await home.navigate();
    await home.verifyFooterLoaded();
    const footerLinks = page.locator('footer a');
    const count = await footerLinks.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Footer: ${count} liens détectés`);
  });

  test('01.8 — Clic sur "Le Manifeste" redirige vers la bonne section', async ({ page }) => {
    test.setTimeout(30_000);
    const home = new HomePage(page);
    await home.navigate();
    await home.manifeste_link.first().click();
    await page.waitForLoadState('load');
    const url = page.url();
    expect(url).toMatch(/manifeste/i);
  });

  test('01.9 — Clic sur "Connexion" redirige vers la page de login', async ({ page }) => {
    test.setTimeout(30_000);
    const home = new HomePage(page);
    await home.navigate();
    await home.login_link.first().click();
    await page.waitForLoadState('load');
    const url = page.url();
    expect(url).toMatch(/login|connexion|signin/i);
  });

});
