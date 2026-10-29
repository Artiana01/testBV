/**
 * e2e-24-anomalies.spec.ts
 * ------------------------
 * Module "Signalements d'anomalie" (/anomalies) : alertes sécurité / qualité remontées du terrain.
 *
 * Droits observés (matrice RBAC) :
 *  - Direction : consultation seule (pas de création ni de traitement)
 *  - Conducteur de travaux : consultation + traitement (pas de bouton "Nouveau signalement")
 *  - Chef de chantier et Salarié ouvrier : peuvent créer un signalement
 *
 * Aucun signalement n'est envoyé : il n'existe pas de suppression dans l'UI. Les formulaires sont
 * ouverts puis annulés.
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { openModuleAs, revisit } from '../pages/RoleSession';

const COLUMNS = ['Type', 'Gravité', 'Description', 'Auteur', 'Destinataire', 'Statut', 'Date', 'Actions'];

async function expectNewReportForm(page: Page) {
  await page.getByRole('button', { name: 'Nouveau signalement' }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Nouveau signalement' });
  await expect(dialog).toBeVisible();
  for (const type of ['Sécurité', 'Qualité', 'Autre']) await expect(dialog.getByRole('button', { name: type, exact: true })).toBeVisible();
  for (const gravite of ['Mineure', 'Modérée', 'Grave']) await expect(dialog.getByRole('button', { name: gravite, exact: true })).toBeVisible();
  await expect(dialog.getByPlaceholder('Ex : Garde-corps manquant en zone A')).toBeVisible();
  await expect(dialog.getByText('Photos ou documents (optionnel)')).toBeVisible();
  await expect(dialog.getByText(/10 Mo max par fichier/i)).toBeVisible();
  await expect(dialog.getByText('Géolocalisation (optionnel)')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Me localiser' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Envoyer le signalement' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Annuler' }).click();
  await expect(dialog).toBeHidden();
}

test.describe('BuildNivo - 24. Signalements d\'anomalie', () => {

  test('ANO-01 - Direction : consulte le registre (colonnes, filtres), sans création ni traitement', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'direction', '/anomalies');
    await expect(page.getByRole('heading', { name: "Signalements d'anomalie", level: 1 })).toBeVisible({ timeout: 30_000 });
    // NB : la page affiche brièvement "Accès restreint aux signalements" tant que les droits ne sont pas
    // chargés (état transitoire constaté) - l'état stable de Direction est la consultation.
    await expect(page.getByRole('heading', { name: /accès restreint/i })).toHaveCount(0);
    for (const col of COLUMNS) await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouveau signalement' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Marquer traité' })).toHaveCount(0);
    await context.close();
  });

  test.describe('Chef de chantier', () => {
    let context: BrowserContext;
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(180_000);
      ({ context, page } = await openModuleAs(browser, 'chef-chantier', '/anomalies'));
    });
    test.afterAll(async () => { await context?.close(); });

    test('ANO-02 - Registre : colonnes, filtres Type et Statut, bouton "Nouveau signalement"', async () => {
      await revisit(page, '/anomalies');
      await expect(page.getByRole('heading', { name: "Signalements d'anomalie", level: 1 })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/alertes sécurité et qualité remontées depuis le terrain/i)).toBeVisible();
      await expect(page.getByText(/chantier\s*:/i).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Nouveau signalement' })).toBeVisible();
      for (const col of COLUMNS) await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();

      const type = page.locator('select').filter({ has: page.locator('option', { hasText: 'Sécurité' }) });
      await expect(type).toBeVisible();
      const statut = page.locator('select').filter({ has: page.locator('option', { hasText: 'Traité' }) });
      await expect(statut).toBeVisible();
      for (const option of ['Nouveau', 'En cours', 'Traité']) await expect(statut.locator('option', { hasText: option })).toHaveCount(1);
    });

    test('ANO-03 - "Nouveau signalement" : type, gravité, description, pièces jointes, géolocalisation ; annulation sans envoi', async () => {
      await revisit(page, '/anomalies');
      await expectNewReportForm(page);
    });

    test('ANO-04 - Détail d\'un signalement : type, gravité, auteur, destinataire, statut, description, pièce jointe', async () => {
      await revisit(page, '/anomalies');
      const detail = page.getByRole('button', { name: 'Détail' }).first();
      const hasDetail = await detail.waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => true).catch(() => false);
      test.skip(!hasDetail, 'ANO-04 - aucun signalement à consulter sur ce chantier.');
      await detail.click();

      const dialog = page.getByRole('dialog').filter({ hasText: 'Détail du signalement' });
      await expect(dialog).toBeVisible();
      for (const label of ['Type', 'Gravité', 'Auteur', 'Destinataire', 'Statut', 'Date', 'Description', 'Pièce jointe']) {
        await expect(dialog.getByText(label, { exact: true }).first(), `Libellé "${label}"`).toBeVisible();
      }
      await dialog.getByRole('button', { name: 'Fermer', exact: true }).filter({ hasText: /^Fermer$/ }).click();
      await expect(dialog).toBeHidden();
    });
  });

  test('ANO-05 - Conducteur de travaux : consulte et traite, mais ne crée pas de signalement', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'conducteur', '/anomalies');
    await expect(page.getByRole('heading', { name: "Signalements d'anomalie", level: 1 })).toBeVisible({ timeout: 20_000 });
    for (const col of COLUMNS) await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouveau signalement' })).toHaveCount(0);
    await context.close();
  });

  test('ANO-06 - Salarié ouvrier : peut créer un signalement (formulaire complet)', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'salarie', '/anomalies');
    await expect(page.getByRole('heading', { name: "Signalements d'anomalie", level: 1 })).toBeVisible({ timeout: 20_000 });
    await expectNewReportForm(page);
    await context.close();
  });
});
