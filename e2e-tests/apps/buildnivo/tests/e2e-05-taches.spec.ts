/**
 * e2e-05-taches.spec.ts
 * -------------------------
 * Section 06 du cahier de recette — Tâches (Kanban).
 * Couvre : TASK-01 à TASK-05 (best-effort selon disponibilité des contrôles
 * de création dans les données de démo).
 */

import { test, expect } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';
import { openModuleAs, isoDateInDays } from '../pages/RoleSession';

test.describe('BuildNivo — 06. Tâches (Kanban)', () => {

  test('Tableau Kanban chargé avec les colonnes de statut attendues', async ({ page }) => {
    const mod = new ModulePage(page, '/taches');
    await mod.goto();
    await mod.verifyLoaded(/tâches/i);

    // Un filtre "Statut" (<select>) a été ajouté à cette page depuis la dernière recette —
    // ses <option> partagent le même libellé que les colonnes et sont "hidden" pour
    // Playwright, donc getVisibleText() (pas getByText brut) pour cibler la vraie colonne.
    for (const colonne of ['À faire', 'En cours', 'À valider', 'Bloquée', 'Terminée']) {
      await expect(mod.getVisibleText(colonne, true).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('Bascule entre vue Tableau et vue Liste', async ({ page }) => {
    const mod = new ModulePage(page, '/taches');
    await mod.goto();

    await mod.getVisibleText('Liste', true).first().click();
    await page.waitForTimeout(800);
    await mod.getVisibleText('Tableau', true).first().click();
    await page.waitForTimeout(800);

    await expect(mod.getVisibleText('À faire', true).first()).toBeVisible();
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

  // Matrice RBAC de l'app (/matrix, table role_module_permissions) : Tâches = "read" pour
  // Direction, "full" pour Conducteur de travaux — l'absence de "Nouvelle tâche" côté Direction
  // est donc voulue, la création se teste avec le Conducteur.
  test('TASK-01 — Création d\'une tâche avec titre, assigné et échéance (Conducteur de travaux)', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'conducteur', '/taches');

    await page.getByRole('button', { name: 'Nouvelle tâche' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nouvelle tâche' });
    await expect(dialog).toBeVisible();

    const titre = `E2E Tâche ${Date.now()}`;
    await dialog.getByPlaceholder(/reprendre l.enduit/i).fill(titre);
    await dialog.locator('select').filter({ has: page.locator('option', { hasText: 'Non assigné' }) })
      .selectOption({ label: 'Raivosoa Andria' });
    await dialog.locator('input[type="date"]').fill(isoDateInDays(7));

    const createBtn = dialog.getByRole('button', { name: 'Créer la tâche' });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    const card = page.locator('article').filter({ hasText: titre });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toContainText('Raivosoa Andria');

    // Nettoyage best-effort : aucune suppression de tâche dans l'UI, on la sort au moins de
    // la colonne "À faire" du chantier de démo partagé.
    await card.getByRole('combobox', { name: 'Changer le statut' }).selectOption('Terminée').catch(() => {});

    await context.close();
  });

  test('TASK-05 — Suppression d\'une tâche par un utilisateur non autorisé (rôle Intervenant simple)', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'intervenant-simple', '/taches');

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
