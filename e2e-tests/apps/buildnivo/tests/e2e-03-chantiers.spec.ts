/**
 * e2e-03-chantiers.spec.ts
 * ---------------------------
 * Section 03 du cahier de recette — Chantiers, zones & lots.
 * Couvre : PROJ-01, PROJ-04. (PROJ-02/03/05 nécessitent un chantier existant
 * avec des tâches actives — non couverts ici pour rester indépendants des
 * données de démo, qui peuvent varier entre exécutions.)
 *
 * Exécuté avec la session Direction (accès complet à la création de chantier).
 */

import { test, expect } from '@playwright/test';
import { ChantiersPage } from '../pages/ChantiersPage';

test.describe('BuildNivo — 03. Chantiers, zones & lots', () => {

  test('PROJ-01 — Création d\'un chantier avec nom, ville et dates valides', async ({ page }) => {
    const chantiers = new ChantiersPage(page);
    await chantiers.goto();

    const nomChantier = `E2E Chantier ${Date.now()}`;
    await chantiers.openCreateModal();
    await chantiers.fillNom(nomChantier);
    await chantiers.fillVille('Antananarivo');

    // ANOMALIE CONFIRMÉE (2026-09-10) : POST /api/projects renvoie 403 Forbidden pour le
    // compte Direction, alors que l'UI affiche "Nouveau chantier" et un formulaire
    // pleinement fonctionnel (aucun champ désactivé, aucun message de droits insuffisants
    // avant soumission). Le formulaire reste indéfiniment ouvert sans message d'erreur
    // visible pour l'utilisateur — juste une 403 silencieuse en console réseau.
    // On capture la réponse ici pour transformer un "élément introuvable" opaque en un
    // diagnostic clair si la régression se reproduit.
    const projectResponse = page.waitForResponse(
      r => r.url().includes('/api/projects') && r.request().method() === 'POST',
      { timeout: 15_000 }
    ).catch(() => null);
    await chantiers.submitCreate();
    const response = await projectResponse;

    if (response && !response.ok()) {
      throw new Error(
        `PROJ-01 — POST /api/projects a répondu ${response.status()} pour le compte Direction ` +
        `(chantier "${nomChantier}"). Le formulaire de création de chantier est accessible dans ` +
        `l'UI mais rejeté côté API — droit manquant ou RBAC mal configuré pour ce rôle. ` +
        `Corps de réponse : ${(await response.text().catch(() => '')).slice(0, 300)}`
      );
    }

    await chantiers.verifyChantierVisible(nomChantier);
  });

  test('PROJ-04 — Création d\'un chantier sans nom → validation refusée', async ({ page }) => {
    const chantiers = new ChantiersPage(page);
    await chantiers.goto();
    await chantiers.openCreateModal();

    // Nom laissé vide volontairement — on renseigne uniquement la ville
    await chantiers.fillVille('Antananarivo');
    await chantiers.submitCreate();

    // Le formulaire doit rester ouvert (validation refusée) et/ou signaler le champ en erreur
    await page.waitForTimeout(1000);
    const stillOnModal = await chantiers.getCreateSubmitButton().isVisible({ timeout: 3_000 }).catch(() => false);
    const errorHint = page.getByText(/obligatoire|requis|ce champ est/i);
    const hasError = await errorHint.first().isVisible({ timeout: 3_000 }).catch(() => false);

    expect(stillOnModal || hasError).toBeTruthy();
  });

  test('Vue d\'ensemble des chantiers accessible depuis la sidebar', async ({ page }) => {
    const chantiers = new ChantiersPage(page);
    await chantiers.goto();
    await expect(page.getByText('Chantiers').first()).toBeVisible();
    await chantiers.clickSidebarLink("Vue d'ensemble");
    await expect(page).not.toHaveURL(/\/connexion/);
  });

});
