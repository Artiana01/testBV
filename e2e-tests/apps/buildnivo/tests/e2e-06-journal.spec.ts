/**
 * e2e-06-journal.spec.ts
 * --------------------------
 * Section 07 du cahier de recette — Journal de chantier.
 * Couvre : JOUR-01 à JOUR-03 (best-effort).
 *
 * Le journal n'a plus de saisie manuelle : il est "composé automatiquement"
 * (présences, tâches, livraisons, incidents, météo, photos) — confirmé en direct
 * pour Direction, Conducteur, Chef de chantier et Coordinateur SPS (le seul rôle
 * en "write" sur ce module dans la matrice RBAC de l'app n'a pas non plus de
 * champ de saisie). JOUR-01 vérifie donc qu'une action réelle du chantier crée
 * bien son entrée dans le journal du jour.
 */

import { test, expect } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';
import { openModuleAs, isoDateInDays } from '../pages/RoleSession';

test.describe('BuildNivo — 07. Journal de chantier', () => {

  test('Page Journal de chantier accessible', async ({ page }) => {
    const mod = new ModulePage(page, '/journal');
    await mod.goto();
    await expect(page).not.toHaveURL(/\/connexion/);
    await mod.verifyEmptyStateOrData();
  });

  test('JOUR-01 — Une action du jour (création de tâche) est consignée automatiquement dans le journal', async ({ browser }) => {
    const { context, page, shell } = await openModuleAs(browser, 'conducteur', '/taches');

    const titre = `E2E Journal ${Date.now()}`;
    await page.getByRole('button', { name: 'Nouvelle tâche' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nouvelle tâche' });
    await dialog.getByPlaceholder(/reprendre l.enduit/i).fill(titre);
    await dialog.locator('input[type="date"]').fill(isoDateInDays(7));
    await dialog.getByRole('button', { name: 'Créer la tâche' }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    // Nettoyage best-effort (pas de suppression de tâche dans l'UI) : hors de "À faire".
    await page.locator('article').filter({ hasText: titre })
      .getByRole('combobox', { name: 'Changer le statut' }).selectOption('Terminée').catch(() => {});

    await page.goto('/journal', { waitUntil: 'domcontentloaded' });
    await shell.dismissOnboardingTour();
    await shell.waitForSkeletonToClear();

    // Le journal du jour est le premier bloc (le plus récent en tête).
    const entry = `Tâche créée : « ${titre} »`;
    await expect.poll(async () => {
      const text = await page.locator('article').first().innerText().catch(() => '');
      if (!text.includes(entry)) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await shell.waitForSkeletonToClear();
      }
      return text;
    }, { timeout: 45_000, intervals: [2_000, 5_000] }).toContain(entry);

    await context.close();
  });

});
