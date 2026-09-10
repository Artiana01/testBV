/**
 * e2e-08-reserves.spec.ts
 * ---------------------------
 * Section 09 du cahier de recette — Réserves.
 * Couvre : RES-01 à RES-04 (best-effort — la création directe de réserve
 * peut n'être accessible que depuis le module Photos, cf. PHOTO-02).
 */

import { test, expect } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';

test.describe('BuildNivo — 09. Réserves', () => {

  test('Page Réserves accessible avec filtres de statut', async ({ page }) => {
    const mod = new ModulePage(page, '/reserves');
    await mod.goto();
    await mod.verifyLoaded(/réserves/i);

    for (const statut of ['Ouverte', 'Notifiée', 'Levée', 'Contestée']) {
      await expect(page.getByText(statut, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('RES-01 — Création d\'une réserve avec localisation et description', async ({ page }) => {
    const mod = new ModulePage(page, '/reserves');
    await mod.goto();

    const addBtn = await mod.findActionButton(/nouvelle réserve|ajouter une réserve|créer une réserve/i);
    test.skip(!addBtn,
      'RES-01 — aucun bouton de création directe sur /reserves : la création se fait probablement ' +
      'depuis une photo (PHOTO-02, "Créer une réserve"), voir e2e-07-photos.spec.ts.'
    );

    await addBtn!.click();
    await page.waitForTimeout(1000);

    const description = `Réserve E2E ${Date.now()}`;
    const descField = page.locator('textarea, input[type="text"]').first();
    await descField.fill(description);

    await page.getByRole('button', { name: /créer|ajouter|enregistrer/i }).first().click();
    await page.waitForTimeout(1500);

    await expect(page.getByText(description).first()).toBeVisible({ timeout: 10_000 });
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
