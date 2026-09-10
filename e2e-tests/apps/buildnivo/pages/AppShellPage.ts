/**
 * apps/buildnivo/pages/AppShellPage.ts
 * ---------------------------------------
 * Page Object de base pour toutes les pages authentifiées de BuildNivo.
 * Centralise : navigation dans la sidebar, fermeture du tour guidé
 * ("Mode découverte" — réapparaît à chaque changement de page tant qu'il
 * n'est pas désactivé dans Paramètres), et l'accès aux notifications.
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class AppShellPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  /**
   * Ferme le tour guidé ("Bienvenue sur BuildNivo... Passer/Suivant") s'il
   * est affiché. Se reproduit à chaque navigation en mode découverte —
   * on boucle donc plusieurs fois par sécurité.
   */
  async dismissOnboardingTour(): Promise<void> {
    for (let i = 0; i < 6; i++) {
      const skip = this.page.getByRole('button', { name: /^Passer$/i });
      if (await skip.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await skip.click().catch(() => {});
        await this.page.waitForTimeout(300);
      } else {
        break;
      }
    }
  }

  async gotoModule(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'networkidle', timeout: 45_000 });
    await this.dismissOnboardingTour();
  }

  /**
   * Sélecteur de chantier actif dans l'en-tête (<select aria-label="Chantier">) —
   * un <select> natif, pas une modale, donc pas d'overlay/tour à gérer ici.
   */
  getChantierSwitcher() {
    return this.page.locator('select[aria-label="Chantier"]');
  }

  /**
   * Force le chantier "Résidence Itaosy" (données de démo seedées : fournisseurs,
   * documents, réserves...) comme chantier actif. Le chantier actif est persistant
   * par compte (pas par onglet) — un test qui crée un chantier vide (PROJ-01,
   * régression) peut donc, sans ce garde-fou, faire basculer TOUS les tests suivants
   * de ce compte sur un chantier fraîchement créé et vide, cassant en cascade les
   * scénarios qui dépendent de données existantes (achats, documents, réserves...).
   */
  async ensureDemoChantierSelected(): Promise<void> {
    const switcher = this.getChantierSwitcher();
    if (!(await switcher.isVisible({ timeout: 3_000 }).catch(() => false))) return;
    const current = await switcher.inputValue().catch(() => '');
    const options = await switcher.locator('option').all();
    for (const opt of options) {
      const text = (await opt.textContent()) ?? '';
      if (/résidence itaosy/i.test(text)) {
        const value = await opt.getAttribute('value');
        if (value && value !== current) {
          await switcher.selectOption(value);
          await this.page.waitForLoadState('networkidle').catch(() => {});
          await this.dismissOnboardingTour();
        }
        return;
      }
    }
  }

  async clickSidebarLink(label: string | RegExp): Promise<void> {
    const link = this.page.locator('a, button').filter({ hasText: label }).first();
    await link.click();
    await this.dismissOnboardingTour();
    await this.page.waitForLoadState('domcontentloaded');
  }

  // =========================================================
  // HEADER
  // =========================================================

  getNotificationsButton() {
    return this.page.getByRole('button', { name: /notifications/i });
  }

  async openNotifications(): Promise<void> {
    await this.getNotificationsButton().click();
    await this.page.waitForTimeout(500);
  }

  getUserMenu() {
    return this.page.locator('text=/Direction|Conducteur|Chef de chantier|Salarié|Sous-traitant|Ouvrier|Maître d\'ouvrage|Bureau d\'étude|Contrôleur|Coordinateur|Intervenant/').first();
  }

  // =========================================================
  // VÉRIFICATIONS
  // =========================================================

  async verifyAuthenticated(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/connexion/, { timeout: 20_000 });
    await expect(this.page.getByText('BuildNivo').first()).toBeVisible({ timeout: 15_000 });
  }

  async verifyAccessDenied(): Promise<void> {
    // Accès refusé : soit redirection (login / dashboard / 403 dédiée),
    // soit un message d'erreur explicite affiché sur place.
    await this.page.waitForTimeout(1500);
    const deniedMsg = this.page.getByText(/403|accès refusé|non autorisé|forbidden|permission/i);
    const isDenied = await deniedMsg.first().isVisible({ timeout: 5_000 }).catch(() => false);
    const redirected = /\/connexion|\/chantiers$/.test(this.page.url());
    expect(isDenied || redirected).toBeTruthy();
  }
}
