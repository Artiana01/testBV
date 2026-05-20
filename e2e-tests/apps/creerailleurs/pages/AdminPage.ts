import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
  // Navigation admin
  readonly users_menu      = this.page.getByRole('link', { name: /utilisateurs|users/i })
    .or(this.page.getByRole('button', { name: /utilisateurs|users/i }));
  readonly manifestes_menu = this.page.getByRole('link', { name: /manifestes?/i })
    .or(this.page.getByRole('button', { name: /manifestes?/i }));
  readonly packs_menu      = this.page.getByRole('link', { name: /packs?/i })
    .or(this.page.getByRole('button', { name: /packs?/i }));
  readonly kpi_section     = this.page.locator('[class*="kpi"], [class*="stat"], [class*="card"]').first();
  readonly heading         = this.page.locator('h1, h2').first();

  // Gestion utilisateurs
  readonly users_table     = this.page.locator('table, [role="grid"]').first();
  readonly create_user_btn = this.page.getByRole('button', { name: /créer.*utilisateur|nouvel utilisateur|ajouter/i }).first();
  readonly export_btn      = this.page.getByRole('button', { name: /exporter|export|télécharger/i }).first();
  readonly export_pdf      = this.page.getByRole('button', { name: /pdf/i })
    .or(this.page.getByRole('link', { name: /pdf/i }));
  readonly export_excel    = this.page.getByRole('button', { name: /excel|csv/i })
    .or(this.page.getByRole('link', { name: /excel|csv/i }));

  // Gestion manifestes
  readonly manifestes_list = this.page.locator('table, [class*="list"], ul').first();
  readonly create_manifeste_btn = this.page.getByRole('button', { name: /créer.*manifeste|nouveau manifeste|ajouter/i }).first();
  readonly success_notif   = this.page.locator('[role="status"], [role="alert"], .success, .toast').first();

  constructor(page: Page) {
    super(page);
  }

  async navigateToAdmin() {
    await this.goto(`${this.baseURL}/admin`);
  }

  async navigateToAdminUsers() {
    await this.goto(`${this.baseURL}/admin/users`);
  }

  async navigateToAdminManifestes() {
    await this.goto(`${this.baseURL}/admin/manifestes`);
  }

  async navigateToAdminPacks() {
    await this.goto(`${this.baseURL}/admin/packs`);
  }

  async verifyAdminDashboardLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10_000 });
  }

  async verifyUsersTableLoaded() {
    await expect(this.users_table).toBeVisible({ timeout: 10_000 });
  }

  async verifyManifestesLoaded() {
    await expect(this.manifestes_list).toBeVisible({ timeout: 10_000 });
  }

  async verifySuccessNotification() {
    await expect(this.success_notif).toBeVisible({ timeout: 10_000 });
  }
}
