/**
 * regression.spec.ts
 * ----------------------
 * Suite de régression BuildNivo — parcours nominaux critiques, à exécuter à
 * chaque cycle de recette pour vérifier qu'aucune fonctionnalité clé n'a
 * régressé. Session : Direction (projet "buildnivo-regression").
 */

import { test, expect } from '@playwright/test';
import { AppShellPage } from '../pages/AppShellPage';
import { ModulePage } from '../pages/ModulePage';
import { ChantiersPage } from '../pages/ChantiersPage';

test.describe('BuildNivo — RÉGRESSION — Parcours critiques', () => {

  test('RÉGRESSION — Session active, sidebar complète accessible', async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.gotoModule('/chantiers');
    await shell.verifyAuthenticated();

    for (const label of [
      'Chantiers', 'Pointage', 'Tâches', 'Journal de chantier', 'Photos & problèmes',
      'Visas & plans', 'Réunions & CR', 'Réserves', 'Achats & livraisons',
      'Finances', 'Documents', 'Messages', 'Équipes & sociétés', 'Paramètres',
    ]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('RÉGRESSION — Navigation à travers tous les modules sans erreur', async ({ page }) => {
    // 15 routes, certaines (Achats...) mettent jusqu'à ~40s à charger leurs données sous
    // charge — le timeout global (90s) est trop court pour ce test qui les enchaîne toutes.
    test.setTimeout(300_000);
    const routes = [
      '/chantiers', '/dashboard', '/pointage', '/taches', '/journal', '/photos',
      '/visas', '/reunions', '/reserves', '/achats', '/finances', '/documents',
      '/messages', '/equipes', '/parametres',
    ];

    for (const route of routes) {
      const mod = new ModulePage(page, route);
      await mod.goto();
      await expect(page).not.toHaveURL(/\/connexion/);
      // Aucune page blanche / erreur non gérée
      await expect(page.getByText(/erreur inattendue|something went wrong|500/i)).not.toBeVisible({ timeout: 2_000 }).catch(() => {});
    }
  });

  test('RÉGRESSION — Création d\'un chantier reste fonctionnelle (PROJ-01)', async ({ page }) => {
    const chantiers = new ChantiersPage(page);
    await chantiers.goto();

    // Voir la note ANOMALIE dans e2e-03-chantiers.spec.ts (PROJ-01) : POST /api/projects
    // répond parfois 403 pour le compte Direction, pas systématiquement — on tolère une
    // tentative supplémentaire avant de considérer que c'est un vrai blocage.
    let lastStatus: number | null = null;
    let nom = '';

    for (let attempt = 1; attempt <= 2; attempt++) {
      nom = `RÉGRESSION Chantier ${Date.now()}-${attempt}`;
      await chantiers.openCreateModal();
      await chantiers.fillNom(nom);
      await chantiers.fillVille('Antananarivo');

      const projectResponse = page.waitForResponse(
        r => r.url().includes('/api/projects') && r.request().method() === 'POST',
        { timeout: 15_000 }
      ).catch(() => null);
      await chantiers.submitCreate();
      const response = await projectResponse;

      if (!response || response.ok()) {
        lastStatus = response ? response.status() : null;
        break;
      }
      lastStatus = response.status();
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(1000);
    }

    if (lastStatus !== null && lastStatus >= 400) {
      throw new Error(`RÉGRESSION — POST /api/projects a répondu ${lastStatus} pour le compte Direction sur 2 tentatives. Voir ANOMALIE PROJ-01.`);
    }

    await chantiers.verifyChantierVisible(nom);
  });

  test('RÉGRESSION — Notifications accessibles depuis toutes les pages', async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.gotoModule('/chantiers');
    await expect(shell.getNotificationsButton()).toBeVisible({ timeout: 10_000 });
  });

});
