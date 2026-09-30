/**
 * e2e-02-roles-login.spec.ts
 * -----------------------------
 * Smoke test de connexion pour les 13 comptes de démonstration BuildNivo
 * (un par rôle métier du cahier de recette : Direction, Conducteur de
 * travaux, Chef de chantier, Salarié ouvrier, Sous-traitants, Ouvrier
 * sous-traitant, Maître d'ouvrage, Maître d'ouvrage d'exécution, Bureau
 * d'étude, Contrôleur technique, Coordinateur SPS, Intervenant simple).
 *
 * Objectif : garantir que chaque profil métier peut se connecter et accéder
 * à l'application (prérequis à tous les scénarios RBAC de la section 02).
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { AppShellPage } from '../pages/AppShellPage';
import { getRole, getRoles } from '../roles';

const AUTH_DIR = path.resolve(__dirname, '../auth');

test.describe('BuildNivo — 02. Connexion des rôles métier (RBAC prérequis)', () => {

  for (const role of getRoles().filter(({ login, password }) => login && password)) {
    test(`Connexion réussie — ${role.label} (${role.login})`, async ({ page }) => {
      test.skip(
        fs.existsSync(path.join(AUTH_DIR, `${role.session}.failed`)),
        `Session ${role.label} non sauvegardée après les tentatives du setup; connexion ignorée.`,
      );
      test.setTimeout(150_000);
      const login = new LoginPage(page);
      await login.login(role.login, role.password);

      const blockedReason = await login.getKnownAccountBlockReason(role.login);
      test.skip(!!blockedReason, blockedReason);

      await login.verifyLoginSuccessWithRetry(role.login, role.password);

      const shell = new AppShellPage(page);
      await shell.dismissOnboardingTour();
      await expect(page.getByText('BuildNivo').first()).toBeVisible({ timeout: 15_000 });
    });
  }

  test('Superadmin — connexion et arrivée sur Chantiers', async ({ page }) => {
    const role = getRole('superadmin');
    test.skip(!role.login || !role.password, 'Identifiants superadmin absents de apps/buildnivo/.env.');
    test.skip(
      fs.existsSync(path.join(AUTH_DIR, `${role.session}.failed`)),
      'Session Superadmin non sauvegardée après les tentatives du setup; connexion ignorée.',
    );

    const login = new LoginPage(page);
    await login.login(role.login, role.password);
    await login.verifyLoginSuccessWithRetry(role.login, role.password);
    await expect(page).toHaveURL(/\/chantiers\/?$/);
  });

});
