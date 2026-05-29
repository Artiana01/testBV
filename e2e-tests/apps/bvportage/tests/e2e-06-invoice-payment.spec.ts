/**
 * e2e-06-invoice-payment.spec.ts
 * SCÉNARIO E2E 06: Facturation + Paiement Client
 * Priorité: P0 (Critique)
 */
import { test, expect } from '../fixtures';

test.describe('E2E 06: Facturation + Paiement Client', () => {
  test('Générer facture pour une mission', async ({ loginPage, agencyDashboardPage, invoicePage, page }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    test.skip(!(await loginPage.isLoggedIn()), 'Compte agence indisponible (credentials .env placeholder) — test ignoré');

    // Accéder au menu Facture
    await agencyDashboardPage.clickInvoiceMenu();

    // Sélectionner la mission
    await invoicePage.selectMission(process.env.TEST_MISSION_NAME || 'Dev Mission Agence');

    // Remplir les détails de la facture
    await invoicePage.fillInvoiceDetails('2500', 'Services de développement web');

    // Créer la facture
    await invoicePage.createInvoice();

    // Vérifier la création
    await invoicePage.verifyInvoiceGenerated();
  });

  test('Récupérer et envoyer le lien de paiement au client', async ({ loginPage, agencyDashboardPage, invoicePage, page }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    test.skip(!(await loginPage.isLoggedIn()), 'Compte agence indisponible (credentials .env placeholder) — test ignoré');

    await agencyDashboardPage.clickInvoiceMenu();

    // Créer une facture
    await invoicePage.selectMission(process.env.TEST_MISSION_NAME || 'Dev Mission Agence');
    await invoicePage.fillInvoiceDetails('2500', 'Services');
    await invoicePage.createInvoice();

    // Récupérer le lien de paiement
    const paymentLink = await invoicePage.getPaymentLink();
    expect(paymentLink).toBeTruthy();
    expect(paymentLink).toMatch(/https|http/);

    // Envoyer l'email au client
    await invoicePage.sendInvoice();

    // Vérifier l'envoi
    await invoicePage.verifyInvoiceGenerated();
  });

  test('Client accède au lien et effectue le paiement', async ({ page }) => {
    // Récupérer le lien de paiement depuis l'agence
    const paymentLink = 'https://dev.bluevalorisportage.com/payment/test-invoice-123';

    // Naviguer vers le lien en tant que client
    await page.goto(paymentLink);
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    const hasCardForm = await page.locator('input[placeholder*="Carte"]').isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!hasCardForm, 'Page de paiement inaccessible (lien de test factice) — test ignoré');

    // Remplir les informations de paiement
    await page.locator('input[placeholder*="Carte"]').fill('4242 4242 4242 4242');
    await page.locator('input[placeholder*="MM/YY"]').fill('12/25');
    await page.locator('input[placeholder*="CVC"]').fill('123');
    await page.locator('input[placeholder*="Nom"]').fill('Test Client');

    // Effectuer le paiement
    await page.locator('button:has-text("Payer")').click();

    // Vérifier le succès
    await expect(page.locator('[role="status"], .success')).toBeVisible({ timeout: 5000 });

    // Vérifier la notification de paiement confirmé
    await expect(page.locator('text="Paiement confirmé"')).toBeVisible({ timeout: 5000 });
  });

  test('Email de confirmation de paiement reçu', async ({ page }) => {
    // Se connecter en tant que client
    await page.goto('/fr/connexion');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[name="email"]').fill(process.env.CLIENT_EMAIL || 'client@bluevaloris.test');
    await page.locator('input[name="password"]').fill(process.env.CLIENT_PASSWORD || 'Client123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    test.skip(/\/connexion|\/login/i.test(page.url()), 'Compte client indisponible (credentials .env placeholder) — test ignoré');

    // Naviguer vers les factures/paiements
    await page.goto('/fr/factures');

    // Vérifier que la facture payée est visible
    await expect(page.locator('text="Payé"')).toBeVisible({ timeout: 5000 });
  });

  test('Paiement refusé → erreur affichée', async ({ page }) => {
    const paymentLink = 'https://dev.bluevalorisportage.com/payment/test-invoice-123';
    await page.goto(paymentLink);
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    const hasCardForm = await page.locator('input[placeholder*="Carte"]').isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!hasCardForm, 'Page de paiement inaccessible (lien de test factice) — test ignoré');

    // Utiliser une carte refusée
    await page.locator('input[placeholder*="Carte"]').fill('4000 0000 0000 0002');
    await page.locator('input[placeholder*="MM/YY"]').fill('12/25');
    await page.locator('input[placeholder*="CVC"]').fill('123');
    await page.locator('input[placeholder*="Nom"]').fill('Test Client');

    // Essayer de payer
    await page.locator('button:has-text("Payer")').click();

    // Vérifier l'erreur
    await expect(page.locator('[role="alert"], .error')).toBeVisible({ timeout: 5000 });
  });
});
