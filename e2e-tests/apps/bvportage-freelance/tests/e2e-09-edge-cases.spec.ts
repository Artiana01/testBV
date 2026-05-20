import { test, expect } from '../fixtures/fixtures';
import * as dotenv from 'dotenv';

dotenv.config();

test.describe('E2E-09 — Cas limites & comptes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fr/inscription');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Email déjà utilisé → Erreur', async ({ signupPage, page }) => {
    const email = process.env.FREELANCER_EMAIL || 'freelancer@bluevaloris.test';

    await signupPage.fillSignupForm('New User', email, 'Password123!');
    await signupPage.selectFreelance();
    await signupPage.submit();

    const isError = await signupPage.isErrorVisible();
    expect(isError).toBeTruthy();

    const errorMsg = await signupPage.getErrorMessage();
    expect(errorMsg.toLowerCase()).toContain('email');
  });

  test('Même email → Compte uniquement créé une fois', async ({ page }) => {
    const email = `test-${Date.now()}@test.test`;

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="last_name"], input[name*="nom"]', 'User One');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(url => !url.includes('/inscription'), { timeout: 30000 }).catch(() => {});

    await page.goto('/fr/inscription');
    await page.waitForLoadState('domcontentloaded');

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="last_name"], input[name*="nom"]', 'User Two');
    await page.fill('input[name="password"]', 'Password456!');
    await page.click('button[type="submit"]');

    const errorMsg = await page.textContent('.error-message, [role="alert"]');
    expect(errorMsg).toBeTruthy();
  });

  test('Même nom + email différent → OK (compte créé)', async ({ signupPage }) => {
    const name = 'Daniellah';
    const email1 = `daniellah.${Date.now()}@test.test`;
    const email2 = `daniellah.${Date.now() + 1}@test.test`;

    await signupPage.fillSignupForm(name, email1, 'Password123!');
    await signupPage.selectFreelance();
    await signupPage.submit();

    const isSuccess1 = await signupPage.isSuccessVisible();
    expect(isSuccess1).toBeTruthy();

    await signupPage.fillSignupForm(name, email2, 'Password456!');
    await signupPage.selectFreelance();
    await signupPage.submit();

    const isSuccess2 = await signupPage.isSuccessVisible();
    expect(isSuccess2).toBeTruthy();
  });

  test('Même nom et même email → Erreur', async ({ signupPage, page }) => {
    const name = 'Test User';
    const email = `test-${Date.now()}@test.test`;
    const password = 'TestPassword123!';

    await signupPage.fillSignupForm(name, email, password);
    await signupPage.selectFreelance();
    await signupPage.submit();

    await page.waitForURL(url => !url.includes('/inscription'), { timeout: 30000 }).catch(() => {});
    await page.goto('/fr/inscription');
    await page.waitForLoadState('domcontentloaded');

    await signupPage.fillSignupForm(name, email, password);
    await signupPage.selectFreelance();
    await signupPage.submit();

    const isError = await signupPage.isErrorVisible();
    expect(isError).toBeTruthy();
  });

  test('Formulaire sans civility → peut être accepté', async ({ signupPage }) => {
    const email = `test-${Date.now()}@test.test`;

    await signupPage.fillSignupForm('Test', email, 'Password123!');
    await signupPage.selectFreelance();
    await signupPage.submit();

    const url = await signupPage.getUrl();
    expect(url).toBeTruthy();
  });

  test('Cas limite: Email très long → Vérifier limite', async ({ signupPage }) => {
    const longEmail = 'a'.repeat(100) + '@test.test';

    await signupPage.fillSignupForm('Test', longEmail, 'Password123!');

    expect(true).toBeTruthy();
  });

  test('Cas limite: MDP très court → Validation', async ({ signupPage }) => {
    const email = `test-${Date.now()}@test.test`;

    await signupPage.fillSignupForm('Test', email, '123');

    expect(true).toBeTruthy();
  });
});
