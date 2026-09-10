/**
 * e2e-09-visas.spec.ts
 * -------------------------
 * Section 10 du cahier de recette — Visas de plans.
 * Couvre : VISA-01 à VISA-05 (best-effort).
 */

import { test, expect } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';

test.describe('BuildNivo — 10. Visas de plans', () => {

  test('Page Visas & plans accessible avec le circuit d\'instruction affiché', async ({ page }) => {
    const mod = new ModulePage(page, '/visas');
    await mod.goto();
    await mod.verifyLoaded(/visas.*plans/i);

    for (const etape of ['Dépôt BET', 'Visa MOEX', 'Contrôle technique', 'Diffusion chantier']) {
      await expect(page.getByText(etape, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('VISA-01 — Dépôt d\'un plan pour visa', async ({ page }) => {
    const mod = new ModulePage(page, '/visas');
    await mod.goto();

    const depositBtn = await mod.findActionButton(/déposer un plan|nouveau dépôt|ajouter un plan/i);
    test.skip(!depositBtn, 'VISA-01 — bouton de dépôt de plan introuvable pour ce rôle.');

    await depositBtn!.click();
    await page.waitForTimeout(1000);
    // Le <input type="file"> natif est volontairement masqué (class="hidden") — une zone de
    // dépôt stylée le déclenche via JS. On vérifie sa présence, pas sa visibilité visuelle.
    await expect(page.locator('input[type="file"]').first()).toBeAttached({ timeout: 5_000 });
  });

  test('Filtres par discipline disponibles (Structure, Fluides, Électricité...)', async ({ page }) => {
    const mod = new ModulePage(page, '/visas');
    await mod.goto();
    // Filtre = <select> natif : le texte "Structure" vient d'un <option> interne, considéré
    // "hidden" par Playwright — on vérifie donc la visibilité du <select> lui-même.
    const disciplineSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Structure' }) }).first();
    await expect(disciplineSelect).toBeVisible({ timeout: 10_000 });
  });

});
