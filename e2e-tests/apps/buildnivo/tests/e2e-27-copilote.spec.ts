/**
 * e2e-27-copilote.spec.ts
 * -----------------------
 * Module "Copilote IA" (/copilote) : assistant documentaire (répond en citant les documents du chantier,
 * dans le périmètre du rôle) + "Dictée terrain" (observations dictées → anomalies / tâches / entrées de
 * journal proposées, jamais créées sans validation).
 *
 * NE POSE AUCUNE QUESTION et ne clique ni sur une suggestion, ni sur "Proposer des actions", ni sur
 * "Dicter" : ce sont de vrais appels à une IA distante (et au micro). Le test vérifie la structure de la
 * page, le panneau d'historique et les entrées de saisie.
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { openModuleAs, revisit } from '../pages/RoleSession';

test.describe('BuildNivo - 27. Copilote IA', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    ({ context, page } = await openModuleAs(browser, 'direction', '/copilote'));
  });
  test.afterAll(async () => { await context?.close(); });

  test('COP-01 - Page Copilote : promesse (jamais sans validation), périmètre du rôle, questions suggérées', async () => {
    await revisit(page, '/copilote');
    await expect(page.getByRole('heading', { name: 'Copilote IA', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/relisez les anomalies, tâches et entrées de journal proposées avant de les créer/i))
      .toBeVisible();
    await expect(page.getByText(/ne répond qu'à partir des données auxquelles votre rôle donne accès/i).first()).toBeVisible();
    await expect(page.getByText(/répond en citant les documents du chantier/i)).toBeVisible();

    for (const question of [
      'Quel est le délai contractuel du plombier ?',
      'Quel plan est actuellement applicable pour le R+2 ?',
      "Quels plans d'exécution sont en attente de visa ?",
    ]) {
      await expect(page.getByRole('button', { name: question })).toBeVisible();
    }
    await expect(page.getByPlaceholder(/posez une question sur le chantier, un document, un délai/i)).toBeVisible();
  });

  test('COP-02 - Historique des conversations : onglets Actives / Archivées, nouvelle conversation, confidentialité', async () => {
    await revisit(page, '/copilote');
    await expect(page.getByRole('button', { name: 'Historique' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Nouvelle conversation' })).toBeVisible();

    const actives = page.getByRole('tab', { name: 'Actives' });
    const archivees = page.getByRole('tab', { name: /archivées/i });
    await expect(actives).toBeVisible();
    await expect(actives).toHaveAttribute('aria-selected', 'true');
    await archivees.click();
    await expect(archivees).toHaveAttribute('aria-selected', 'true');
    await actives.click();
    await expect(actives).toHaveAttribute('aria-selected', 'true');

    await expect(page.getByText(/visible de vous seul/i)).toBeVisible();
    await expect(page.getByText(/conservées 6 mois après le dernier message/i)).toBeVisible();
  });

  test('COP-03 - Dictée terrain : zone de texte, boutons "Dicter" et "Proposer des actions"', async () => {
    await revisit(page, '/copilote');
    await expect(page.getByText('Dictée terrain', { exact: true }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/dictez ou saisissez vos observations/i)).toBeVisible();

    const dictation = page.getByPlaceholder(/dictez ou écrivez ici les informations du chantier/i);
    await expect(dictation).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dicter' })).toBeVisible();
    const propose = page.getByRole('button', { name: 'Proposer des actions' });
    await expect(propose).toBeVisible();
    await expect(propose).toBeDisabled();

    // La zone accepte du texte (sans rien envoyer à l'IA).
    await dictation.fill('Observation E2E - ne pas envoyer');
    await expect(dictation).toHaveValue('Observation E2E - ne pas envoyer');
    await expect(propose).toBeEnabled();
    await dictation.fill('');
    await expect(propose).toBeDisabled();
  });
});
