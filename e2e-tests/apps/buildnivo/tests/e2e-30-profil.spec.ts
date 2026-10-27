/**
 * e2e-30-profil.spec.ts
 * ---------------------
 * Module "Mon profil" (/mon-profil) : identité de l'utilisateur et de son entreprise (indépendamment
 * des chantiers), sécurité du mot de passe et liste de ses chantiers avec son rôle.
 *
 * Lecture seule : "Modifier" et "Changer le mot de passe" sont ouverts puis annulés - jamais
 * enregistrés (modifier le compte Direction partagé ou son mot de passe casserait tous les autres tests).
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { openModuleAs, revisit } from '../pages/RoleSession';
import { getRole } from '../roles';

test.describe('BuildNivo - 30. Mon profil', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    ({ context, page } = await openModuleAs(browser, 'direction', '/mon-profil'));
  });
  test.afterAll(async () => { await context?.close(); });

  test('PROF-01 - Identité : nom, email du compte connecté, entreprise, matricule, poste, statut', async () => {
    await revisit(page, '/mon-profil');
    await expect(page.getByRole('heading', { name: 'Mon profil', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/votre identité et votre entreprise, indépendamment des chantiers/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Identité' })).toBeVisible();

    for (const label of ['Nom complet', 'Email', "Nom d'utilisateur", 'Téléphone', 'Entreprise', 'Matricule', 'Poste', 'Discipline', 'Statut du compte']) {
      await expect(page.getByText(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')).first(), `Libellé "${label}"`).toBeVisible();
    }
    // L'email affiché est bien celui du compte connecté.
    await expect(page.getByText(getRole('direction').login, { exact: true })).toBeVisible();
  });

  test('PROF-02 - "Modifier" : prénom, nom, nom d\'utilisateur, téléphone ; annulation sans enregistrement', async () => {
    await revisit(page, '/mon-profil');
    await page.getByRole('button', { name: 'Modifier', exact: true }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: 'Modifier mes informations' });
    await expect(dialog).toBeVisible();
    for (const label of ['Prénom', 'Nom', "Nom d'utilisateur", 'Téléphone']) {
      await expect(dialog.getByText(label, { exact: true }).first(), `Champ "${label}"`).toBeVisible();
    }
    await expect(dialog.locator('input[type="tel"]')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Enregistrer' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialog).toBeHidden();
  });

  test('PROF-03 - "Changer le mot de passe" : ancien, nouveau et confirmation, règles de complexité ; annulation sans changement', async () => {
    await revisit(page, '/mon-profil');
    await expect(page.getByRole('heading', { name: 'Sécurité & Mot de passe' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: 'Modifier votre mot de passe' });
    await expect(dialog).toBeVisible();
    for (const label of ['Mot de passe actuel', 'Nouveau mot de passe', 'Confirmer le nouveau mot de passe']) {
      await expect(dialog.getByText(label, { exact: true }), `Champ "${label}"`).toBeVisible();
    }
    await expect(dialog.getByText(/au moins 8 caractères, avec majuscule, minuscule, chiffre et caractère spécial/i)).toBeVisible();
    await expect(dialog.locator('input[type="password"]')).toHaveCount(3);

    // "Afficher" révèle la saisie du premier champ.
    const current = dialog.locator('input').first();
    await current.fill('Test-E2E-visible');
    await dialog.getByRole('button', { name: 'Afficher' }).first().click();
    await expect(dialog.locator('input[type="text"]').first()).toHaveValue('Test-E2E-visible');

    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialog).toBeHidden();
  });

  test('PROF-04 - Mes chantiers : chantier, rôle et statut de chaque rattachement', async () => {
    await revisit(page, '/mon-profil');
    await expect(page.getByRole('heading', { name: 'Mes chantiers' })).toBeVisible({ timeout: 20_000 });
    for (const col of ['Chantier', 'Rôle', 'Statut']) {
      await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();
    }
    // Le chantier de démo y figure, avec le rôle Direction.
    const demo = page.getByRole('row').filter({ hasText: 'Résidence Itaosy' }).first();
    await expect(demo).toBeVisible();
    await expect(demo).toContainText('Direction');
  });
});
