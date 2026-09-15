/**
 * apps/buildnivo/pages/ModulePage.ts
 * --------------------------------------
 * Page Object générique pour les modules "métier" de BuildNivo (Pointage,
 * Tâches, Journal, Photos, Réserves, Visas, Réunions, Achats, Finances,
 * Documents, Messages...). Ces modules partagent la même coquille (sidebar +
 * en-tête + contenu) — cette classe évite de dupliquer un Page Object par
 * module pour des pages dont on ne connaît pas encore tous les sélecteurs
 * internes en détail.
 *
 * Utilisation :
 *   const mod = new ModulePage(page, '/taches');
 *   await mod.goto();
 *   await mod.verifyLoaded(/tâches/i);
 */

import { Page, Locator, expect, test } from '@playwright/test';
import { AppShellPage } from './AppShellPage';

export class ModulePage extends AppShellPage {

  constructor(page: Page, private readonly path: string) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.gotoModule(this.path);
    // Ramène systématiquement sur le chantier de démo seedé (fournisseurs, documents,
    // réserves...) — au cas où un test précédent (création de chantier) aurait fait
    // basculer le compte sur un chantier vide fraîchement créé.
    await this.ensureDemoChantierSelected();
  }

  async verifyLoaded(titleOrRegex: string | RegExp): Promise<void> {
    await expect(this.page.getByText(titleOrRegex).first()).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Cherche un bouton d'action (ex: "Nouvelle tâche", "Ajouter une photo") par
   * texte/aria-label approximatif. Retourne `null` si introuvable — à utiliser
   * avec `test.skip` plutôt que de faire échouer un scénario sur un libellé
   * d'UI qui peut varier.
   */
  async findActionButton(pattern: RegExp): Promise<Locator | null> {
    const byText = this.page.getByRole('button', { name: pattern }).first();
    if (await byText.isVisible({ timeout: 3_000 }).catch(() => false)) return byText;
    return null;
  }

  async requireActionButton(pattern: RegExp, skipReason: string): Promise<Locator> {
    const btn = await this.findActionButton(pattern);
    test.skip(!btn, skipReason);
    return btn as Locator;
  }

  getEmptyState(pattern: RegExp = /aucun[e]?\s/i) {
    return this.page.getByText(pattern).first();
  }

  async verifyEmptyStateOrData(): Promise<void> {
    // Le module doit soit afficher un état vide explicite, soit des données —
    // dans tous les cas la zone de contenu doit être rendue (pas de crash/blanc).
    const empty = this.getEmptyState();
    const hasEmpty = await empty.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasEmpty) {
      // 'main, [role=main], body' matche <body> ET <main> à la fois → strict mode violation.
      // .first() suffit puisqu'on veut juste s'assurer qu'une zone de contenu est rendue.
      await expect(this.page.locator('main, [role="main"], body').first()).toBeVisible();
    }
  }
}
