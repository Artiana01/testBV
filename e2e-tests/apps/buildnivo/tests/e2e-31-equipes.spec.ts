/**
 * e2e-31-equipes.spec.ts
 * ----------------------
 * Module "Équipes & sociétés" (/equipes) : intervenants et sociétés rattachés au chantier actif,
 * invitations (salarié / entreprise / intervenant), rôle & périmètre, horaires.
 *
 * Lecture seule : les formulaires d'invitation sont ouverts puis annulés (aucune invitation envoyée,
 * aucun intervenant retiré ni modifié). Les refus d'accès pour les rôles sans droit sont couverts
 * par e2e-16-rbac.
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { openModuleAs, revisit } from '../pages/RoleSession';

test.describe('BuildNivo - 31. Équipes & sociétés', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    ({ context, page } = await openModuleAs(browser, 'direction', '/equipes'));
  });
  test.afterAll(async () => { await context?.close(); });

  test('EQP-01 - Page Équipes : chantier actif, actions d\'invitation, onglets Intervenants & Invitations', async () => {
    await revisit(page, '/equipes');
    await expect(page.getByRole('heading', { name: 'Équipes & Sociétés', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/chantier actif\s*:\s*résidence itaosy/i)).toBeVisible();

    for (const action of ['Inviter un salarié', 'Inviter une entreprise', 'Inviter un intervenant']) {
      await expect(page.getByRole('button', { name: action }), `Action "${action}"`).toBeVisible();
    }
    const members = page.getByRole('tab', { name: /^Intervenants & Sociétés \(\d+\)/ });
    const invitations = page.getByRole('tab', { name: /^Invitations en cours \(\d+\)/ });
    await expect(members).toBeVisible();
    await expect(invitations).toBeVisible();
    await expect(members).toHaveAttribute('aria-selected', 'true');
  });

  test('EQP-02 - Liste des intervenants : rôle, statut, lots, zones, société ; filtre par nom, email ou rôle', async () => {
    await revisit(page, '/equipes');
    await expect(page.getByRole('heading', { name: 'Équipes & Sociétés', level: 1 })).toBeVisible({ timeout: 20_000 });

    // Le compte Direction se trouve dans la liste, avec ses attributs.
    await expect(page.getByText('harenakely@test.test', { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Harena Rak', { exact: true })).toBeVisible();
    await expect(page.getByText(/^lots assignés$/i).first()).toBeVisible();
    await expect(page.getByText(/^zones & lieux$/i).first()).toBeVisible();
    await expect(page.getByText(/^actif$/i).first()).toBeVisible();

    const filter = page.getByPlaceholder(/filtrer par nom, email ou rôle/i);
    await filter.fill('heri@entreprise.test');
    await expect(page.getByText('Hery Randria')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('harenakely@test.test')).toBeHidden({ timeout: 10_000 });

    await filter.fill(`zz-introuvable-${Date.now()}`);
    await expect(page.getByText('Hery Randria')).toBeHidden({ timeout: 10_000 });
  });

  test('EQP-03 - Actions par intervenant : horaire, rôle & périmètre, retrait (présentes, non déclenchées)', async () => {
    await revisit(page, '/equipes');
    await expect(page.getByRole('heading', { name: 'Équipes & Sociétés', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: "Définir l'horaire" }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Modifier le rôle & périmètre' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retirer du chantier' }).first()).toBeVisible();
  });

  test('EQP-04 - "Inviter un salarié" : email, identité, téléphone, fonction (Ouvrier, Chef chantier, Conducteur, Responsable Reprise), métier ; annulation sans envoi', async () => {
    await revisit(page, '/equipes');
    await page.getByRole('button', { name: 'Inviter un salarié' }).click();

    // Ces modales n'exposent pas role=dialog : on cible l'overlay plein écran.
    const dialog = page.locator('.fixed.inset-0').filter({ hasText: 'Inviter un salarié sur le chantier' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/chantier\s*:\s*résidence itaosy/i)).toBeVisible();
    for (const label of ['Adresse Email du salarié *', 'Prénom (optionnel)', 'Nom (optionnel)', 'Numéro de téléphone (optionnel)', 'Fonction / Rôle sur le chantier *', "Corps d'état / Métier principal *"]) {
      await expect(dialog.getByText(label, { exact: true }), `Champ "${label}"`).toBeVisible();
    }
    const fonctionSelect = dialog.getByRole('combobox').filter({
      has: page.locator('option', { hasText: /^Ouvrier/ }),
    });
    await expect(fonctionSelect, 'Sélection de la fonction sur le chantier').toBeVisible();
    for (const fonction of ['Ouvrier', 'Chef chantier', 'Conducteur', 'Responsable Reprise']) {
      const option = fonctionSelect.locator('option').filter({ hasText: new RegExp(`^${fonction}`) });
      await expect(option, `Fonction "${fonction}"`).toHaveCount(1);
      const value = await option.getAttribute('value');
      await fonctionSelect.selectOption(value!);
      await expect(fonctionSelect).toHaveValue(value!);
    }
    await expect(dialog.getByRole('button', { name: 'Inviter le salarié' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialog).toBeHidden();
  });

  test('EQP-05 - "Inviter une entreprise" et "Inviter un intervenant" ouvrent leur formulaire', async () => {
    for (const [action, title] of [['Inviter une entreprise', /entreprise/i], ['Inviter un intervenant', /intervenant/i]] as const) {
      await revisit(page, '/equipes');
      await page.getByRole('button', { name: action }).click();
      const dialog = page.locator('.fixed.inset-0').filter({ hasText: title });
      await expect(dialog, `Formulaire "${action}"`).toBeVisible();
      await expect(dialog.getByRole('button', { name: /annuler/i })).toBeVisible();
      await dialog.getByRole('button', { name: /annuler/i }).click();
      await expect(dialog).toBeHidden();
    }
  });
});
