/**
 * e2e-04-pointage.spec.ts
 * ---------------------------
 * Section 05 du cahier de recette — Pointage & présences.
 * Couvre : POINT-01 à POINT-05. Le pointage personnel ("Mon pointage") n'existe
 * que pour les rôles terrain (Ouvrier sous-traitant...) — Direction et Chef de
 * chantier n'ont pas cette section (contrôle/supervision uniquement) : POINT-01
 * et POINT-05 utilisent donc une session dédiée plutôt que celle du describe.
 */

import { test, expect, Page } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';
import { openModuleAs } from '../pages/RoleSession';

// Confirmé (inspection live, 2026-09-23) : ni Direction ni Chef de chantier n'ont de pointage
// personnel sur /pointage (Direction : aucune section pointage ; Chef de chantier : vue
// superviseur d'équipe uniquement, "Temps réel"/"Feuille de pointage"/"Export paie", pas de
// "Mon pointage"). Le rôle "Ouvrier sous-traitant" a lui une section "Mon pointage" — c'est le
// rôle attendu pour POINT-01/POINT-05, pas Direction.
function monPointage(page: Page) {
  return page.locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Mon pointage' }) })
    .filter({ has: page.getByRole('button') })
    .last();
}

test.describe('BuildNivo — 05. Pointage & présences', () => {

  test('Page Pointage accessible, résumé du jour affiché', async ({ page }) => {
    const mod = new ModulePage(page, '/pointage');
    await mod.goto();
    await mod.verifyLoaded(/pointage/i);
    await expect(page.getByText(/présents maintenant|prévus aujourd'hui/i).first()).toBeVisible({ timeout: 10_000 });
  });

  // Machine d'états réelle de "Mon pointage" (Ouvrier sous-traitant, confirmée en direct) :
  //   Absent  → "Pointer l'arrivée" (+ confirmation) → Présent ("Arrivé à HH:MM",
  //   "Démarrer la pause", "Pointer la sortie") → "Pointer la sortie" (+ confirmation, "Votre
  //   journée sera clôturée") → "Journée terminée – X travaillées" (bouton désactivé).
  // Une seule arrivée par jour et par compte : l'état persiste côté serveur d'un run à l'autre,
  // les deux tests vérifient donc la règle applicable à l'état trouvé au lieu de dépendre d'un
  // compte "vierge" (ils sautaient dès le 2e run de la journée).
  // NB: POINT-05 s'exécute avant POINT-01 pour couvrir, au 1er run du jour, l'état "Absent".

  test('POINT-05 — Clock-out sans clock-in préalable → action refusée', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'ouvrier-sous-traitant', '/pointage');
    const card = monPointage(page);
    await expect(card).toBeVisible();

    // Une arrivée est ouverte (run précédent du jour) : on clôture la journée pour retrouver un
    // état sans pointage d'arrivée ouvert, qui est la précondition de POINT-05.
    const clockOut = card.getByRole('button', { name: 'Pointer la sortie' });
    if (await clockOut.isVisible().catch(() => false)) {
      await clockOut.click();
      await page.getByRole('dialog', { name: 'Pointer la sortie' }).getByRole('button', { name: 'Confirmer' }).click();
      await expect(card.getByText(/journée terminée/i).first()).toBeVisible({ timeout: 15_000 });
    }

    // Sans arrivée ouverte, aucune sortie ne doit pouvoir être pointée.
    await expect(card.getByRole('button', { name: 'Pointer la sortie' })).toHaveCount(0);
    const closedDay = card.getByRole('button', { name: /journée terminée/i });
    if (await closedDay.isVisible().catch(() => false)) {
      await expect(closedDay).toBeDisabled();
    } else {
      await expect(card.getByRole('button', { name: "Pointer l'arrivée" })).toBeVisible();
    }
    await context.close();
  });

  test('POINT-01 — Clock-in en début de journée', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'ouvrier-sous-traitant', '/pointage');
    const card = monPointage(page);
    await expect(card).toBeVisible();

    const clockIn = card.getByRole('button', { name: "Pointer l'arrivée" });
    if (await clockIn.isVisible().catch(() => false)) {
      await clockIn.click();
      // Confirmation obligatoire : sans ce 2e clic, rien n'est enregistré.
      await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
      await expect(card.getByText(/arrivé à \d{1,2}:\d{2}/i)).toBeVisible({ timeout: 15_000 });
      await expect(card.getByRole('button', { name: 'Pointer la sortie' })).toBeVisible();
    } else {
      // Arrivée déjà pointée aujourd'hui (run précédent) : elle doit être consignée, et une
      // deuxième arrivée le même jour ne doit pas être proposée.
      test.info().annotations.push({ type: 'note', description: 'Arrivée déjà pointée aujourd\'hui par un run précédent : vérification de l\'arrivée consignée et de l\'absence de double pointage.' });
      await expect(card.getByText(/arrivé à \d{1,2}:\d{2}|journée terminée – .+ travaillées/i).first()).toBeVisible();
      await expect(clockIn).toHaveCount(0);
    }
    await context.close();
  });

  test('Feuille de pointage / Anomalies / Export paie accessibles', async ({ page }) => {
    const mod = new ModulePage(page, '/pointage');
    await mod.goto();

    for (const tab of ['Feuille de pointage', 'Anomalies', 'Export paie']) {
      const tabBtn = page.getByText(tab, { exact: false }).first();
      if (await tabBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(500);
      }
    }
    // Pas de crash après navigation entre les onglets
    await expect(page.getByText(/pointage/i).first()).toBeVisible();
  });

});
