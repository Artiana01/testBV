/**
 * e2e-12-finances.spec.ts
 * ---------------------------
 * Section 13 du cahier de recette - Finances & lots financiers.
 * Couvre : FIN-01 à FIN-03 (best-effort).
 *
 * L'app n'expose aucune interface de création de "lot financier" (seul un
 * GET /api/projects/:id/lots existe, consommé en lecture par le formulaire de
 * tâche) : /finances est un tableau de bord, et le budget alloué se saisit dans
 * la fiche chantier ("Modifier le chantier" → "Budget total (€)"). FIN-01/FIN-03
 * sont donc testés sur ce flux réel, sur un chantier de test "E2E Chantier …"
 * (jamais sur le chantier de démo Résidence Itaosy, dont le budget sert aux
 * autres scénarios).
 */

import { Page, Locator } from '@playwright/test';
import { test, expect } from '../test';
import { ModulePage } from '../pages/ModulePage';
import { AppShellPage } from '../pages/AppShellPage';

async function openEditForm(page: Page, chantier: string): Promise<{ modal: Locator; budget: Locator }> {
  const card = page.locator('div')
    .filter({ has: page.getByRole('heading', { level: 3, name: chantier, exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Modifier le chantier' }) })
    .last();
  await card.getByRole('button', { name: 'Modifier le chantier' }).click();
  const modal = page.locator('div')
    .filter({ has: page.getByRole('heading', { level: 2, name: 'Modifier le chantier' }) })
    .filter({ has: page.getByRole('button', { name: 'Enregistrer' }) })
    .last();
  await expect(modal).toBeVisible();
  const budget = modal.getByText('Budget total (€)').locator('xpath=following::input[1]');
  await expect(budget).toBeVisible();
  return { modal, budget };
}

test.describe('BuildNivo - 13. Finances & lots financiers', () => {

  test('Page Finances accessible', async ({ page }) => {
    const mod = new ModulePage(page, '/finances');
    await mod.goto();
    await expect(page).not.toHaveURL(/\/connexion/);
    await mod.verifyEmptyStateOrData();
  });

  test('FIN-01 - Budget alloué au chantier : saisi dans la fiche chantier, reflété dans Finances', async ({ page, testChantier }) => {
    test.setTimeout(180_000);
    const shell = new AppShellPage(page);
    await shell.gotoModule('/chantiers');
    const chantier = testChantier.name;

    let { modal, budget } = await openEditForm(page, chantier);
    const target = Number(await budget.inputValue()) === 2_000_000 ? 3_000_000 : 2_000_000;
    await budget.fill(String(target));
    // Après le PUT, deux listes se rechargent : la page courante et le contexte global.
    // Le formulaire lit ce dernier. Attendre seulement la réponse paginée permet de
    // rouvrir le formulaire avec l'ancien budget pendant que le contexte global charge.
    const [response, globalContext] = await Promise.all([
      page.waitForResponse(r => r.request().method() === 'PUT' && /\/api\/projects\/[^/?]+$/.test(r.url()), { timeout: 45_000 }),
      page.waitForResponse(r => {
        const url = new URL(r.url());
        return r.request().method() === 'GET' && url.pathname === '/api/projects' && !url.search;
      }, { timeout: 45_000 }),
      modal.getByRole('button', { name: 'Enregistrer' }).click(),
    ]);
    expect(response.ok()).toBeTruthy();
    expect(JSON.parse(response.request().postData() ?? '{}').budget_total).toBe(target);
    expect(globalContext.ok(), 'Rechargement du contexte global après sauvegarde du budget').toBeTruthy();
    await expect(modal).toBeHidden({ timeout: 15_000 });

    ({ modal, budget } = await openEditForm(page, chantier));
    await expect(budget).toHaveValue(String(target));
    await modal.getByRole('button', { name: 'Annuler' }).click();

    try {
      await shell.getChantierSwitcher().selectOption({ label: chantier });
      await shell.gotoModule('/finances');
      await expect(page.getByText(`Chantier : ${chantier}`)).toBeVisible();
      const budgetBlock = page.locator('div')
        .filter({ hasText: 'Budget total alloué' })
        .filter({ hasText: /M\s€/ })
        .last();
      await expect(budgetBlock).toContainText(`${target / 1_000_000} M €`);
    } finally {
      await shell.ensureDemoChantierSelected();
    }
  });

  test('FIN-03 - Saisie d\'un budget négatif → validation refusée', async ({ page, testChantier }) => {
    const shell = new AppShellPage(page);
    await shell.gotoModule('/chantiers');
    const chantier = testChantier.name;

    let { modal, budget } = await openEditForm(page, chantier);
    const original = await budget.inputValue();
    await budget.fill('-5000');
    await modal.getByRole('button', { name: 'Enregistrer' }).click();

    try {
      // La validation peut provenir de l'API : attendre son rendu au lieu de lire
      // l'état du formulaire immédiatement après le clic.
      await expect.poll(async () => {
        const fieldInvalid = await budget.evaluate((el: HTMLInputElement) => !el.checkValidity()).catch(() => false);
        const errorHint = await modal.getByText(/doit être positif|invalide|négatif|supérieur ou égal|au moins|at least|greater than/i)
          .first().isVisible().catch(() => false);
        return fieldInvalid || errorHint;
      }, { message: 'Le budget négatif doit être refusé', timeout: 15_000 }).toBe(true);
      // Le formulaire ne doit pas avoir été soumis.
      await expect(modal).toBeVisible();
      await modal.getByRole('button', { name: 'Annuler' }).click();

      ({ modal, budget } = await openEditForm(page, chantier));
      await expect(budget).toHaveValue(original);
      await modal.getByRole('button', { name: 'Annuler' }).click();
    } catch (err) {
      // Si l'app a accepté la valeur négative (anomalie réelle), on remet le budget d'origine
      // avant de laisser l'échec remonter.
      if (await modal.isVisible().catch(() => false)) {
        await modal.getByRole('button', { name: 'Annuler' }).click().catch(() => {});
      }
      const reopened = await openEditForm(page, chantier).catch(() => null);
      if (reopened && (await reopened.budget.inputValue()) !== original) {
        await reopened.budget.fill(original);
        await reopened.modal.getByRole('button', { name: 'Enregistrer' }).click();
      } else if (reopened) {
        await reopened.modal.getByRole('button', { name: 'Annuler' }).click().catch(() => {});
      }
      throw err;
    }
  });

});
