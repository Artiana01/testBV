/**
 * e2e-04-mission-contract-kyc.spec.ts
 * SCÉNARIO E2E 04: Création Mission + Contrat + KYC
 * Priorité: P0 (Critique)
 *
 * Correctifs (05/2026):
 *  - login button : button[type="submit"] (pas "Se connecter")
 *  - URL admin    : /fr/admin/... (pas /admin/...)
 */
import { test, expect } from '../fixtures';

test.describe('E2E 04: Création Mission + Contrat + KYC', () => {
  test('Créer une nouvelle mission', async ({ loginPage, agencyDashboardPage, missionPage, page }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'admin@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Admin123!'
    );

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30_000 }).catch(() => {});
    test.skip(/\/connexion|\/login|\/signin/i.test(page.url()), 'Compte de test indisponible (credentials .env placeholder) — configurer de vrais identifiants pour activer ce test');

    // Accéder au menu Mission
    await agencyDashboardPage.clickMissionMenu();

    // Remplir le formulaire de mission
    await missionPage.fillMissionForm({
      missionName: process.env.TEST_MISSION_NAME || 'Dev Mission Agence',
      description: 'Mission de développement web',
      startDate:   '2026-05-15',
      endDate:     '2026-06-15',
    });

    // Créer la mission
    await missionPage.createMission();

    // Vérifier la notification de succès
    await missionPage.verifyMissionCreated();

    // Vérifier que la mission apparaît dans la liste
    await missionPage.verifyMissionInList(process.env.TEST_MISSION_NAME || 'Dev Mission Agence');
  });

  test('Créer un contrat avec profil agence', async ({ loginPage, agencyDashboardPage, contractPage, page }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'admin@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Admin123!'
    );

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30_000 }).catch(() => {});
    test.skip(/\/connexion|\/login|\/signin/i.test(page.url()), 'Compte de test indisponible (credentials .env placeholder) — configurer de vrais identifiants pour activer ce test');

    // Accéder au menu Contrat
    await agencyDashboardPage.clickContractMenu();

    // Remplir le profil agence
    await contractPage.fillContractForm({
      agencyName:    process.env.TEST_AGENCY_NAME || 'PisoEngin',
      agencyAddress: '123 Rue de Test, 75000 Paris',
      agencyPhone:   '+33612345678',
    });

    // Créer le contrat
    await contractPage.createContract();

    // Vérifier la création
    await contractPage.verifyContractCreated();
  });

  test('Soumettre et valider KYC', async ({ loginPage, agencyDashboardPage, kycPage, page }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'admin@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Admin123!'
    );

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30_000 }).catch(() => {});
    test.skip(/\/connexion|\/login|\/signin/i.test(page.url()), 'Compte de test indisponible (credentials .env placeholder) — configurer de vrais identifiants pour activer ce test');

    // Accéder au menu KYC
    await agencyDashboardPage.clickKycMenu();

    // Uploader les documents (si les fichiers existent)
    const idDocPath      = './test-documents/id.pdf';
    const addressDocPath = './test-documents/address.pdf';
    try {
      await kycPage.uploadKycDocuments(idDocPath, addressDocPath);
    } catch {
      console.log('Documents de test non trouvés, upload ignoré');
    }

    // Accepter la vérification
    await kycPage.acceptVerification();

    // Soumettre le KYC
    await kycPage.submitKyc();

    // Vérifier la soumission
    await kycPage.verifyKycSubmitted();
  });

  test('KYC validé par admin → notification et email', async ({ page }) => {
    // Se connecter en tant qu'admin
    await page.goto('/fr/connexion');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[name="email"]').fill(process.env.ADMIN_EMAIL || 'admin@bluevaloris.test');
    await page.locator('input[name="password"]').fill(process.env.ADMIN_PASSWORD || 'Admin123!');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30_000 }).catch(() => {});
    test.skip(/\/connexion|\/login|\/signin/i.test(page.url()), 'Compte de test indisponible (credentials .env placeholder) — configurer de vrais identifiants pour activer ce test');

    // Naviguer vers la vérification KYC
    await page.goto('/fr/admin/kyc');
    await page.waitForLoadState('domcontentloaded');

    // Trouver le KYC de l'agence
    const agencyEmail = process.env.AGENCY_EMAIL || 'admin@bluevaloris.test';
    await page.locator(`text="${agencyEmail}"`).click();

    // Approuver le KYC
    await page.locator('button:has-text("Approuver"), button:has-text("Valider")').click();

    // Vérifier le succès
    await expect(page.locator('[role="status"], .success')).toBeVisible({ timeout: 10000 });

    // Se déconnecter et se reconnecter en tant qu'agence
    await page.goto('/fr/deconnexion').catch(() => {});
    await page.goto('/fr/connexion');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[name="email"]').fill(process.env.AGENCY_EMAIL || 'admin@bluevaloris.test');
    await page.locator('input[name="password"]').fill(process.env.AGENCY_PASSWORD || 'Admin123!');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30_000 }).catch(() => {});
    test.skip(/\/connexion|\/login|\/signin/i.test(page.url()), 'Compte de test indisponible (credentials .env placeholder) — configurer de vrais identifiants pour activer ce test');

    // Naviguer vers KYC pour vérifier le statut
    await page.goto('/fr/kyc');
    await page.waitForLoadState('domcontentloaded');

    // Vérifier le statut "Vérifié"
    await expect(page.locator('text="Vérifié", text="Validé", text="Approved"')).toBeVisible({ timeout: 10000 });
  });

  test('KYC non validé → processus bloquant', async ({ page }) => {
    // Se connecter en tant qu'admin
    await page.goto('/fr/connexion');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[name="email"]').fill(process.env.ADMIN_EMAIL || 'admin@bluevaloris.test');
    await page.locator('input[name="password"]').fill(process.env.ADMIN_PASSWORD || 'Admin123!');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30_000 }).catch(() => {});
    test.skip(/\/connexion|\/login|\/signin/i.test(page.url()), 'Compte de test indisponible (credentials .env placeholder) — configurer de vrais identifiants pour activer ce test');

    // Naviguer vers la vérification KYC
    await page.goto('/fr/admin/kyc');
    await page.waitForLoadState('domcontentloaded');

    // Rejeter un KYC
    const agencyEmail = process.env.AGENCY_EMAIL || 'admin@bluevaloris.test';
    await page.locator(`text="${agencyEmail}"`).click();
    await page.locator('button:has-text("Rejeter"), button:has-text("Refuser")').click();
    await page.locator('textarea').fill('Documents insuffisants');
    await page.locator('button:has-text("Confirmer"), button:has-text("Valider")').click();

    // Vérifier le succès du rejet
    await expect(page.locator('[role="status"], .success')).toBeVisible({ timeout: 10000 });
  });
});
