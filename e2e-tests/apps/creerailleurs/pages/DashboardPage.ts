import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Navigation dashboard
  readonly dashboard_menu  = this.page.getByRole('link', { name: /dashboard|tableau de bord|aperçu/i })
    .or(this.page.getByRole('button', { name: /dashboard|tableau de bord/i }));
  readonly profile_menu    = this.page.getByRole('link', { name: /profil|profile/i })
    .or(this.page.getByRole('button', { name: /profil|profile/i }));
  readonly documents_menu  = this.page.getByRole('link', { name: /documents|manifeste/i })
    .or(this.page.getByRole('button', { name: /documents|manifeste/i }));
  readonly password_menu   = this.page.getByRole('link', { name: /mot de passe|password/i })
    .or(this.page.getByRole('button', { name: /mot de passe|password/i }));
  readonly logout_btn      = this.page.getByRole('button', { name: /déconnexion|logout|se déconnecter/i })
    .or(this.page.getByRole('link', { name: /déconnexion|logout/i }));

  // KPIs / contenu
  readonly kpi_section     = this.page.locator('[class*="kpi"], [class*="stat"], [class*="card"], main').first();
  readonly heading         = this.page.locator('h1, h2').first();

  // Profil
  readonly name_field      = this.page.locator('input[name="name"]').or(this.page.getByLabel(/nom/i));
  readonly email_field     = this.page.locator('input[type="email"]').first();
  readonly save_btn        = this.page.getByRole('button', { name: /sauvegarder|enregistrer|modifier|update|save/i }).first();
  readonly success_notif   = this.page.locator('[role="status"], [role="alert"], .success, .toast').first();

  // Mot de passe
  readonly current_pw      = this.page.locator('input[name="currentPassword"], input[placeholder*="actuel"]').first();
  readonly new_pw          = this.page.locator('input[name="newPassword"], input[name="password"]').nth(0);
  readonly confirm_pw      = this.page.locator('input[name="confirmPassword"]').or(this.page.locator('input[type="password"]').nth(1));

  constructor(page: Page) {
    super(page);
  }

  async navigateToDashboard() {
    for (const path of ['/fr/espace-client', '/fr/dashboard', '/fr/mon-compte', '/espace-client', '/dashboard', '/mon-compte', '/compte']) {
      await this.page.goto(`${this.baseURL}${path}`);
      await this.page.waitForLoadState('domcontentloaded');
      const url = this.page.url();
      if (!url.includes('/connexion') && !url.includes('/login')) return;
    }
  }

  async navigateToProfile() {
    for (const path of ['/fr/espace-client/profil', '/fr/profil', '/fr/profile', '/espace-client/profil', '/profil', '/profile', '/mon-compte/profil']) {
      await this.page.goto(`${this.baseURL}${path}`);
      await this.page.waitForLoadState('domcontentloaded');
      const url = this.page.url();
      if (!url.includes('/connexion') && !url.includes('/login')) return;
    }
  }

  async navigateToDocuments() {
    for (const path of ['/fr/espace-client/documents', '/fr/documents', '/fr/mes-documents', '/espace-client/documents', '/documents', '/mes-documents', '/manifestes']) {
      await this.page.goto(`${this.baseURL}${path}`);
      await this.page.waitForLoadState('domcontentloaded');
      const url = this.page.url();
      if (!url.includes('/connexion') && !url.includes('/login')) return;
    }
  }

  async navigateToPassword() {
    for (const path of ['/fr/espace-client/mot-de-passe', '/fr/changer-mot-de-passe', '/fr/profil', '/espace-client/mot-de-passe', '/changer-mot-de-passe', '/change-password', '/profil']) {
      await this.page.goto(`${this.baseURL}${path}`);
      await this.page.waitForLoadState('domcontentloaded');
      const url = this.page.url();
      if (!url.includes('/connexion') && !url.includes('/login')) return;
    }
  }

  async verifyDashboardLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 20_000 });
    await expect(this.kpi_section).toBeVisible({ timeout: 20_000 });
  }

  async updateProfileName(newName: string) {
    await this.name_field.clear();
    await this.name_field.fill(newName);
    await this.save_btn.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async verifySuccessNotification() {
    await expect(this.success_notif).toBeVisible({ timeout: 20_000 });
  }

  async changePassword(current: string, newPw: string) {
    if (await this.current_pw.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.current_pw.fill(current);
    }
    await this.new_pw.fill(newPw);
    if (await this.confirm_pw.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.confirm_pw.fill(newPw);
    }
    await this.save_btn.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async logout() {
    if (await this.logout_btn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.logout_btn.first().click();
    } else {
      // Chercher dans un menu utilisateur
      const userMenu = this.page.locator('[class*="avatar"], [class*="user-menu"], [data-testid*="user"]').first();
      if (await userMenu.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await userMenu.click();
        await this.page.waitForTimeout(500);
        await this.page.getByText(/déconnexion|logout/i).first().click();
      }
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }
}
