/**
 * e2e-23-projets.spec.ts
 * ----------------------
 * Module "Projets" (/projets) : registre des projets de la société (promotion / maîtrise d'ouvrage),
 * distinct de la liste des chantiers. Page de recherche + filtres + pagination, et formulaire
 * "Nouveau projet".
 *
 * Lecture seule : le formulaire "Nouveau projet" (pleine page) est ouvert puis annulé — aucun projet n'est créé
 * (il n'existe pas de suppression de projet dans l'UI, ce serait de la donnée jetable permanente).
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { openModuleAs, revisit } from '../pages/RoleSession';

test.describe('BuildNivo — 23. Projets', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    ({ context, page } = await openModuleAs(browser, 'direction', '/projets'));
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('PRJ-01 — Page Projets : titre, recherche, filtres Phase / Statut / Responsable / Société / dates, pagination', async () => {
    await revisit(page, '/projets');

    await expect(page.getByRole('heading', { name: 'Projets', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Nouveau projet' })).toBeVisible();
    await expect(page.getByPlaceholder(/rechercher par nom, référence, client ou lieu/i)).toBeVisible();

    // Filtres = <select> natifs : on vérifie le <select> lui-même et ses options (jamais "visibles").
    const phase = page.locator('select').filter({ has: page.locator('option', { hasText: 'Faisabilité' }) });
    await expect(phase).toBeVisible();
    for (const option of ['Avant-projet', 'Permis et études', 'Consultation', 'Attribution', 'Préparation du chantier', 'Travaux']) {
      await expect(phase.locator('option', { hasText: option })).toHaveCount(1);
    }
    const statut = page.locator('select').filter({ has: page.locator('option', { hasText: 'Suspendu' }) });
    await expect(statut).toBeVisible();
    for (const option of ['Actif', 'Suspendu', 'Abandonné', 'Archivé']) {
      await expect(statut.locator('option', { hasText: option })).toHaveCount(1);
    }
    await expect(page.locator('select[aria-label="Responsable"]')).toBeVisible();
    await expect(page.locator('select[aria-label="Société"]')).toBeVisible();
    await expect(page.locator('input[type="date"]')).toHaveCount(2);

    // Liste vide ("Aucun projet pour ces critères.") ou remplie : dans les deux cas, la pagination est affichée.
    await expect(page.getByText(/\d+\s*[–-]\s*\d+\s+sur\s+\d+/)).toBeVisible();
    await expect(page.getByText('Par page')).toBeVisible();
  });

  test('PRJ-02 — Recherche sans résultat : message "Aucun projet pour ces critères."', async () => {
    await revisit(page, '/projets');
    await page.getByPlaceholder(/rechercher par nom, référence, client ou lieu/i).fill(`zz-introuvable-${Date.now()}`);
    await expect(page.getByText('Aucun projet pour ces critères.')).toBeVisible({ timeout: 15_000 });
  });

  test('PRJ-03 — "Nouveau projet" : formulaire par sections (identification, société, localisation, opération, unités), annulation sans création', async () => {
    await revisit(page, '/projets');
    await page.getByRole('button', { name: 'Nouveau projet' }).click();

    // "Nouveau projet" s'ouvre en pleine page (titre de niveau 1), pas en modale.
    await expect(page.getByRole('heading', { name: 'Nouveau projet', level: 1 })).toBeVisible({ timeout: 20_000 });
    const form = page.getByRole('main');
    for (const section of ['Identification', 'Société', 'Localisation et devise', 'Opération', 'Unités et taxes']) {
      await expect(form.getByRole('heading', { name: section, exact: true }), `Section "${section}"`).toBeVisible();
    }
    for (const label of [
      'Nom du projet *', 'Référence unique *', 'Rôle de la société sur ce projet *', 'Client (maître d\'ouvrage)',
      'Société porteuse', 'Adresse', 'Pays *', 'Devise *', 'Type d\'opération', 'Date cible', 'Budget cible',
      'Description', 'Unité de surface', 'Décimales de calcul', 'Taxe applicable',
    ]) {
      await expect(form.getByText(label, { exact: true }).first(), `Champ "${label}"`).toBeVisible();
    }
    // La référence est proposée automatiquement (modifiable avant création).
    await expect(form.getByLabel('Référence unique *')).toHaveValue(/^[A-Z]{2,}-\d{4}-\d+/);
    await expect(form.getByText('Proposée, modifiable avant création')).toBeVisible();

    // Le rôle de la société sur le projet adapte le formulaire et les écrans.
    const role = form.locator('#np-business_role');
    for (const option of ['Promoteur', 'Maître d\'ouvrage', 'Maître d\'œuvre', 'Entreprise de travaux']) {
      await expect(role.locator('option', { hasText: option })).toHaveCount(1);
    }
    await expect(form.getByRole('button', { name: '+ Ajouter une société' })).toBeVisible();
    await expect(form.getByRole('button', { name: 'Créer le projet' })).toBeVisible();

    // Annuler ramène au registre sans rien créer.
    await form.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByRole('heading', { name: 'Projets', level: 1 })).toBeVisible({ timeout: 20_000 });
  });
});
