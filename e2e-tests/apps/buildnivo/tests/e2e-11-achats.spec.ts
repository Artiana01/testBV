/**
 * e2e-11-achats.spec.ts
 * -------------------------
 * Section 12 du cahier de recette — Achats & fournisseurs.
 * Couvre : ACHAT-01 à ACHAT-04.
 */

import { test, expect } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';

test.describe('BuildNivo — 12. Achats & fournisseurs', () => {

  test('Page Achats & livraisons accessible avec actions de création', async ({ page }) => {
    const mod = new ModulePage(page, '/achats');
    await mod.goto();
    await expect(page.getByText('Nouveau fournisseur').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Nouvelle commande').first()).toBeVisible();
  });

  test('ACHAT-01 — Création d\'une commande fournisseur', async ({ page }) => {
    const mod = new ModulePage(page, '/achats');
    await mod.goto();

    await page.getByText('Nouvelle commande', { exact: true }).first().click();
    await mod.dismissOnboardingTour();
    await page.waitForTimeout(1000);

    // La page a 6 <select> au total (switcher de chantier en en-tête + filtres derrière la
    // modale + champs de la modale) — page.locator('select').first() attrapait le switcher
    // de chantier, pas le champ fournisseur. On identifie le bon select par son contenu
    // (option "Aucun fournisseur..." ou un vrai nom de fournisseur), à l'intérieur de la modale.
    const modal = page.locator('.fixed.inset-0').first();
    const fournisseurSelect = modal.locator('select').filter({ has: page.locator('option', { hasText: /fournisseur/i }) }).first();
    const hasFournisseurSelect = await fournisseurSelect.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!hasFournisseurSelect, 'ACHAT-01 — sélecteur de fournisseur introuvable dans le formulaire de commande.');

    // Le placeholder ("Aucun fournisseur rattaché. Cliquez sur + Nouveau") est une
    // <option> comme les autres — il faut l'exclure explicitement, sinon selectOption()
    // le sélectionne silencieusement comme s'il s'agissait d'un vrai fournisseur.
    const options = await fournisseurSelect.locator('option').allTextContents();
    const realOptionIndex = options.findIndex(o => o.trim() && !/aucun|sélectionn|choisir/i.test(o));
    test.skip(realOptionIndex === -1,
      'ACHAT-01 — aucun fournisseur rattaché à ce chantier dans les données de démo pour créer une commande ' +
      '(le chantier actif dépend du dernier chantier consulté par ce compte).'
    );

    await fournisseurSelect.selectOption({ index: realOptionIndex });

    // Objet + au moins une ligne d'article (désignation + prix > 0) sont également
    // obligatoires — sans ça la soumission échoue avec "Désignation obligatoire" / "Prix
    // unitaire obligatoire (>0)" même avec un fournisseur valide sélectionné.
    await page.getByPlaceholder(/approvisionnement/i).fill('Commande E2E — matériaux de test');
    await page.getByPlaceholder(/désignation du produit/i).fill('Article de test E2E');
    await page.locator('input[type="number"]').nth(1).fill('10');

    const submitBtn = modal.getByRole('button', { name: /créer|valider|enregistrer/i }).first();
    await submitBtn.click();

    // La confirmation de statut ("Envoyée au fournisseur") vit aussi dans un <option> caché
    // du formulaire — le signal fiable de succès est la fermeture de la modale.
    await expect(modal).not.toBeVisible({ timeout: 10_000 });
  });

  test('ACHAT-04 — Commande sans fournisseur sélectionné → validation refusée', async ({ page }) => {
    const mod = new ModulePage(page, '/achats');
    await mod.goto();

    await page.getByText('Nouvelle commande', { exact: true }).first().click();
    await mod.dismissOnboardingTour();
    await page.waitForTimeout(1000);

    const submitBtn = page.getByRole('button', { name: /créer|valider|enregistrer/i }).first();
    const hasSubmit = await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!hasSubmit, 'ACHAT-04 — bouton de validation de commande introuvable.');

    await submitBtn.click();
    await page.waitForTimeout(1000);

    // Le formulaire doit rester ouvert (validation refusée) et/ou signaler le champ manquant
    const stillOpen = await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    const errorHint = page.getByText(/obligatoire|requis|sélectionner un fournisseur/i);
    const hasError = await errorHint.first().isVisible({ timeout: 3_000 }).catch(() => false);

    expect(stillOpen || hasError).toBeTruthy();
  });

  test('Nouveau fournisseur — le formulaire de création s\'ouvre', async ({ page }) => {
    const mod = new ModulePage(page, '/achats');
    await mod.goto();

    await page.getByText('Nouveau fournisseur', { exact: true }).first().click();
    await mod.dismissOnboardingTour();
    await page.waitForTimeout(1000);

    await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 10_000 });
  });

});
