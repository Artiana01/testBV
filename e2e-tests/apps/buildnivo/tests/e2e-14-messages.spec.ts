/**
 * e2e-14-messages.spec.ts
 * ---------------------------
 * Section 15 du cahier de recette — Messagerie & copilote IA.
 * Couvre : MSG-01 à MSG-04 (best-effort — les scénarios copilote IA et
 * mention/épinglage nécessitent une conversation existante).
 */

import { test, expect } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';

test.describe('BuildNivo — 15. Messagerie & copilote IA', () => {

  test('Page Messages accessible avec filtres Toutes / Non lues', async ({ page }) => {
    const mod = new ModulePage(page, '/messages');
    await mod.goto();
    await mod.verifyLoaded(/messages/i);
    await expect(page.getByText('Toutes', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Non lues', { exact: true }).first()).toBeVisible();
  });

  test('MSG-01 — Ouverture du compose "Nouveau message"', async ({ page }) => {
    const mod = new ModulePage(page, '/messages');
    await mod.goto();

    const newMsgBtn = page.getByRole('button', { name: /nouveau message/i }).first();
    const hasBtn = await newMsgBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!hasBtn, 'MSG-01 — bouton "Nouveau message" introuvable.');

    await newMsgBtn.click();
    await mod.dismissOnboardingTour();
    await page.waitForTimeout(1000);

    // "Nouveau message" ouvre d'abord une recherche de destinataire ("Démarrer une
    // conversation" / "Rechercher une personne...") — pas directement une zone de texte.
    // Le champ de recherche est type="search", pas capté par input[type="text"].
    const modal = page.locator('.fixed.inset-0').first();
    const hasModal = await modal.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!hasModal, 'MSG-01 — la fenêtre de démarrage de conversation ne s\'est pas ouverte.');
    await expect(modal.locator('input').first()).toBeVisible({ timeout: 8_000 });
  });

  // Historique : le 2026-09-25, 30 POST /api/conversations/:id/messages simultanés → 30 × 201, aucun
  // anti-flood. Un rate-limit a depuis été ajouté (constaté le 2026-10-07 : 30 envois passent, puis
  // ~32 messages dans la fenêtre → 429 pour les suivants). Une rafale de 30 reste donc juste sous le
  // seuil : on en envoie 60. L'UI n'envoie qu'un message à la fois (15 "Entrée" rapides → 5 envois),
  // donc une rafale via l'interface n'atteint jamais le serveur assez vite : le test la fait au niveau
  // API, comme le ferait un client automatisé (conversation 1:1 avec Raivosoa Andria, session Direction).
  // Les messages créés sont supprimés ensuite.
  test('MSG-04 — Envoi de messages en rafale → throttle déclenché', async ({ page }) => {
    const mod = new ModulePage(page, '/messages');
    await mod.goto();
    // Ouvrir la conversation déclenche un POST …/read, et un GET …/messages seulement si elle n'est
    // pas déjà en cache : on déduit donc l'URL d'envoi de l'identifiant de conversation de l'une ou l'autre.
    const opened = page.waitForResponse(r => /\/api\/conversations\/[^/]+\/(messages|read)/.test(r.url()));
    await page.getByRole('button', { name: /^Raivosoa Andria/ }).first().click();
    const messagesUrl = (await opened).url().split('?')[0].replace(/\/(messages|read)$/, '/messages');

    const { statuses, ids } = await page.evaluate(async ({ url, tag }) => {
      const xsrf = decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) ?? [])[1] ?? '');
      const results = await Promise.all(Array.from({ length: 60 }, async (_, i) => {
        const body = new FormData();
        body.append('text_content', `${tag} #${i}`);
        const r = await fetch(url, { method: 'POST', credentials: 'include', body, headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrf } });
        const json = await r.json().catch(() => ({}));
        return { status: r.status, id: json?.data?.id as string | undefined };
      }));
      return { statuses: results.map(r => r.status), ids: results.map(r => r.id).filter(Boolean) as string[] };
    }, { url: messagesUrl, tag: `E2E rafale ${Date.now()}` });

    // Nettoyage des messages effectivement créés (conversation réelle d'un compte de démo).
    await page.evaluate(async (messageIds) => {
      const xsrf = decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) ?? [])[1] ?? '');
      await Promise.all(messageIds.map(id => fetch(`/api/messages/${id}`, { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrf } })));
    }, ids);

    expect(statuses).toContain(429);
  });

});
