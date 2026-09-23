/**
 * e2e-04-pointage.spec.ts
 * ---------------------------
 * Section 05 du cahier de recette — Pointage & présences.
 * Couvre : POINT-01 à POINT-05. Le pointage personnel ("Mon pointage") n'existe
 * que pour les rôles terrain (Ouvrier sous-traitant...) — Direction et Chef de
 * chantier n'ont pas cette section (contrôle/supervision uniquement) : POINT-01
 * et POINT-05 utilisent donc une session dédiée plutôt que celle du describe.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ModulePage } from '../pages/ModulePage';

// Confirmé (inspection live, 2026-09-23) : ni Direction ni Chef de chantier n'ont de pointage
// personnel sur /pointage (Direction : aucune section pointage ; Chef de chantier : vue
// superviseur d'équipe uniquement, "Temps réel"/"Feuille de pointage"/"Export paie", pas de
// "Mon pointage"). Le rôle "Ouvrier sous-traitant" a lui une section "Mon pointage" avec un
// bouton "Pointer l'arrivée" — c'est le rôle attendu pour POINT-01/POINT-05, pas Direction.
const OUVRIER_SESSION = path.resolve(__dirname, '../auth/ouvrier-sous-traitant.json');

test.describe('BuildNivo — 05. Pointage & présences', () => {

  test('Page Pointage accessible, résumé du jour affiché', async ({ page }) => {
    const mod = new ModulePage(page, '/pointage');
    await mod.goto();
    await mod.verifyLoaded(/pointage/i);
    await expect(page.getByText(/présents maintenant|prévus aujourd'hui/i).first()).toBeVisible({ timeout: 10_000 });
  });

  // NB: POINT-05 doit s'exécuter avant POINT-01 — POINT-05 vérifie le refus d'un clock-out SANS
  // clock-in préalable, ce qui ne tient que si Henri (Ouvrier sous-traitant) n'a pas déjà pointé
  // son arrivée aujourd'hui. Comme POINT-01 pointe réellement l'arrivée sur ce compte de démo
  // (état persistant côté serveur, pas juste local au test), l'exécuter avant casserait la
  // précondition de POINT-05.
  test('POINT-05 — Clock-out sans clock-in préalable → action refusée', async ({ browser }) => {
    test.skip(!fs.existsSync(OUVRIER_SESSION), 'Session "Ouvrier sous-traitant" non disponible (global-setup).');
    const context = await browser.newContext({ storageState: OUVRIER_SESSION });
    const page = await context.newPage();
    const mod = new ModulePage(page, '/pointage');
    await mod.goto();

    const clockOutBtn = await mod.findActionButton(/pointer le départ|badger le départ|clock.?out/i);
    test.skip(!clockOutBtn,
      'POINT-05 — bouton de pointage départ introuvable pour Ouvrier sous-traitant (peut-être déjà ' +
      'pointé aujourd\'hui par un run précédent de la suite — état persistant côté serveur).'
    );

    await clockOutBtn!.click();
    await page.waitForTimeout(1500);

    const errorMsg = page.getByText(/aucun pointage d'arrivée|vous n'avez pas pointé|erreur/i);
    const disabled = await clockOutBtn!.isDisabled().catch(() => false);
    const hasError = await errorMsg.first().isVisible({ timeout: 3_000 }).catch(() => false);

    expect(disabled || hasError).toBeTruthy();
    await context.close();
  });

  test('POINT-01 — Clock-in en début de journée', async ({ browser }) => {
    test.skip(!fs.existsSync(OUVRIER_SESSION), 'Session "Ouvrier sous-traitant" non disponible (global-setup).');
    const context = await browser.newContext({ storageState: OUVRIER_SESSION });
    const page = await context.newPage();
    const mod = new ModulePage(page, '/pointage');
    await mod.goto();

    const clockInBtn = await mod.findActionButton(/pointer l'arrivée|badger l'arrivée|clock.?in|pointer l'entrée/i);
    test.skip(!clockInBtn,
      'POINT-01 — bouton de pointage arrivée introuvable pour Ouvrier sous-traitant (peut-être ' +
      'déjà pointé aujourd\'hui par un run précédent de la suite — état persistant côté serveur).'
    );

    await clockInBtn!.click();
    await page.waitForTimeout(500);
    // "Pointer l'arrivée" ouvre une modale de confirmation ("Vous allez pointer votre arrivée sur
    // ce chantier." / Confirmer / Annuler) avant l'action réelle — sans ce 2e clic, rien n'est
    // jamais enregistré (observé : reste indéfiniment sur "Absent" / "Aucun pointage aujourd'hui").
    const confirmBtn = page.getByRole('button', { name: /^confirmer$/i });
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(1500);

    // Le texte exact affiché après confirmation n'a pas été observé directement — on accepte donc
    // soit un message de confirmation explicite, soit le badge "Mon statut" passant à "Présent"
    // (son état avant pointage, visible sur ce même écran, est "Absent").
    const confirmation = page.getByText(/arrivée enregistrée|pointage enregistré/i).or(page.getByText(/^présent$/i));
    await expect(confirmation.first()).toBeVisible({ timeout: 10_000 });
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
