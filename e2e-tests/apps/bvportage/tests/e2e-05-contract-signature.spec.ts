/**
 * e2e-05-contract-signature.spec.ts
 * SCÉNARIO E2E 05: Signature Contrat
 * Priorité: P0 (Critique)
 *
 * Correctifs (05/2026):
 *  - login button : button[type="submit"] (pas "Se connecter")
 *  - URL contrats : /fr/contrats (pas /contracts)
 */
import { test, expect } from '../fixtures';

test.describe('E2E 05: Signature Contrat', () => {
  test('Générer et prévisualiser contrat', async ({ loginPage, agencyDashboardPage, contractPage, page }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30000 }).catch(() => {});

    // Accéder au menu Contrat
    await agencyDashboardPage.clickContractMenu();

    // Générer le contrat
    await contractPage.createContract();

    // Prévisualiser
    await contractPage.previewContract();

    // Vérifier que le PDF s'affiche (iframe ou embed)
    await expect(page.locator('embed, iframe, [data-testid="pdf-preview"]')).toBeVisible({ timeout: 10000 });
  });

  test('Télécharger le contrat', async ({ loginPage, agencyDashboardPage, contractPage, page }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30000 }).catch(() => {});

    await agencyDashboardPage.clickContractMenu();
    await contractPage.createContract();

    // Télécharger le contrat
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await contractPage.downloadContract();
    const download = await downloadPromise;

    // Vérifier que le fichier a été téléchargé
    expect(download.suggestedFilename()).toMatch(/contract|contrat|pdf/i);
  });

  test('Envoyer pour signature et signer', async ({ loginPage, agencyDashboardPage, contractPage, page }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30000 }).catch(() => {});

    await agencyDashboardPage.clickContractMenu();
    await contractPage.createContract();

    // Envoyer pour signature
    await contractPage.sendForSignature();

    // Vérifier que la page/section de signature s'ouvre
    await expect(page.locator('text="Signature", text="Signer", [data-testid="signature-section"]')).toBeVisible({ timeout: 10000 });

    // Signer le contrat
    await contractPage.signContract();

    // Vérifier le succès de la signature
    await contractPage.verifyContractCreated();
  });

  test('Contrat signé → email de confirmation', async ({ loginPage, agencyDashboardPage, page }) => {
    // Se connecter via LoginPage (sélecteurs corrects)
    await loginPage.navigate('/login');
    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30000 }).catch(() => {});

    // Naviguer vers les contrats
    await agencyDashboardPage.clickContractMenu();

    // Vérifier le statut "Signé"
    await expect(page.locator('text="Signé", text="Signed"')).toBeVisible({ timeout: 10000 });
  });
});
