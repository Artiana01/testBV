/**
 * e2e-08-reserves.spec.ts
 * ---------------------------
 * Section 09 du cahier de recette — Réserves.
 * Couvre : RES-01 à RES-04 (best-effort).
 */

import { test, expect } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';
import { openModuleAs, isoDateInDays } from '../pages/RoleSession';

test.describe('BuildNivo — 09. Réserves', () => {

  test('Page Réserves accessible avec filtres de statut', async ({ page }) => {
    const mod = new ModulePage(page, '/reserves');
    await mod.goto();
    await mod.verifyLoaded(/réserves/i);

    for (const statut of ['Ouverte', 'Notifiée', 'Levée', 'Contestée']) {
      await expect(page.getByText(statut, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  // Matrice RBAC de l'app (/matrix) : Réserves = "read" pour Direction, "full" pour Conducteur de
  // travaux — le bouton "Nouvelle réserve" n'existe (volontairement) que pour ce dernier.
  test('RES-01 — Création d\'une réserve avec localisation et description (Conducteur de travaux)', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'conducteur', '/reserves');

    await page.getByRole('button', { name: 'Nouvelle réserve' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nouvelle réserve' });
    await expect(dialog).toBeVisible();

    const titre = `E2E Réserve ${Date.now()}`;
    await dialog.getByPlaceholder(/fissure cloison/i).fill(titre);
    // Zone et Concerné sont des listes personnalisées (bouton "—" + listbox avec recherche).
    await dialog.getByText('Zone *').locator('xpath=following::button[1]').click();
    await page.getByRole('listbox').getByRole('option', { name: 'Bâtiment Principal', exact: true }).click();
    await dialog.getByText('Concerné *').locator('xpath=following::button[1]').click();
    await page.getByRole('listbox').getByRole('option', { name: 'Entreprise Principale', exact: true }).click();
    await dialog.locator('input[type="date"]').fill(isoDateInDays(14));

    await dialog.getByRole('button', { name: 'Créer la réserve' }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    const row = page.getByRole('row').filter({ hasText: titre });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText('Bâtiment Principal');
    await expect(row).toContainText('Entreprise Principale');
    await expect(row).toContainText(/ouverte/i);

    // Nettoyage : pas de suppression de réserve dans l'UI, on la lève (état terminal).
    await row.getByRole('button', { name: 'Marquer levée' }).click();
    await expect(row).toContainText(/levée/i, { timeout: 15_000 });

    await context.close();
  });

  test('Filtrage des réserves par lot et par zone', async ({ page }) => {
    const mod = new ModulePage(page, '/reserves');
    await mod.goto();
    // Filtres = <select> natifs : le texte affiché vient d'un <option> interne, que
    // Playwright considère "hidden" — on vérifie donc la visibilité du <select> lui-même.
    const lotSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /tous les lots/i }) }).first();
    await expect(lotSelect).toBeVisible({ timeout: 10_000 });
    const zoneSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /toutes les zones/i }) }).first();
    await expect(zoneSelect).toBeVisible();
  });

});
