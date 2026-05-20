import { test, expect } from '../fixtures/fixtures';
import * as dotenv from 'dotenv';

dotenv.config();

test.describe('E2E-03 — Création Projet + Client', () => {
  test.beforeEach(async ({ loginPage, dashboardFreelancePage, page }) => {
    await page.goto('/fr/connexion');
    await page.waitForLoadState('domcontentloaded');

    await loginPage.login(
      process.env.FREELANCER_EMAIL || 'freelancer@bluevaloris.test',
      process.env.FREELANCER_PASSWORD || 'Freelance123!'
    );

    await loginPage.chooseFreelanceProfile();

    await expect(dashboardFreelancePage.page).toHaveURL(new RegExp('dashboard|home|tableau'), { timeout: 30000 });
  });

  test('Création projet avec nouveau client', async ({ clientPage, page }) => {
    await clientPage.goToClients();

    const projectName = process.env.NEW_PROJECT_NAME || 'Developpement_Tech_Demo';
    const clientEmail = process.env.NEW_CLIENT_EMAIL || 'harivola3518@gmail.com';

    await clientPage.createProject(projectName, clientEmail);

    const isSuccess = await clientPage.isSuccessVisible();
    expect(isSuccess).toBeTruthy();
  });

  test('Détection client existant (HariEngin)', async ({ clientPage, page }) => {
    await clientPage.goToClients();

    await clientPage.createProject('Test Project', 'harivola@existing.test');

    const isExisting = await clientPage.isExistingClientDetected();
    expect(isExisting).toBeTruthy();
  });

  test('Projet créé automatiquement lors de création client', async ({ projectPage, page }) => {
    await page.goto('/fr/clients');
    await page.waitForLoadState('domcontentloaded');

    const projectName = `Test_${Date.now()}`;
    const clientEmail = `client_${Date.now()}@test.test`;

    await projectPage.createProject(projectName, clientEmail);

    const isVisible = await projectPage.isProjectVisible(projectName);
    expect(isVisible).toBeTruthy();
  });

  test('Client visible dans liste', async ({ page }) => {
    await page.goto('/fr/clients');
    await page.waitForLoadState('domcontentloaded');

    const clientList = await page.$('[class*="client"]');
    expect(clientList).toBeTruthy();
  });
});
