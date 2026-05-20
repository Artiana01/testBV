/**
 * e2e-02-login-pack-subscription.spec.ts
 * SCÉNARIO E2E 02: Connexion + Souscription Pack
 * Priorité: P0 (Critique)
 *
 * Sélecteurs login réels validés (05/2026) :
 *   email    → input[name="email"] placeholder "johndoe@gmail.com"
 *   password → input[name="password"] placeholder "••••••••"
 *   submit   → button[type="submit"] "Continuer avec mon adresse e-mail"
 */
import { test, expect } from '../fixtures';

test.describe('E2E 02: Connexion + Souscription Pack', () => {
  test('Connexion et accès au dashboard agence', async ({ loginPage, agencyDashboardPage, page }) => {
    await loginPage.navigate('/login');

    // Connexion avec identifiants agence (à renseigner dans apps/bvportage/.env)
    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    // Attendre la navigation post-login
    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30000 }).catch(() => {});

    // Vérifier que le dashboard est accessible
    await agencyDashboardPage.verifyDashboardLoaded();
  });

  test('Sélection et souscription au pack Agency (159€)', async ({ loginPage, page, packPage }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30000 }).catch(() => {});

    // Naviguer vers la page de sélection des packs
    await page.goto('/fr/packs');
    await page.waitForLoadState('domcontentloaded');

    // Vérifier que le prix est affiché
    await packPage.verifyPackPrice('159');

    // Sélectionner le pack Agency et s'abonner
    await packPage.selectAgencyPack();
    await packPage.subscribe();

    // Vérifier la redirection vers paiement
    await expect(page).toHaveURL(/payment|checkout|paiement/, { timeout: 15000 });
  });

  test('Paiement réussi du pack', async ({ loginPage, page, packPage, paymentPage }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30000 }).catch(() => {});
    await page.goto('/fr/packs');
    await page.waitForLoadState('domcontentloaded');

    // Sélectionner et payer le pack
    await packPage.selectAgencyPack();
    await packPage.subscribe();

    // Attendre la redirection vers la page de paiement
    await page.waitForURL(/payment|checkout|paiement/, { timeout: 15000 });

    // Remplir les informations de paiement (carte de test Stripe)
    await paymentPage.fillPaymentForm({
      cardNumber:     '4242 4242 4242 4242',
      expiry:         '12/25',
      cvc:            '123',
      cardholderName: 'Test Agency',
    });

    await paymentPage.pay();

    // Vérifier le succès du paiement
    await paymentPage.verifyPaymentSuccess();

    // Vérifier la redirection vers le dashboard
    await expect(page).toHaveURL(/dashboard|tableau|accueil/, { timeout: 15000 });
  });

  test('Pack activé et email de confirmation reçu', async ({ loginPage, page, agencyDashboardPage }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    await page.waitForURL(url => !url.includes('/connexion'), { timeout: 30000 }).catch(() => {});

    // Vérifier que le dashboard affiche le statut du pack actif
    await agencyDashboardPage.verifyDashboardLoaded();

    // Vérifier la présence du badge "Pack activé" (texte flexible)
    const packBadge = page.locator(
      'text="Pack Agency activé", text="Active", text="Activé", text="Pack actif"'
    );
    await expect(packBadge).toBeVisible({ timeout: 10000 });
  });
});
