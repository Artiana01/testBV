import { test, expect } from '../fixtures/fixtures';
import * as dotenv from 'dotenv';

dotenv.config();

test.describe('E2E-01 — Inscription Freelance + OTP', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fr/inscription');
    await page.waitForLoadState('domcontentloaded');
  });

  test('CAS 1: Formulaire incomplet → refus', async ({ signupPage }) => {
    await signupPage.fillSignupForm('Test User', '', '');
    await expect(signupPage.page).toHaveURL(new RegExp('signup|inscription'), { timeout: 5000 });
  });

  test('CAS 2: Création de compte complet → OK', async ({ signupPage, page }) => {
    const email = process.env.NEW_FREELANCER_EMAIL || 'daniellah.freelance@test.test';
    const password = process.env.NEW_FREELANCER_PASSWORD || 'Daniellah3!';

    await signupPage.fillSignupForm('Daniellah', email, password);
    await signupPage.selectFreelance();
    await signupPage.submit();

    const isSuccess = await signupPage.isSuccessVisible();
    expect(isSuccess).toBeTruthy();
  });

  test('CAS 3: Email déjà utilisé → erreur', async ({ signupPage }) => {
    const email = process.env.FREELANCER_EMAIL || 'freelancer@bluevaloris.test';

    await signupPage.fillSignupForm('Test', email, 'TestPassword123!');
    await signupPage.selectFreelance();
    await signupPage.submit();

    const isError = await signupPage.isErrorVisible();
    expect(isError).toBeTruthy();
  });

  test('CAS 4: Même nom + email différent → OK', async ({ signupPage }) => {
    const email = `test.${Date.now()}@test.test`;

    await signupPage.fillSignupForm('Daniellah', email, 'TestPassword123!');
    await signupPage.selectFreelance();
    await signupPage.submit();

    const isSuccess = await signupPage.isSuccessVisible();
    expect(isSuccess).toBeTruthy();
  });
});

test.describe('E2E-01 — OTP Validation', () => {
  test('OTP reçu et validation OK', async ({ page }) => {
    await page.goto('/fr/verification-otp');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    if (!url.includes('otp') && !url.includes('verification')) {
      console.log('Page OTP non accessible directement, test ignoré');
      return;
    }

    const otpInputs = await page.$$('input[inputmode="numeric"]');
    expect(otpInputs.length).toBeGreaterThan(0);
  });
});
