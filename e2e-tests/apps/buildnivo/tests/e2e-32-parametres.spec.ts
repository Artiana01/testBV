/**
 * e2e-32-parametres.spec.ts
 * -------------------------
 * Module "Paramètres" (/parametres) : préférences de l'application - langue de l'interface, mode
 * découverte, abonnement (le flux Stripe du Propriétaire est couvert par e2e-17-billing) et à propos.
 *
 * Lecture seule : la langue n'est pas changée (préférence persistée du compte Direction partagé).
 */

import { test, expect } from '@playwright/test';
import { openModuleAs } from '../pages/RoleSession';

test.describe('BuildNivo - 32. Paramètres', () => {

  test('PARAM-01 - Direction : langue, mode découverte, abonnement en lecture (réservé au propriétaire), à propos', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'direction', '/parametres');
    await expect(page.getByRole('heading', { name: 'Paramètres', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Préférences de l'application")).toBeVisible();

    await expect(page.getByRole('heading', { name: "Langue de l'interface" })).toBeVisible();
    await expect(page.getByText(/disponible en français et en anglais/i)).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Mode découverte' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Revoir la présentation des modules' })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Abonnement' })).toBeVisible();
    await expect(page.getByText(/abonnement actif/i)).toBeVisible();
    // Seul le propriétaire gère l'abonnement : Direction ne voit que l'information.
    await expect(page.getByText(/seul le propriétaire de l'entreprise peut gérer l'abonnement/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /gérer mon abonnement/i })).toHaveCount(0);

    await expect(page.getByRole('heading', { name: 'À propos de BuildNivo' })).toBeVisible();
    await expect(page.getByText(/centralise le pilotage de chantier/i)).toBeVisible();
    await context.close();
  });

  test('PARAM-02 - "Revoir la présentation des modules" relance le tour guidé', async ({ browser }) => {
    const { context, page, shell } = await openModuleAs(browser, 'direction', '/parametres');
    await expect(page.getByRole('heading', { name: 'Mode découverte' })).toBeVisible({ timeout: 20_000 });
    await shell.keepOnboardingTourOpen();
    await page.getByRole('button', { name: 'Revoir la présentation des modules' }).click();
    const tour = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Suivant', exact: true }) });
    await expect(tour, 'Le tour guidé doit se lancer après la demande').toBeVisible({ timeout: 15_000 });
    await tour.getByRole('button', { name: 'Passer', exact: true }).click();
    await expect(tour).toBeHidden();
    await context.close();
  });
});
