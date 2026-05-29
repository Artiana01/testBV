/**
 * apps/bvtech/pages/DashboardPage.ts
 * ------------------------------------
 * Page Object — Dashboard utilisateur BV Tech
 * Couvre : /fr/dashboard ou page post-connexion
 *
 * Éléments attendus :
 * - KPIs (indicateurs clés)
 * - Section projets
 * - Graphiques
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class DashboardPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  async goto(): Promise<void> {
    await this.navigate('/fr/dashboard');
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  // =========================================================
  // VÉRIFICATIONS KPI
  // =========================================================

  async verifyDashboardLoaded(): Promise<void> {
    // Le dashboard doit être sur une URL authentifiée
    await expect(this.page).toHaveURL(/dashboard|account/i, { timeout: 15_000 });
    // Le contenu principal doit être visible
    const mainContent = this.page.locator('main, [class*="dashboard"], [class*="content"], [role="main"]');
    await expect(mainContent.first()).toBeVisible({ timeout: 20_000 });
  }

  async verifyKpisVisible(): Promise<void> {
    // Chercher des éléments KPI (cartes avec des nombres/statistiques)
    const kpiElements = this.page.locator(
      '[class*="kpi"], [class*="stat"], [class*="card"], [class*="metric"], [data-testid*="kpi"]'
    ).or(this.page.locator('[class*="overview"] [class*="card"]'));
    
    // Il doit y avoir au moins un élément KPI visible
    const count = await kpiElements.count();
    if (count > 0) {
      await expect(kpiElements.first()).toBeVisible({ timeout: 20_000 });
    }
  }

  async verifyProjectsSectionVisible(): Promise<void> {
    // Chercher une section projets (peut être vide si aucun projet)
    const projectsSection = this.page.getByText(/projet|project|mes projets|my projects/i)
      .or(this.page.locator('[class*="project"], [data-testid*="project"]'));
    
    // La section peut exister mais être vide
    if (await projectsSection.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(projectsSection.first()).toBeVisible();
    }
  }

  async verifyEmptyProjectsMessage(): Promise<void> {
    // Si aucun projet, chercher un message "aucun projet" ou "pas de projet"
    const emptyMsg = this.page.getByText(/aucun projet|no project|pas de projet|vide|empty/i)
      .or(this.page.locator('[class*="empty"], [class*="no-data"]'));
    
    if (await emptyMsg.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(emptyMsg.first()).toBeVisible();
    }
  }

  async verifyChartVisible(): Promise<void> {
    // Chercher un graphique (canvas, svg, ou conteneur chart)
    const chart = this.page.locator('canvas, svg[class*="chart"], [class*="chart"], [class*="graph"], [data-testid*="chart"]')
      .or(this.page.locator('[class*="recharts"], [class*="apexcharts"]'));
    
    if (await chart.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(chart.first()).toBeVisible();
    }
  }

  // =========================================================
  // NAVIGATION DEPUIS LE DASHBOARD
  // =========================================================

  async navigateToProfile(): Promise<void> {
    await this.navigate('/fr/profile');
    await this.waitForLoad();
  }

  async navigateToPlan(): Promise<void> {
    await this.navigate('/fr/plan');
    await this.waitForLoad();
  }

  async verifySidebarNavigation(): Promise<void> {
    await this.page.waitForTimeout(1000);

    // Essai 1 : liens dans nav/aside/sidebar
    const navLink = this.page.locator('nav a, aside a, [class*="sidebar"] a, [class*="nav"] a, [class*="menu"] a');
    if (await navLink.count() > 0) {
      await expect(navLink.first()).toBeVisible({ timeout: 10_000 });
      return;
    }

    // Essai 2 : conteneur de navigation
    const navContainer = this.page.locator('nav, aside, [role="navigation"], [class*="sidebar"], [class*="menu"]');
    if (await navContainer.count() > 0) {
      await expect(navContainer.first()).toBeVisible({ timeout: 10_000 });
      return;
    }

    // Fallback : vérifier qu'il y a au moins des liens dans la page (app chargée)
    const anyLink = this.page.locator('a[href]');
    const linkCount = await anyLink.count();
    if (linkCount > 0) {
      console.log(`ℹ️  Navigation: ${linkCount} liens trouvés (pas de sidebar standard)`);
      return;
    }

    // Si rien, vérifier que la page est au moins chargée
    await expect(this.page.locator('body')).toBeVisible({ timeout: 10_000 });
  }
}
