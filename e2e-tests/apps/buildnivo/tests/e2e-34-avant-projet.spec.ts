/** Avant-projet réel sur dev : consultation et navigation sans mutation du dossier. */
import { test, expect, BrowserContext, Page } from '@playwright/test';
import { openAvantProjet, openProjectTab, closeProjectDialog } from '../pages/AvantProjetPage';

test.describe('BuildNivo - 34. Avant-projet', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    ({ context, page } = await openAvantProjet(browser));
  });
  test.afterAll(async () => { await context?.close(); });
  test.afterEach(async () => { await closeProjectDialog(page); });

  test('AVP-01 - Dossier : onglets et synthèse des prérequis avant passage en chantier', async () => {
    await openProjectTab(page, 'Synthèse', 'synthese');
    for (const name of ['Synthèse', 'Faisabilité', 'Plans et 3D', 'Permis', 'Études', 'Chiffrage',
      'Consultation', 'Bilan et trésorerie', 'Planning et validations', 'Documents']) {
      await expect(page.getByRole('tab', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByText('Avant le passage en chantier', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Passer en chantier', exact: true })).toBeVisible();
    await expect(page.getByText('Alertes et points bloquants', { exact: true })).toBeVisible();
  });

  test('AVP-02 - Phase : critères et motif consultables sans transition', async () => {
    await page.getByRole('button', { name: 'Gérer la phase', exact: true }).click();
    await expect(page.getByText('Phase du projet', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Critères pour quitter la phase/ })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Phase du projet' }).locator('[aria-current="step"]')).toHaveCount(1);
    await expect(page.getByRole('dialog').getByLabel('Motif', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Passer à la phase suivante', exact: true })).toBeVisible();
  });

  test('AVP-03 - Faisabilité : ouverture du panneau', async () => {
    await openProjectTab(page, 'Faisabilité', 'faisabilite');
    await expect(page.locator('main')).toContainText(/terrain|programme/i);
  });

  test('AVP-04 - Chiffrage : lignes, calcul, variantes et versions', async () => {
    await openProjectTab(page, 'Chiffrage', 'chiffrage');
    await expect(page.getByRole('button', { name: 'Ajouter une ligne', exact: true })).toBeVisible();
    await expect(page.getByTestId('quote-extractions')).toBeVisible();
    await expect(page.getByText("Les calculs viennent du moteur, jamais de l'IA.", { exact: true })).toBeVisible();
    await expect(page.getByText('Versions', { exact: true })).toBeVisible();
    await expect(page.getByText('Variantes', { exact: true })).toBeVisible();
  });

  test('AVP-05 - Documents : navigation dans le dossier du projet', async () => {
    await openProjectTab(page, 'Documents', 'documents');
    await expect(page.getByRole('heading', { name: /documents/i }).first()).toBeVisible();
  });
});
