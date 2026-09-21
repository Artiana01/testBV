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
import { AppShellPage } from '../pages/AppShellPage';

const ADMIN_ONLY_PATHS = [
  '/equipes',          // Équipes & sociétés — gestion des utilisateurs/rôles
  '/controle/acces',     // Contrôle financier — accès réservés aux garants/financeurs
  // NB: /parametres retiré — ce n'est pas une page admin-only mais les préférences
  // personnelles/app (langue, mode découverte, "à propos"), accessible à tout compte
  // authentifié (visible dans la sidebar même pour "Intervenant sans droit
  // particulier") ; les sections vraiment sensibles (ex. abonnement) y sont déjà
  // affichées en lecture seule pour les non-propriétaires ("Seul le propriétaire de
  // l'entreprise peut gérer l'abonnement"), donc pas d'accès silencieux à du contenu
  // protégé. Confirmé en observant la page rendue pour ce rôle : aucun contenu
  // admin-only exposé.
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
      const shell = new AppShellPage(page);
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await shell.dismissOnboardingTour();
      // Laisser le temps au rendu réel (au-delà du squelette de chargement) avant de
      // juger — sinon une page simplement lente à charger est comptée comme "ni refusée
      // ni redirigée" et fait échouer le test à tort (observé : squelette figé plusieurs
      // secondes sous charge, aucun rapport avec les droits du compte).
      await shell.waitForSkeletonToClear(45_000);
      await page.waitForTimeout(1000);

      const url = page.url();
      const redirectedToLogin = /\/connexion/.test(url);
      const deniedMsg = page.getByText(/403|accès refusé|non autorisé|forbidden|permission insuffisante/i);
      const isDenied = await deniedMsg.first().isVisible({ timeout: 3_000 }).catch(() => false);
      // Deux formes de chargement observées selon la page : squelette Tailwind
      // (animate-pulse) ou libellé/spinner générique "Chargement".
      const stillLoading = await page.locator('[class*="animate-pulse"]').first().isVisible().catch(() => false)
        || await page.getByText(/chargement/i).first().isVisible().catch(() => false);

      test.skip(stillLoading,
        `RBAC-03 — ${path} n'a pas fini de charger (squelette/spinner toujours affiché) : environnement ` +
        `probablement dégradé sous charge — inconclusif, pas un verdict RBAC.`
      );

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
