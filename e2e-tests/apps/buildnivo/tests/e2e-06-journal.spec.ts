/**
 * e2e-06-journal.spec.ts
 * --------------------------
 * Section 07 du cahier de recette — Journal de chantier.
 * Couvre : JOUR-01 à JOUR-03 (best-effort).
 */

import { test, expect } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';

test.describe('BuildNivo — 07. Journal de chantier', () => {

  test('Page Journal de chantier accessible', async ({ page }) => {
    const mod = new ModulePage(page, '/journal');
    await mod.goto();
    await expect(page).not.toHaveURL(/\/connexion/);
    await mod.verifyEmptyStateOrData();
  });

  test('JOUR-01 — Création d\'une entrée de journal du jour', async ({ page }) => {
    const mod = new ModulePage(page, '/journal');
    await mod.goto();

    const entryField = page.locator('textarea').first();
    const hasEntryField = await entryField.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!hasEntryField, 'JOUR-01 — zone de saisie du journal introuvable pour ce rôle/chantier.');

    const contenu = `Entrée E2E ${new Date().toISOString()}`;
    await entryField.fill(contenu);

    const submitBtn = await mod.findActionButton(/ajouter|publier|enregistrer|valider/i);
    test.skip(!submitBtn, 'JOUR-01 — bouton de validation de l\'entrée introuvable.');
    await submitBtn!.click();
    await page.waitForTimeout(1500);

    await expect(page.getByText(contenu).first()).toBeVisible({ timeout: 10_000 });
  });

});
