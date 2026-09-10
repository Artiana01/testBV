/**
 * e2e-12-finances.spec.ts
 * ---------------------------
 * Section 13 du cahier de recette — Finances & lots financiers.
 * Couvre : FIN-01 à FIN-03 (best-effort).
 */

import { test, expect } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';

test.describe('BuildNivo — 13. Finances & lots financiers', () => {

  test('Page Finances accessible', async ({ page }) => {
    const mod = new ModulePage(page, '/finances');
    await mod.goto();
    await expect(page).not.toHaveURL(/\/connexion/);
    await mod.verifyEmptyStateOrData();
  });

  test('FIN-01 — Création d\'un lot financier avec budget alloué', async ({ page }) => {
    const mod = new ModulePage(page, '/finances');
    await mod.goto();

    const addBtn = await mod.findActionButton(/nouveau lot|ajouter un lot|créer un lot/i);
    test.skip(!addBtn, 'FIN-01 — bouton de création de lot financier introuvable pour ce rôle.');

    await addBtn!.click();
    await page.waitForTimeout(1000);

    const nomLot = `Lot E2E ${Date.now()}`;
    await page.locator('input[type="text"]').first().fill(nomLot);
    const budgetField = page.locator('input[type="number"]').first();
    if (await budgetField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await budgetField.fill('10000');
    }

    await page.getByRole('button', { name: /créer|ajouter|enregistrer/i }).first().click();
    await page.waitForTimeout(1500);

    await expect(page.getByText(nomLot).first()).toBeVisible({ timeout: 10_000 });
  });

  test('FIN-03 — Saisie d\'un budget négatif → validation refusée', async ({ page }) => {
    const mod = new ModulePage(page, '/finances');
    await mod.goto();

    const addBtn = await mod.findActionButton(/nouveau lot|ajouter un lot|créer un lot/i);
    test.skip(!addBtn, 'FIN-03 — bouton de création de lot financier introuvable pour ce rôle.');

    await addBtn!.click();
    await page.waitForTimeout(1000);

    await page.locator('input[type="text"]').first().fill(`Lot négatif E2E ${Date.now()}`);
    const budgetField = page.locator('input[type="number"]').first();
    await budgetField.fill('-5000');

    await page.getByRole('button', { name: /créer|ajouter|enregistrer/i }).first().click();
    await page.waitForTimeout(1000);

    const errorHint = page.getByText(/doit être positif|invalide|négatif/i);
    const hasError = await errorHint.first().isVisible({ timeout: 3_000 }).catch(() => false);
    const fieldInvalid = await budgetField.evaluate((el: HTMLInputElement) => !el.checkValidity()).catch(() => false);

    expect(hasError || fieldInvalid).toBeTruthy();
  });

});
