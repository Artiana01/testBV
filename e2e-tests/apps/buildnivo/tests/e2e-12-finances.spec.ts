/**
 * e2e-12-finances.spec.ts
 * ---------------------------
 * Section 13 du cahier de recette — Finances & lots financiers.
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

import { test, expect, Page, Locator } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';
import { AppShellPage } from '../pages/AppShellPage';

async function firstTestChantierName(page: Page): Promise<string> {
  const heading = page.getByRole('heading', { level: 3, name: /^E2E Chantier \d/ }).first();
  await expect(heading).toBeVisible({ timeout: 15_000 });
  return (await heading.textContent())!.trim();
}

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

test.describe('BuildNivo — 13. Finances & lots financiers', () => {

  test('Page Finances accessible', async ({ page }) => {
    const mod = new ModulePage(page, '/finances');
    await mod.goto();
    await expect(page).not.toHaveURL(/\/connexion/);
    await mod.verifyEmptyStateOrData();
  });

  test('FIN-01 — Budget alloué au chantier : saisi dans la fiche chantier, reflété dans Finances', async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.gotoModule('/chantiers');
    const chantier = await firstTestChantierName(page);

    let { modal, budget } = await openEditForm(page, chantier);
    const target = Number(await budget.inputValue()) === 2_000_000 ? 3_000_000 : 2_000_000;
    await budget.fill(String(target));
    // Après le PUT, l'app recharge la liste (GET /api/projects) de façon asynchrone : rouvrir
    // le formulaire avant la fin de ce rechargement affiche encore l'ancienne valeur.
    const saved = page.waitForResponse(r => r.request().method() === 'PUT' && /\/api\/projects\/[^/?]+$/.test(r.url()));
    const refetched = page.waitForResponse(r => r.request().method() === 'GET' && /\/api\/projects(\?.*)?$/.test(r.url()));
    await modal.getByRole('button', { name: 'Enregistrer' }).click();
    const response = await saved;
    expect(response.ok()).toBeTruthy();
    expect(JSON.parse(response.request().postData() ?? '{}').budget_total).toBe(target);
    await refetched;
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

  test('FIN-03 — Saisie d\'un budget négatif → validation refusée', async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.gotoModule('/chantiers');
    const chantier = await firstTestChantierName(page);

    let { modal, budget } = await openEditForm(page, chantier);
    const original = await budget.inputValue();
    await budget.fill('-5000');
    await modal.getByRole('button', { name: 'Enregistrer' }).click();

    try {
      const fieldInvalid = await budget.evaluate((el: HTMLInputElement) => !el.checkValidity()).catch(() => false);
      const errorHint = await modal.getByText(/doit être positif|invalide|négatif|supérieur ou égal/i).first()
        .isVisible({ timeout: 3_000 }).catch(() => false);
      expect(fieldInvalid || errorHint).toBeTruthy();
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
