import { Page } from '@playwright/test';
import { BasePage } from '../common/BasePage';

export class DashboardFreelancePage extends BasePage {
  // Locators
  readonly welcomeMessage = 'h1:has-text("Dashboard"), h1:has-text("Bienvenue")';
  readonly clientMenu = 'a:has-text("Clients"), button:has-text("Clients")';
  readonly missionMenu = 'a:has-text("Missions"), button:has-text("Missions")';
  readonly invoiceMenu = 'a:has-text("Factures"), button:has-text("Factures")';
  readonly profileMenu = 'a:has-text("Profil"), button:has-text("Profil")';
  readonly logoutButton = 'button:has-text("Déconnexion"), a:has-text("Déconnexion")';
  readonly packInfo = 'text=Pack, .pack-badge, [class*="pack"]';
  readonly addClientButton = 'button:has-text("Ajouter"), button:has-text("Nouveau")';

  constructor(page: Page) {
    super(page);
  }

  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.welcomeMessage);
  }

  async goToClients() {
    await this.click(this.clientMenu);
    await this.page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  }

  async goToMissions() {
    await this.click(this.missionMenu);
    await this.page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  }

  async goToInvoices() {
    await this.click(this.invoiceMenu);
    await this.page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  }

  async goToProfile() {
    await this.click(this.profileMenu);
    await this.page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  }

  async logout() {
    await this.click(this.logoutButton);
    await this.page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  }

  async addClient() {
    await this.click(this.addClientButton);
  }
}
