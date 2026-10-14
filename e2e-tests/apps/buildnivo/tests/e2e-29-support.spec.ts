/**
 * e2e-29-support.spec.ts
 * ----------------------
 * Module "Support & aide" (/support) : suivi des demandes (tickets SAV) et centre d'aide (FAQ).
 *
 * Aucune demande n'est envoyée : le formulaire "Nouvelle demande" est ouvert puis annulé (pas de
 * suppression de ticket dans l'UI, et chaque envoi notifie l'équipe support réelle).
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { openModuleAs, revisit } from '../pages/RoleSession';

test.describe('BuildNivo — 29. Support & aide', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    ({ context, page } = await openModuleAs(browser, 'direction', '/support'));
  });
  test.afterAll(async () => { await context?.close(); });

  test('SUP-01 — Page Support : disponibilité du service, onglets "Mes demandes" / "Centre d\'aide", filtres de statut', async () => {
    await revisit(page, '/support');
    await expect(page.getByRole('heading', { name: 'Support & aide', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/disponibilité sur 90 jours/i)).toBeVisible();

    const mine = page.getByRole('tab', { name: /^Mes demandes/ });
    const help = page.getByRole('tab', { name: /centre d'aide/i });
    await expect(mine).toBeVisible();
    await expect(help).toBeVisible();
    await expect(mine).toHaveAttribute('aria-selected', 'true');

    for (const filter of [/^Tous/, /^Ouvert/, /^En cours/, /^Résolu/]) {
      await expect(page.getByRole('button', { name: filter }).first()).toBeVisible();
    }
    await expect(page.getByPlaceholder('Rechercher un ticket...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouvelle demande' })).toBeVisible();
  });

  test('SUP-02 — Recherche d\'un ticket sans résultat', async () => {
    await revisit(page, '/support');
    const search = page.getByPlaceholder('Rechercher un ticket...');
    await expect(search).toBeVisible({ timeout: 20_000 });
    await search.fill(`zz-introuvable-${Date.now()}`);
    // Aucun ticket ne correspond : la liste ne propose plus aucune entrée SAV-… (le panneau de détail
    // du ticket sélectionné peut, lui, rester affiché).
    await expect(page.getByRole('button', { name: /SAV-\d{4}-\d+/ })).toHaveCount(0, { timeout: 10_000 });
  });

  test('SUP-03 — "Nouvelle demande" : sujet, catégories, description, délai de réponse ; annulation sans envoi', async () => {
    await revisit(page, '/support');
    await page.getByRole('button', { name: 'Nouvelle demande' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: 'Réponse sous 4 h ouvrées' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Sujet (Titre du ticket) *')).toBeVisible();
    await expect(dialog.getByText('Catégorie *')).toBeVisible();
    await expect(dialog.getByText('Description (Message initial) *')).toBeVisible();
    await expect(dialog.getByPlaceholder("Ex. : Le badge NFC n'est plus reconnu")).toBeVisible();

    const category = dialog.locator('select');
    for (const option of ['Pointage & badges', 'Comptes & accès', 'Facturation & exports', 'IA & rapports', 'Application mobile', 'Autre demande']) {
      await expect(category.locator('option', { hasText: option }), `Catégorie "${option}"`).toHaveCount(1);
    }
    await expect(dialog.getByRole('button', { name: 'Envoyer la demande' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialog).toBeHidden();
  });

  test('SUP-04 — Centre d\'aide : questions fréquentes par catégorie, recherche, contact de l\'équipe', async () => {
    await revisit(page, '/support');
    await page.getByRole('tab', { name: /centre d'aide/i }).click();

    await expect(page.getByRole('heading', { name: 'Questions fréquentes' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: "Contacter l'équipe" })).toBeVisible();
    await expect(page.getByRole('button', { name: /consulter mes tickets/i })).toBeVisible();

    const faqPointage = page.getByRole('button', { name: /oublie de pointer son départ/i });
    await expect(faqPointage).toBeVisible();
    await expect(page.getByRole('button', { name: /D'où viennent les réponses du Copilote/i })).toBeVisible();

    // La recherche filtre la FAQ.
    await page.getByPlaceholder(/rechercher dans l'aide/i).fill('pointage');
    await expect(faqPointage).toBeVisible();
    await expect(page.getByRole('button', { name: /D'où viennent les réponses du Copilote/i })).toBeHidden({ timeout: 10_000 });

    // Une question se déplie / se replie au clic (aria-expanded bascule).
    const before = await faqPointage.getAttribute('aria-expanded');
    await faqPointage.click();
    await expect(faqPointage).not.toHaveAttribute('aria-expanded', before ?? 'false');
  });
});
