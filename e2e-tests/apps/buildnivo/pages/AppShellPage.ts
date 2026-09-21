/**
 * apps/buildnivo/pages/AppShellPage.ts
 * ---------------------------------------
 * Page Object de base pour toutes les pages authentifiées de BuildNivo.
 * Centralise : navigation dans la sidebar, fermeture du tour guidé
 * ("Bienvenue sur BuildNivo... Passer/Suivant" — un onboarding "première visite
 * par module" indépendant du toggle "Mode découverte" de Paramètres, qui peut
 * rester désactivé sans empêcher ce tour de réapparaître), et l'accès aux
 * notifications.
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';
import { LoginPage } from './LoginPage';

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

  /**
   * Surveille l'apparition du tour pendant `windowMs` et le ferme dès qu'il
   * apparaît. Nécessaire car le tour peut se déclencher avec un délai variable
   * APRÈS que le contenu réel d'une page lente (Achats...) ait fini de charger
   * — un simple dismissOnboardingTour() immédiat après le chargement peut donc
   * passer trop tôt et laisser le tour intercepter un clic quelques secondes
   * plus tard. À appeler juste avant toute interaction sensible sur une page
   * qui vient de charger.
   */
  async watchForOnboardingTour(windowMs = 6_000): Promise<void> {
    const deadline = Date.now() + windowMs;
    while (Date.now() < deadline) {
      const skip = this.page.getByRole('button', { name: /^Passer$/i });
      if (await skip.isVisible({ timeout: 500 }).catch(() => false)) {
        await skip.click().catch(() => {});
        await this.page.waitForTimeout(300);
        await this.dismissOnboardingTour();
        return;
      }
      await this.page.waitForTimeout(500);
    }
  }

  async gotoModule(path: string): Promise<void> {
    // 'networkidle' est fragile sur cette app : la messagerie/notifications gardent une
    // connexion websocket (broadcasting/Pusher) active en permanence, donc "zéro requête
    // réseau pendant 500ms" peut ne jamais survenir même quand la page est parfaitement
    // utilisable — d'où des timeouts de navigation à 45-90s sans rapport avec un vrai bug.
    // 'domcontentloaded' + attente du rendu réel (skeleton → contenu) est plus fiable.
    await this.page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 });

    // La session "direction.json" (créée une fois en global-setup) est réutilisée pendant
    // toute la durée des sections 03-16 + régression — 20 à 35 minutes de tests
    // séquentiels selon la charge de l'environnement. Observé de façon reproductible :
    // au-delà d'une certaine durée, le token de session BuildNivo expire et TOUTE
    // navigation suivante redirige vers /connexion, faisant échouer en cascade tous les
    // tests restants pour une raison qui n'a rien à voir avec eux. On se reconnecte donc
    // à la volée avec le même compte plutôt que de laisser filer cette cascade. Tous les
    // appelants de gotoModule() (ModulePage, régression) utilisent exclusivement la
    // session Direction — pas de risque d'élever les privilèges d'un autre rôle ici.
    if (this.page.url().includes('/connexion')) {
      await this.reauthenticateAsDirection();
      await this.page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    }

    await this.dismissOnboardingTour();
    await this.waitForSkeletonToClear();
    // Le tour peut se (re)déclencher avec un délai variable une fois le contenu réel monté
    // (pas seulement juste après la navigation) — on le surveille encore quelques secondes
    // pour éviter qu'une modale "Passer" apparue en retard n'intercepte un clic plus tard
    // dans le test.
    await this.watchForOnboardingTour();
  }

  private async reauthenticateAsDirection(): Promise<void> {
    const email = process.env.DIRECTION_EMAIL ?? 'harenakely@test.test';
    const password = process.env.DIRECTION_PASSWORD ?? 'Harena@123!!';
    const login = new LoginPage(this.page);
    await login.login(email, password);
    await expect(this.page).not.toHaveURL(/\/connexion/, { timeout: 45_000 }).catch(() => {});
  }

  /**
   * Attend que l'indicateur de chargement (squelette gris pulsant pendant l'hydratation
   * React, ou libellé/spinner générique "Chargement" selon la page) laisse place au
   * contenu réel. Best-effort : si aucun des deux n'est présent, cette attente est un
   * no-op. Les deux formes sont vérifiées — une page qui n'utilise que "Chargement"
   * (pas de squelette animate-pulse) faisait sinon sortir cette fonction immédiatement
   * sans avoir réellement attendu (observé sur /controle/acces : squelette absent mais
   * page encore sur "Chargement" quand les vérifications suivantes s'exécutaient).
   */
  async waitForSkeletonToClear(timeoutMs = 45_000): Promise<void> {
    // Petit délai avant de vérifier : juste après domcontentloaded, React n'a pas encore
    // monté le squelette — sans ce délai, un waitFor('hidden') sur 0 élément trouvé
    // résoudrait immédiatement (faux négatif : "pas de squelette" au lieu de "pas encore
    // rendu"), laissant passer une page encore vide.
    await this.page.waitForTimeout(600);
    const skeleton = this.page.locator('[class*="animate-pulse"]').first();
    await skeleton.waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => {});
    const spinner = this.page.getByText(/^chargement/i).first();
    await spinner.waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => {});
  }

  /**
   * Variante de getByText qui ignore les correspondances masquées (notamment les
   * <option> de <select>, toujours "hidden" pour Playwright même quand le <select> lui
   * -même est visible et affiche cette valeur). Évite qu'un nouveau filtre <select>
   * ajouté à une page fasse échouer une assertion censée cibler un libellé visible
   * ailleurs sur la page (colonnes Kanban, cartes, titres...).
   */
  getVisibleText(pattern: string | RegExp, exact = false) {
    return this.page.getByText(pattern, { exact }).and(this.page.locator(':visible'));
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
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          await this.dismissOnboardingTour();
          await this.waitForSkeletonToClear();
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
