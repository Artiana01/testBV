/**
 * e2e-26-habilitations.spec.ts
 * ----------------------------
 * Module "Habilitations" (/habilitations) : certifications et qualifications des membres du chantier
 * (CACES, habilitation électrique...), avec dates d'obtention / d'expiration et justificatif.
 *
 * Droits observés (chantier de démo) : Direction gère le registre ("Nouvelle habilitation", modifier,
 * supprimer) ; Conducteur et Chef de chantier consultent ; Salarié ouvrier déclare ses habilitations.
 *
 * Aucune habilitation n'est enregistrée (pas de suppression dans l'UI) : le formulaire est annulé.
 */

import { test, expect } from '@playwright/test';
import { openModuleAs } from '../pages/RoleSession';

const COLUMNS = ['Membre', 'Entreprise', 'Type', 'Obtenue le', 'Expire le', 'Justificatif', 'Actions'];

test.describe('BuildNivo — 26. Habilitations', () => {

  test('HAB-01 — Direction : gère le registre des habilitations (création possible, aucun accès restreint)', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'direction', '/habilitations');
    await expect(page.getByRole('heading', { name: 'Habilitations', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /accès restreint/i })).toHaveCount(0);
    for (const col of COLUMNS) await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouvelle habilitation' })).toBeVisible();
    await context.close();
  });

  for (const [roleKey, label] of [['conducteur', 'Conducteur de travaux'], ['chef-chantier', 'Chef de chantier']] as const) {
    test(`HAB-02 — ${label} : registre des habilitations du chantier (colonnes) sans création`, async ({ browser }) => {
      const { context, page } = await openModuleAs(browser, roleKey, '/habilitations');
      await expect(page.getByRole('heading', { name: 'Habilitations', level: 1 })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/certifications et qualifications des membres du chantier/i)).toBeVisible();
      for (const col of COLUMNS) await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();
      await expect(page.getByRole('button', { name: 'Nouvelle habilitation' })).toHaveCount(0);
      await context.close();
    });
  }

  test('HAB-03 — Salarié ouvrier : "Nouvelle habilitation" (membre, type, dates, justificatif) ; annulation sans enregistrement', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'salarie', '/habilitations');
    await expect(page.getByRole('heading', { name: 'Habilitations', level: 1 })).toBeVisible({ timeout: 20_000 });
    for (const col of COLUMNS) await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();

    await page.getByRole('button', { name: 'Nouvelle habilitation' }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Nouvelle habilitation' });
    await expect(dialog).toBeVisible();
    for (const label of ['Membre', "Type d'habilitation", "Date d'obtention", "Date d'expiration", 'Justificatif (optionnel)']) {
      await expect(dialog.getByText(label, { exact: true }).first(), `Champ "${label}"`).toBeVisible();
    }
    await expect(dialog.getByPlaceholder(/CACES R489/i)).toBeVisible();
    await expect(dialog.getByText(/laissez vide si l'habilitation n'expire jamais/i)).toBeVisible();
    await expect(dialog.getByText(/PDF, PNG, JPG \(10 Mo max\)/i)).toBeVisible();
    await expect(dialog.locator('input[type="date"]')).toHaveCount(2);
    await expect(dialog.getByRole('button', { name: "Enregistrer l'habilitation" })).toBeVisible();

    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialog).toBeHidden();
    await context.close();
  });
});
