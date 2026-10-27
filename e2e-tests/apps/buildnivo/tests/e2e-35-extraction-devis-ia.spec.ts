/**
 * Formulaire réel de dev ; fichier sélectionné en mémoire, sans dépôt.
 * Les scénarios de revue simulent uniquement l'API quote-extractions : aucun appel LLM
 * et aucune confirmation ne modifient les devis du projet partagé.
 */
import { test, expect, BrowserContext, Page } from '@playwright/test';
import { openAvantProjet, openProjectTab, closeProjectDialog } from '../pages/AvantProjetPage';

test.describe('BuildNivo - 35. Extraction de devis par IA', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    ({ context, page } = await openAvantProjet(browser));
    await openProjectTab(page, 'Chiffrage', 'chiffrage');
  });
  test.afterAll(async () => { await context?.close(); });
  test.afterEach(async () => { await closeProjectDialog(page); });

  async function openProposal() {
    await page.getByTestId('quote-extractions').getByRole('button', { name: 'Ajouter un devis', exact: true }).click();
    return page.getByRole('dialog');
  }

  test('DEVIA-01 - Revue humaine annoncée et extraction bloquée sans fichier', async () => {
    await expect(page.getByTestId('quote-extractions')).toContainText("Un devis proposé n'est repris qu'après votre confirmation, valeur par valeur.");
    const dialog = await openProposal();
    await expect(dialog.getByRole('button', { name: 'Extraire le devis par IA', exact: true })).toBeDisabled();
    await expect(dialog).toContainText('Vous pourrez vérifier et corriger les valeurs et les lignes');
    for (const name of ['Fournisseur ou entreprise', 'Référence du devis', 'Date du devis', 'Devise', 'Total HT', 'Total TTC']) {
      await expect(dialog.getByLabel(name, { exact: true })).toBeVisible();
    }
  });

  test('DEVIA-02 - Sélection PDF puis retrait : activation et désactivation de l’extraction', async () => {
    const dialog = await openProposal();
    const extract = dialog.getByRole('button', { name: 'Extraire le devis par IA', exact: true });
    await dialog.getByTestId('quote-file-input').setInputFiles({
      name: 'devis-e2e-selection.pdf', mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n% sélection uniquement, aucun envoi\n%%EOF'),
    });
    await expect(dialog.getByText('devis-e2e-selection.pdf', { exact: true })).toBeVisible();
    await expect(extract).toBeEnabled();
    await dialog.getByRole('button', { name: 'Retirer le fichier', exact: true }).click();
    await expect(extract).toBeDisabled();
    await expect(dialog.getByText('devis-e2e-selection.pdf', { exact: true })).toHaveCount(0);
  });

  test('DEVIA-03 - Fichier exécutable refusé avant toute extraction', async () => {
    const dialog = await openProposal();
    await dialog.getByTestId('quote-file-input').setInputFiles({
      name: 'devis-interdit.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ'),
    });
    await expect(page.getByText(/format.*(accepté|autorisé|supporté)|type.*(accepté|autorisé|supporté)|extension/i).last()).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Extraire le devis par IA', exact: true })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Retirer le fichier', exact: true })).toHaveCount(0);
  });

  test('DEVIA-04 - Lignes modifiables puis fermeture sans enregistrer', async () => {
    const dialog = await openProposal();
    await dialog.getByLabel('Fournisseur ou entreprise', { exact: true }).fill('Entreprise E2E');
    await dialog.getByRole('button', { name: 'Ajouter une ligne', exact: true }).click();
    await expect(dialog.getByLabel('Désignation', { exact: true })).toHaveCount(2);
    await dialog.getByLabel('Désignation', { exact: true }).last().fill('Peinture murs');
    await closeProjectDialog(page);
    const reopened = await openProposal();
    await expect(reopened.getByLabel('Fournisseur ou entreprise', { exact: true })).toHaveValue('');
    await expect(reopened.getByLabel('Désignation', { exact: true })).toHaveCount(1);
  });

  test('DEVIA-05 - API simulée : progression, échec, sources et confirmation explicite du doublon corrigé', async () => {
    const proposal = {
      id: 'e2e-quote-review', status: 'proposed', subject_type: 'quote', document_id: null,
      supplier_name: 'Entreprise E2E', reference: 'DEV-E2E-IA', quote_date: '2026-10-27',
      currency: 'EUR', total_ht: '100.00', total_ttc: '120.00', confidence: { supplier_name: 0.95 },
      lines: [{ id: 'e2e-line', label: 'Peinture murs', unit: 'm2', quantity: '10.00', unit_price: '10.00', confidence: {} }],
      duplicate: { state: 'candidates_found', matches: [{ id: 'existing', supplier_name: 'Entreprise E2E', reference: 'DEV-E2E-IA', currency: 'EUR', total_ht: '100.00', total_ttc: '120.00' }] },
      source: { provider: 'agentic', result: { fields: {
        supplier_name: { raw_value: 'Entreprise E2E', evidence: [{ page: 1, quote: 'Entreprise E2E - devis peinture' }] },
      }, lines: [], checks: [{ code: 'TOTALS_COHERENCE', state: 'failed', delta: '1.00' }] } },
    };
    let confirmed = false;
    const payloads: Record<string, unknown>[] = [];
    const unexpectedMutations: string[] = [];
    // Ce périmètre intercepte également les mutations : aucune confirmation ne part sur dev.
    const endpoint = /\/api\/projects\/[^/]+\/quote-extractions(?:\/[^?]*)?(?:\?.*)?$/;
    await page.route(endpoint, async route => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({ json: { success: true, data: confirmed ? [] : [proposal,
          { ...proposal, id: 'e2e-processing', status: 'processing', source: null },
          { ...proposal, id: 'e2e-failed', status: 'failed', source: { error: 'Erreur IA simulée E2E' } },
        ] } });
      } else if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/e2e-quote-review/confirm')) {
        payloads.push(request.postDataJSON());
        confirmed = true;
        await route.fulfill({ json: { success: true, data: { ...proposal, status: 'confirmed' } } });
      } else {
        unexpectedMutations.push(`${request.method()} ${new URL(request.url()).pathname}`);
        await route.fulfill({ status: 400, json: { message: 'Mutation inattendue dans le scénario simulé' } });
      }
    });
    try {
      // Recharger vide aussi le cache React Query : une navigation cliente peut
      // conserver les devis réels et ne jamais appeler l'API interceptée.
      await page.reload({ waitUntil: 'domcontentloaded' });
      const panel = page.getByTestId('quote-extractions');
      await expect(panel.getByRole('status')).toHaveText('Extraction IA en cours…', { timeout: 90_000 });
      await expect(panel.getByRole('alert')).toHaveText('Erreur IA simulée E2E');
      await panel.getByRole('button', { name: 'Revoir', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByTestId('duplicate-panel')).toBeVisible();
      await expect(dialog.getByText(/cohérence des totaux HT, TVA et TTC reste à vérifier/i)).toBeVisible();
      await dialog.getByText('Voir où l’IA a trouvé chaque valeur', { exact: true }).click();
      await expect(dialog.getByRole('blockquote')).toContainText('Entreprise E2E - devis peinture');
      const confirm = dialog.getByRole('button', { name: 'Confirmer et reprendre', exact: true });
      await confirm.click();
      await expect(dialog.getByRole('alert').filter({ hasText: 'Confirmez explicitement la reprise du doublon.' })).toBeVisible();
      expect(payloads).toHaveLength(0);
      await dialog.getByLabel('Le reprendre quand même', { exact: true }).check();
      const include = dialog.getByRole('checkbox', { name: 'Reprendre Peinture murs', exact: true });
      await include.uncheck();
      await confirm.click();
      await expect(dialog.getByRole('alert').filter({ hasText: 'Cochez au moins une ligne à reprendre.' })).toBeVisible();
      expect(payloads).toHaveLength(0);
      await include.check();
      await dialog.getByLabel(/Fournisseur ou entreprise/).fill('Entreprise corrigée');
      await confirm.click();
      await expect(dialog).toBeHidden();
      expect(payloads).toHaveLength(1);
      expect(payloads[0]).toMatchObject({ supplier_name: 'Entreprise corrigée', confirm_duplicate: true,
        total_ht: '100', lines: [{ id: 'e2e-line', label: 'Peinture murs', quantity: '10', unit_price: '10' }] });
      expect(unexpectedMutations).toEqual([]);
      await expect(panel).toContainText('Aucun devis en attente de revue.');
    } finally {
      await closeProjectDialog(page);
      await page.unroute(endpoint);
    }
  });
});
