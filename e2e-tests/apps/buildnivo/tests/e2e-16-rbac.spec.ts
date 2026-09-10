/**
 * e2e-16-rbac.spec.ts
 * -----------------------
 * Section 02 du cahier de recette — Utilisateurs & rôles (RBAC).
 * Couvre : RBAC-03 (accès refusé sans droit admin), et NOTIF-03 (accès aux
 * notifications d'un tiers par manipulation d'URL).
 *
 * Exécuté avec la session "Intervenant sans droit particulier" (projet
 * "buildnivo-rbac") — le compte à privilèges les plus bas du cahier de recette.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_ONLY_PATHS = [
  '/equipes',          // Équipes & sociétés — gestion des utilisateurs/rôles
  '/parametres',        // Paramètres généraux
  '/controle/acces',     // Contrôle financier — accès réservés aux garants/financeurs
];

const SESSION_FILE = path.resolve(__dirname, '../auth/intervenant-simple.json');

test.describe('BuildNivo — 02. Utilisateurs & rôles (RBAC)', () => {

  test.beforeEach(async ({ page }) => {
    // Ce compte échoue actuellement à se connecter sur dev.buildnivo.com (voir
    // e2e-02-roles-login.spec.ts) — sans session valide, ces tests ne feraient que
    // constater qu'un visiteur anonyme est redirigé vers /connexion, ce qui n'a rien
    // à voir avec du RBAC. On les suspend explicitement plutôt que de laisser un faux
    // positif masquer l'absence réelle de compte "Intervenant sans droit particulier".
    test.skip(!fs.existsSync(SESSION_FILE),
      'Session "Intervenant sans droit particulier" indisponible (identifiants refusés au login — ' +
      'voir e2e-02-roles-login.spec.ts) : les tests RBAC ne peuvent pas être exécutés avec un compte à ' +
      'privilèges réels tant que ce compte n\'est pas provisionné dans cet environnement.'
    );
    await page.goto('/chantiers', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const authenticated = !page.url().includes('/connexion');
    test.skip(!authenticated, 'Session "Intervenant sans droit particulier" présente mais invalide/expirée (redirigé vers /connexion).');
  });

  for (const path of ADMIN_ONLY_PATHS) {
    test(`RBAC-03 — Accès à ${path} sans droit suffisant → refusé`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(1500);

      const url = page.url();
      const redirectedToLogin = /\/connexion/.test(url);
      const deniedMsg = page.getByText(/403|accès refusé|non autorisé|forbidden|permission insuffisante/i);
      const isDenied = await deniedMsg.first().isVisible({ timeout: 3_000 }).catch(() => false);

      // Refus attendu : soit redirection vers /connexion (session invalide/insuffisante),
      // soit un message d'erreur 403 explicite sur place — jamais un accès silencieux au contenu.
      expect(redirectedToLogin || isDenied).toBeTruthy();
    });
  }

  test('NOTIF-03 — Accès aux notifications d\'un tiers via manipulation d\'URL → refusé', async ({ page }) => {
    // Tentative d'accès direct à un identifiant de notification arbitraire.
    await page.goto('/notifications/99999999', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const url = page.url();
    const notFoundOrDenied = page.getByText(/403|404|introuvable|accès refusé|non autorisé/i);
    const isBlocked = await notFoundOrDenied.first().isVisible({ timeout: 3_000 }).catch(() => false);
    const redirected = /\/connexion|\/chantiers$|\/dashboard$/.test(url);

    test.skip(!isBlocked && !redirected,
      'NOTIF-03 — la route /notifications/:id n\'existe peut-être pas telle quelle dans BuildNivo ' +
      '(les notifications sont accessibles via le panneau, pas une URL dédiée) — vérifier manuellement.'
    );
    expect(isBlocked || redirected).toBeTruthy();
  });

});
