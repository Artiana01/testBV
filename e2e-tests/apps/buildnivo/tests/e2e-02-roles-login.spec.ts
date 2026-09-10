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
import { LoginPage } from '../pages/LoginPage';
import { AppShellPage } from '../pages/AppShellPage';
import { getRoles } from '../roles';

test.describe('BuildNivo — 02. Connexion des rôles métier (RBAC prérequis)', () => {

  for (const role of getRoles()) {
    test(`Connexion réussie — ${role.label} (${role.login})`, async ({ page }) => {
      const login = new LoginPage(page);
      await login.login(role.login, role.password);
      await login.verifyLoginSuccess();

      const shell = new AppShellPage(page);
      await shell.dismissOnboardingTour();
      await expect(page.getByText('BuildNivo').first()).toBeVisible({ timeout: 15_000 });
    });
  }

});
