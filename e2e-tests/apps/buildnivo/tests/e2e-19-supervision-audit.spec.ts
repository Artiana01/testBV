/**
 * e2e-19-supervision-audit.spec.ts
 * -----------------------
 * Ticket BUILDNIVO-293 — [Sécurité / Audit] Console de supervision de
 * l'activité plateforme pour Superadmin & Traçabilité temps réel.
 *
 * Couvre le volet accès négatif (/admin/activity-logs doit être strictement
 * réservé au Superadmin) ET, depuis qu'un compte Superadmin réel a été fourni
 * le 2026-09-24 (SUPERADMIN_EMAIL/PASSWORD dans apps/buildnivo/.env — compte
 * d'agence réel, pas un compte de démo jetable, voir roles.ts), le volet
 * positif : contenu réel du journal, recherche, filtres, exports Excel/PDF,
 * pagination, section "Administration" de la sidebar.
 *
 * Observation non retenue comme anomalie (preuve insuffisante) : un contrôle
 * ponctuel sur les 3 autres routes /admin/* découvertes dans la sidebar
 * Superadmin (/admin/dashboard, /admin/packages, /admin/rbac) avec Direction
 * fraîchement connectée les a trouvées correctement bloquées — mais un seul
 * passage par route ne suffit pas à exclure la même race condition que
 * /admin/activity-logs (déjà vue basculer bloqué/accordé sur des essais
 * répétés). Ni confirmées buggées, ni innocentées : à vérifier par l'équipe
 * si cette zone est retouchée.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { AppShellPage } from '../pages/AppShellPage';

const AUTH_DIR = path.resolve(__dirname, '../auth');

const NON_SUPERADMIN_ROLES: Array<{ label: string; file: string }> = [
  { label: 'Direction', file: 'direction.json' },
  { label: 'Conducteur de travaux', file: 'conducteur.json' },
  { label: 'Chef de chantier', file: 'chef-chantier.json' },
  { label: 'Intervenant sans droit particulier', file: 'intervenant-simple.json' },
];

const SUPERADMIN_SESSION = path.join(AUTH_DIR, 'superadmin.json');

// ANOMALIE CONFIRMÉE sur dev.buildnivo.com (run du 2026-09-24) — PAS un problème de test :
// /admin/activity-logs ("Journal d'audit & Traçabilité") affiche lui-même le texte "Registre
// d'audit infalsifiable des actions et mutations exécutées sur BuildNivo (accès réservé au
// Superadmin)", mais la route n'a AUCUNE garde d'autorisation fiable. Le lien n'apparaît dans
// aucune sidebar observée, pour aucun rôle (masquage correct côté navigation, comme RBAC-03 sur
// /equipes et /controle/acces) — mais un accès direct par URL charge la page en entier pour
// n'importe quel rôle authentifié, sans exception constatée.
//
// Ce n'est PAS un accès systématiquement/durablement accordé à un rôle mal configuré, mais une
// race condition côté client : la page s'affiche intégralement (titre, compteurs, recherche,
// filtres, boutons Actualiser/Excel/PDF, tableau) pendant une brève fenêtre juste après le
// chargement/la connexion, avant qu'une vérification de permission ne "rattrape" et redirige
// (généralement) vers /dashboard. Preuve — vérifications répétées sur la même session
// authentifiée, à quelques secondes d'intervalle seulement :
//   Direction                              : accordé, accordé            (2/2 — jamais revérifié plus tard dans le run)
//   Conducteur de travaux (3 mesures dans le temps) : bloqué, ACCORDÉ, bloqué
//   Chef de chantier (4 tentatives)        : ACCORDÉ (t+0s) puis bloqué (t+0s bis, +15s, après détour dashboard)
//   Intervenant sans droit particulier (4) : ACCORDÉ (t+0s, t+0s bis) puis bloqué (+15s, après détour)
// → le rôle le MOINS privilégié de tout le cahier de recette obtient l'accès complet dans cette
// fenêtre : ce n'est donc pas une question de permissions mal attribuées à un rôle précis, la
// garde d'autorisation elle-même s'exécute en retard par rapport au tout premier rendu de la page.
// Contredit directement le scénario de sécurité marqué "OK" dans le rapport de test manuel du
// ticket BUILDNIVO-293. Bug applicatif à corriger côté BuildNivo (vérifier les droits AVANT tout
// rendu de contenu sensible — idéalement server-side — pas en parallèle/après coup) — voir
// test.fixme() ci-dessous pour chaque rôle, à repasser en test actif une fois corrigé.
//
// Nuance sur la portée de la fuite : le rendu capté pour Direction pendant la fenêtre bugguée
// affichait "0 Événements tracés" avec Excel/PDF désactivés, contre 323 événements réels et
// Excel/PDF actifs pour Superadmin. À NE PAS lire comme une preuve que les vraies données restent
// protégées : test Superadmin ci-dessous confirmé que ces boutons se désactivent simplement dès
// que le tableau affiché est vide (comportement générique, pas lié au rôle) — donc le "0" côté
// Direction peut tout aussi bien venir du même mécanisme (résultats pas encore chargés à l'instant
// de la capture) que d'une vraie protection serveur. Portée réelle de la fuite (juste la coquille
// UI, ou les données aussi) non tranchée — nécessiterait une capture réseau pendant une fenêtre
// "accordée" confirmée, non faite ici.

test.describe('BuildNivo — Sécurité/Audit. Console de supervision (BUILDNIVO-293)', () => {

  for (const role of NON_SUPERADMIN_ROLES) {
    test(`Accès à /admin/activity-logs refusé pour ${role.label} (non-Superadmin)`, async ({ browser }) => {
      test.fixme(true,
        `BUILDNIVO-293 — /admin/activity-logs accessible pour "${role.label}" pendant une fenêtre ` +
        "juste après chargement/connexion (race condition côté garde d'autorisation, confirmée le " +
        '2026-09-24 sur plusieurs rôles dont le moins privilégié du système — voir commentaire ' +
        'au-dessus de NON_SUPERADMIN_ROLES). Anomalie applicative réelle, pas un défaut de ce test — ' +
        'à repasser en test actif une fois la garde d\'autorisation corrigée côté app.'
      );

      const sessionFile = path.join(AUTH_DIR, role.file);
      test.skip(!fs.existsSync(sessionFile), `Session "${role.label}" indisponible.`);

      const context = await browser.newContext({ storageState: sessionFile });
      const page = await context.newPage();
      const shell = new AppShellPage(page);

      await page.goto('/admin/activity-logs', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
      await shell.dismissOnboardingTour();
      await shell.waitForSkeletonToClear(30_000);
      await page.waitForTimeout(1_500);

      // Refus attendu, immédiatement et de façon stable : jamais le titre de la console,
      // que ce soit par redirection ou par blocage sur place — jamais un accès même bref.
      const heading = page.getByRole('heading', { name: /journal d.audit/i });
      const isVisible = await heading.isVisible({ timeout: 2_000 }).catch(() => false);
      expect(isVisible).toBeFalsy();

      await context.close();
    });
  }

  test('Superadmin — sidebar "Administration" visible avec les 4 liens dédiés', async ({ browser }) => {
    test.skip(!fs.existsSync(SUPERADMIN_SESSION), 'Session Superadmin indisponible (SUPERADMIN_EMAIL/PASSWORD absents de .env).');

    const context = await browser.newContext({ storageState: SUPERADMIN_SESSION });
    const page = await context.newPage();
    const shell = new AppShellPage(page);

    await page.goto('/chantiers', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await shell.dismissOnboardingTour();
    await shell.waitForSkeletonToClear(30_000);

    await expect(page.getByText('Administration', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard admin' })).toBeVisible();
    await expect(page.getByRole('link', { name: /offres & tarification/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /rôles & permissions/i })).toBeVisible();
    await expect(page.getByRole('link', { name: "Journal d'audit" })).toBeVisible();

    await context.close();
  });

  test('Superadmin — /admin/activity-logs : contenu réel, recherche, filtres et exports fonctionnels', async ({ browser }) => {
    test.skip(!fs.existsSync(SUPERADMIN_SESSION), 'Session Superadmin indisponible (SUPERADMIN_EMAIL/PASSWORD absents de .env).');

    const context = await browser.newContext({ storageState: SUPERADMIN_SESSION });
    const page = await context.newPage();
    const shell = new AppShellPage(page);

    await page.goto('/admin/activity-logs', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await shell.waitForSkeletonToClear(30_000);
    await page.waitForTimeout(1_000);

    await expect(page.getByRole('heading', { name: /journal d.audit/i })).toBeVisible();
    await expect(page.getByText('Lecture seule')).toBeVisible();

    // Compteur réel (pas de valeur figée — l'historique grossit à chaque run/utilisation de
    // l'environnement — seule sa présence sous forme de nombre compte ici).
    await expect(page.getByText(/\d+\s*Événements tracés au total/i)).toBeVisible();

    // Catégories de filtre du plan de test manuel, dont "Accès sensibles & Exports".
    const filter = page.getByRole('combobox');
    await expect(filter.getByRole('option', { name: 'Toutes les actions' })).toHaveCount(1);
    await expect(filter.getByRole('option', { name: /créations/i })).toHaveCount(1);
    await expect(filter.getByRole('option', { name: /modifications/i })).toHaveCount(1);
    await expect(filter.getByRole('option', { name: /suppressions/i })).toHaveCount(1);
    await expect(filter.getByRole('option', { name: /validations/i })).toHaveCount(1);
    await expect(filter.getByRole('option', { name: /accès sensibles & exports/i })).toHaveCount(1);

    // Exports : vérifiés AVANT la recherche, sur le jeu de résultats complet — ces boutons se
    // désactivent dès que le tableau filtré est vide (confirmé en observant le run précédent :
    // désactivés après une recherche sans résultat, y compris pour Superadmin), donc les tester
    // après une recherche sur un terme inventé aurait donné un résultat trompeur.
    await expect(page.getByRole('button', { name: /^excel$/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: /^pdf$/i })).toBeEnabled();

    // Recherche : déclenche un vrai appel API avec le terme saisi (pas juste un filtrage local
    // silencieux) — évite qu'un champ de recherche non branché passe pour fonctionnel.
    const [searchResponse] = await Promise.all([
      page.waitForResponse(r => /\/api\/activity-logs/i.test(r.url()) && /search=e2e-audit-probe/i.test(r.url()), { timeout: 10_000 }),
      page.getByPlaceholder(/rechercher/i).fill('e2e-audit-probe'),
    ]);
    expect(searchResponse.ok()).toBeTruthy();

    await context.close();
  });

});
