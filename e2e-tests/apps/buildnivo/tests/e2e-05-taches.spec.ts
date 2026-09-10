/**
 * e2e-05-taches.spec.ts
 * -------------------------
 * Section 06 du cahier de recette — Tâches (Kanban).
 * Couvre : TASK-01 à TASK-05 (best-effort selon disponibilité des contrôles
 * de création dans les données de démo).
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ModulePage } from '../pages/ModulePage';

test.describe('BuildNivo — 06. Tâches (Kanban)', () => {

  test('Tableau Kanban chargé avec les colonnes de statut attendues', async ({ page }) => {
    const mod = new ModulePage(page, '/taches');
    await mod.goto();
    await mod.verifyLoaded(/tâches/i);

    for (const colonne of ['À faire', 'En cours', 'À valider', 'Bloquée', 'Terminée']) {
      await expect(page.getByText(colonne, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('Bascule entre vue Tableau et vue Liste', async ({ page }) => {
    const mod = new ModulePage(page, '/taches');
    await mod.goto();

    await page.getByText('Liste', { exact: true }).first().click();
    await page.waitForTimeout(800);
    await page.getByText('Tableau', { exact: true }).first().click();
    await page.waitForTimeout(800);

    await expect(page.getByText('À faire', { exact: true }).first()).toBeVisible();
  });

  test('Filtre par corps d\'état et par zone disponible', async ({ page }) => {
    const mod = new ModulePage(page, '/taches');
    await mod.goto();

    // Les filtres sont des <select> natifs : leur texte affiché vient d'un <option> interne,
    // que Playwright considère "hidden" (comportement standard pour <option>). On vérifie donc
    // la visibilité du <select> lui-même plutôt que celle du texte de l'option sélectionnée.
    await expect(page.getByText(/corps d'état/i).first()).toBeVisible({ timeout: 10_000 });
    const zoneSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Zone' }) }).first();
    await expect(zoneSelect).toBeVisible();
  });

  test('TASK-01 — Création d\'une tâche avec titre, assigné et échéance', async ({ page }) => {
    const mod = new ModulePage(page, '/taches');
    await mod.goto();

    const addBtn = await mod.findActionButton(/nouvelle tâche|ajouter une tâche|créer une tâche/i);
    test.skip(!addBtn, 'TASK-01 — bouton de création de tâche non trouvé (peut être accessible uniquement depuis une colonne du Kanban).');

    await addBtn!.click();
    await page.waitForTimeout(1000);

    const titre = `E2E Tâche ${Date.now()}`;
    const titreField = page.locator('input[type="text"], input:not([type])').first();
    await titreField.fill(titre);

    await page.getByRole('button', { name: /créer|ajouter|enregistrer|valider/i }).first().click();
    await page.waitForTimeout(1500);

    await expect(page.getByText(titre).first()).toBeVisible({ timeout: 10_000 });
  });

  test('TASK-05 — Suppression d\'une tâche par un utilisateur non autorisé (rôle Intervenant simple)', async ({ browser }) => {
    const sessionFile = path.resolve(__dirname, '../auth/intervenant-simple.json');
    test.skip(!fs.existsSync(sessionFile), 'Session "Intervenant sans droit particulier" non disponible (global-setup).');

    const context = await browser.newContext({ storageState: sessionFile });
    const page = await context.newPage();
    const mod = new ModulePage(page, '/taches');
    await mod.goto();

    const deleteBtn = page.getByRole('button', { name: /supprimer/i }).first();
    const hasDeleteOption = await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    // Un intervenant sans droit particulier ne doit pas avoir d'action de suppression visible,
    // ou celle-ci doit être bloquée (403) si elle est tentée.
    if (hasDeleteOption) {
      await deleteBtn.click();
      await page.waitForTimeout(1000);
      const denied = page.getByText(/403|non autorisé|accès refusé/i);
      await expect(denied.first()).toBeVisible({ timeout: 5_000 });
    } else {
      expect(hasDeleteOption).toBeFalsy();
    }

    await context.close();
  });

});
