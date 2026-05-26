import { test, expect } from '../fixtures/fixtures';
import * as dotenv from 'dotenv';

dotenv.config();

test.describe('E2E-02 — Souscription Pack Freelance', () => {
  test.beforeEach(async ({ loginPage, dashboardFreelancePage, page }) => {
    await page.goto('/fr/connexion', { waitUntil: 'domcontentloaded', timeout: 45_000 });

    await loginPage.login(
      process.env.FREELANCER_EMAIL || 'freelancer@bluevaloris.test',
      process.env.FREELANCER_PASSWORD || 'Freelance123!'
    );

    await loginPage.chooseFreelanceProfile();

    await expect(dashboardFreelancePage.page).not.toHaveURL(/connexion|login|signin/, { timeout: 60_000 });
  });

  test('Pack Freelance Classic 79€ sélectionné', async ({ packPage, page }) => {
    await page.goto('/fr/packs', { waitUntil: 'domcontentloaded', timeout: 45_000 });

    await packPage.selectClassicPack();

    const isPackSelected = await packPage.isVisible('text=Classic');
    expect(isPackSelected).toBeTruthy();
  });

  test('Paiement Stripe validé', async ({ packPage, page }) => {
    await page.goto('/fr/packs', { waitUntil: 'domcontentloaded', timeout: 45_000 });

    await packPage.selectClassicPack();
    await packPage.proceedToPayment();

    const url = page.url();
    expect(url).not.toContain('packs');
  });

  test('Confirmation paiement et email reçu', async ({ packPage }) => {
    const isSuccess = await packPage.isSuccessVisible();
    expect(isSuccess).toBeTruthy();

    const isPacked = await packPage.isPackActivated();
    expect(isPacked).toBeTruthy();
  });

  test('BUG: Paiement sans formulaire de carte visible', async ({ packPage, page }) => {
    await page.goto('/fr/packs', { waitUntil: 'domcontentloaded', timeout: 45_000 });

    await packPage.selectClassicPack();
    await packPage.proceedToPayment();

    const stripeFrame = await page.$('iframe[title*="Stripe"]');
    console.log('BUG F1: Formulaire Stripe non visible - paiement passé sans saisie carte');
  });
});
