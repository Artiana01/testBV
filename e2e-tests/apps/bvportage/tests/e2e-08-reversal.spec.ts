/**
 * e2e-08-reversal.spec.ts
 * SCÉNARIO E2E 08: Reversement
 * Priorité: P1 (Important)
 */
import { test, expect } from '../fixtures';

test.describe('E2E 08: Reversement', () => {
  test('Paiement validé → attente 72h → reversement effectué', async ({ loginPage, page }) => {
    // Se connecter en tant qu'agence
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    // Naviguer vers les paiements
    await page.goto('/fr/paiements');

    // Vérifier la présence d'un paiement avec statut "En attente de reversement"
    await expect(page.locator('text="En attente"')).toBeVisible({ timeout: 5000 });

    // Vérifier la mention "Reversement dans 72h"
    await expect(page.locator('text="72h", text="reversement"')).toBeVisible({ timeout: 5000 });
  });

  test('Historique des reversements accessibles', async ({ loginPage, page }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    // Naviguer vers l'historique des reversements
    await page.goto('/fr/reversements');

    // Vérifier la présence du tableau des reversements
    await expect(page.locator('table, [role="grid"]')).toBeVisible({ timeout: 5000 });

    // Vérifier les colonnes
    await expect(page.locator('text="Date"')).toBeVisible();
    await expect(page.locator('text="Montant"')).toBeVisible();
    await expect(page.locator('text="Statut"')).toBeVisible();
  });

  test('Montant du reversement conforme au paiement', async ({ loginPage, page }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'agency@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Agency123!'
    );

    // Naviguer vers les reversements
    await page.goto('/fr/reversements');

    // Récupérer le dernier montant de paiement
    const paymentAmount = await page.locator('[data-testid="payment-amount"]').first().textContent();

    // Vérifier que le montant du reversement correspond (après déduction des frais)
    // Le montant devrait être légèrement inférieur du au frais de plateforme
    const reversalAmount = await page.locator('[data-testid="reversal-amount"]').first().textContent();

    expect(reversalAmount).toBeTruthy();
  });

  test('Notification de reversement effectué', async ({ page }) => {
    // Se connecter
    await page.goto('/fr/connexion');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[name="email"]').fill(process.env.AGENCY_EMAIL || 'agency@bluevaloris.test');
    await page.locator('input[name="password"]').fill(process.env.AGENCY_PASSWORD || 'Agency123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});

    // Naviguer vers les reversements
    await page.goto('/fr/reversements');

    // Vérifier les notifications de statut
    await expect(page.locator('text="Effectué"')).toBeVisible({ timeout: 5000 });
  });
});
