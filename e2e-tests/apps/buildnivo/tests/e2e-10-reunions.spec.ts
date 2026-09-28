/**
 * e2e-10-reunions.spec.ts
 * ---------------------------
 * Section 11 du cahier de recette — Réunions & comptes rendus.
 * Couvre : REU-01 à REU-03 (best-effort).
 */

import { test, expect } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';
import { openModuleAs, isoDateInDays } from '../pages/RoleSession';

test.describe('BuildNivo — 11. Réunions & comptes rendus', () => {

  test('Page Réunions & CR accessible', async ({ page }) => {
    const mod = new ModulePage(page, '/reunions');
    await mod.goto();
    await mod.verifyLoaded(/réunions/i);
    await mod.verifyEmptyStateOrData();
  });

  // Matrice RBAC de l'app (/matrix) : Réunions = "read" pour Direction, "write" pour Conducteur
  // de travaux — la création se teste donc avec le Conducteur (bouton "Nouvelle réunion"),
  // Direction n'ayant délibérément que la consultation.
  test('REU-01 — Création d\'une réunion avec convocation de participants (Conducteur de travaux)', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'conducteur', '/reunions');

    await page.getByRole('button', { name: 'Nouvelle réunion' }).click();
    const dialog = page.getByRole('dialog', { name: /nouvelle réunion de chantier/i });
    await expect(dialog).toBeVisible();

    // Heure pseudo-aléatoire : permet de retrouver sans ambiguïté la réunion créée dans la
    // liste ("Réunion de chantier n°N <date> (HH:MM) <statut>"), le numéro étant attribué par l'app.
    const hh = String(6 + (Date.now() % 12)).padStart(2, '0');
    const mm = String(Date.now() % 60).padStart(2, '0');
    const heure = `${hh}:${mm}`;
    await dialog.locator('input[type="date"]').first().fill(isoDateInDays(3));
    await dialog.locator('input[type="time"]').fill(heure);

    const convoques = ['Rinasoa Rav', 'Hery Randria'];
    for (const nom of convoques) {
      await dialog.locator('*:has(> input[type="checkbox"])').filter({ hasText: nom }).first()
        .locator('input[type="checkbox"]').check();
    }
    await expect(dialog.getByText(`${convoques.length} participant(s)`)).toBeVisible();

    await dialog.getByRole('button', { name: 'Créer le compte-rendu' }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    const meeting = page.getByRole('button', { name: new RegExp(`Réunion de chantier n°\\d+ .*\\(${heure}\\)`) });
    await expect(meeting).toBeVisible({ timeout: 15_000 });
    await meeting.click();
    for (const nom of convoques) {
      await expect(page.getByRole('listitem').filter({ hasText: nom }).first()).toBeVisible();
    }

    // Nettoyage : la réunion est créée sur le chantier de démo partagé.
    page.once('dialog', d => d.accept().catch(() => {}));
    await page.getByRole('button', { name: 'Supprimer', exact: true }).first().click();
    const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog'))
      .getByRole('button', { name: /supprimer|confirmer|oui/i });
    if (await confirm.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirm.first().click();
    }
    await expect(meeting).toBeHidden({ timeout: 15_000 });

    await context.close();
  });

});
