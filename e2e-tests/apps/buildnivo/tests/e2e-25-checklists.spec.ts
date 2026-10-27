/**
 * e2e-25-checklists.spec.ts
 * -------------------------
 * Module "Checklists métier" (/checklists) : autocontrôle qualité rempli par corps de métier, à partir
 * de modèles (questions) gérés par le Conducteur de travaux.
 *
 * Droits observés (sur le chantier de démo - les droits dépendent du rôle sur le chantier actif) :
 *  - Direction : consulte et gère les modèles
 *  - Conducteur de travaux : "Gérer les modèles"
 *  - Chef de chantier : consulte et valide les checklists soumises
 *  - Salarié ouvrier : "Remplir une checklist"
 *
 * Aucun modèle ni checklist n'est créé (pas de suppression dans l'UI) : les formulaires sont ouverts
 * puis annulés/fermés.
 */

import { test, expect } from '@playwright/test';
import { openModuleAs } from '../pages/RoleSession';

const COLUMNS = ['Libellé', 'Corps de métier', 'Rempli par', 'Date', 'Statut', 'Actions'];

test.describe('BuildNivo - 25. Checklists métier', () => {

  test('CHK-01 - Direction : registre des checklists et gestion des modèles (aucun accès restreint)', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'direction', '/checklists');
    await expect(page.getByRole('heading', { name: 'Checklists métier', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /accès restreint/i })).toHaveCount(0);
    for (const col of COLUMNS) await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gérer les modèles' })).toBeVisible();
    await context.close();
  });

  test('CHK-02 - Conducteur de travaux : registre (colonnes, filtre par corps de métier, modèles) et gestion des modèles', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'conducteur', '/checklists');
    await expect(page.getByRole('heading', { name: 'Checklists métier', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/autocontrôle qualité rempli par corps de métier/i)).toBeVisible();
    for (const col of COLUMNS) await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();
    await expect(page.getByText(/modèles disponibles/i)).toBeVisible();
    await expect(page.locator('select').filter({ has: page.locator('option', { hasText: 'Tous' }) }).first()).toBeVisible();

    // Le conducteur gère les modèles, il ne remplit pas de checklist.
    await expect(page.getByRole('button', { name: 'Remplir une checklist' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Gérer les modèles' }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Gérer les modèles' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Nouveau modèle')).toBeVisible();
    for (const label of ['Corps de métier', 'Libellé', 'Questions']) await expect(dialog.getByText(label, { exact: true }).first()).toBeVisible();
    await expect(dialog.getByPlaceholder(/electricite, plomberie, maconnerie/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Ajouter une question' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Créer le modèle' })).toBeVisible();

    // "Ajouter une question" ajoute un champ de saisie (sans rien enregistrer).
    const before = await dialog.locator('input[type="text"]').count();
    await dialog.getByRole('button', { name: 'Ajouter une question' }).click();
    await expect(dialog.locator('input[type="text"]')).toHaveCount(before + 1);

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
    await context.close();
  });

  test('CHK-03 - Chef de chantier : détail d\'une checklist (corps de métier, date, rempli par, statut, questions)', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'chef-chantier', '/checklists');
    await expect(page.getByRole('heading', { name: 'Checklists métier', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Gérer les modèles' })).toHaveCount(0);

    const detail = page.getByRole('button', { name: 'Détail' }).first();
    test.skip(!(await detail.isVisible({ timeout: 10_000 }).catch(() => false)), 'CHK-03 - aucune checklist remplie à consulter.');
    await detail.click();

    const dialog = page.getByRole('dialog').filter({ hasText: 'Questions' });
    await expect(dialog).toBeVisible();
    for (const label of ['Corps de métier', 'Date', 'Rempli par', 'Statut', 'Questions']) {
      await expect(dialog.getByText(label, { exact: true }).first(), `Libellé "${label}"`).toBeVisible();
    }
    await dialog.getByRole('button', { name: 'Fermer' }).click();
    await expect(dialog).toBeHidden();
    await context.close();
  });

  test('CHK-04 - Salarié ouvrier : "Remplir une checklist" propose les modèles du chantier ; annulation sans envoi', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'salarie', '/checklists');
    await expect(page.getByRole('heading', { name: 'Checklists métier', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Gérer les modèles' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Remplir une checklist' }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Remplir une checklist' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Modèle', { exact: true })).toBeVisible();
    const model = dialog.locator('select');
    await expect(model.locator('option', { hasText: 'Sélectionner un modèle' })).toHaveCount(1);
    expect(await model.locator('option').count(), 'Au moins un modèle doit être proposé').toBeGreaterThan(1);
    await expect(dialog.getByRole('button', { name: 'Enregistrer la checklist' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialog).toBeHidden();
    await context.close();
  });
});
