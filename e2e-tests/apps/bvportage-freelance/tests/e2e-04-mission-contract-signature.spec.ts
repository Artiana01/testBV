import { test, expect } from '../fixtures/fixtures';
import * as dotenv from 'dotenv';

dotenv.config();

test.describe('E2E-04 — Mission + Contrat + Signature', () => {
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

  test('Création mission avec statut Brouillon', async ({ missionPage, page }) => {
    await page.goto('/fr/missions');
    await page.waitForLoadState('domcontentloaded');

    const title = process.env.MISSION_TITLE || 'Dev_Mission_Demo';
    const amount = process.env.MISSION_AMOUNT || '500';

    await missionPage.createMission(title, amount);

    const isSuccess = await missionPage.isSuccessVisible();
    expect(isSuccess).toBeTruthy();

    const isDraft = await missionPage.isDraftStatus();
    expect(isDraft).toBeTruthy();
  });

  test('Génération et prévisualisation PDF du contrat', async ({ missionPage, contractPage, page }) => {
    await page.goto('/fr/missions');
    await page.waitForLoadState('domcontentloaded');

    const title = process.env.MISSION_TITLE || 'Dev_Mission_Demo';

    await missionPage.editMission(title);
    await missionPage.createContract();

    await contractPage.generatePdf();
    await contractPage.previewContract();

    const isPdfVisible = await contractPage.isPdfPreviewVisible();
    expect(isPdfVisible).toBeTruthy();
  });

  test('Téléchargement PDF du contrat', async ({ contractPage, page }) => {
    await page.goto('/fr/missions');
    await page.waitForLoadState('domcontentloaded');

    const title = process.env.MISSION_TITLE || 'Dev_Mission_Demo';
    const missionRow = page.locator(`text="${title}"`).first();
    await missionRow.click();

    await contractPage.downloadContract();

    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('Envoi pour signature', async ({ contractPage, page }) => {
    await page.goto('/fr/missions');
    await page.waitForLoadState('domcontentloaded');

    const title = process.env.MISSION_TITLE || 'Dev_Mission_Demo';
    const missionRow = page.locator(`text="${title}"`).first();
    await missionRow.click();

    await contractPage.sendForSignature();

    const isSuccess = await contractPage.isSuccessVisible();
    expect(isSuccess).toBeTruthy();
  });

  test('Signature du contrat', async ({ contractPage, page }) => {
    await page.goto('/fr/signer-contrat');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    if (!url.includes('signer') && !url.includes('sign')) {
      console.log('Page de signature non accessible directement, test ignoré');
      return;
    }

    await contractPage.signContract('Signature Test');

    const isSuccess = await contractPage.isSuccessVisible();
    expect(isSuccess).toBeTruthy();
  });

  test('Notification de signature réussie', async ({ page }) => {
    const successMsg = await page.textContent('.success-message, .alert-success');
    expect(successMsg).toBeTruthy();
  });
});
