import { Page } from '@playwright/test';
import { BasePage } from '../common/BasePage';

export class AdminDashboardPage extends BasePage {
  // Locators
  readonly kycMenu = 'a:has-text("KYC"), button:has-text("KYC")';
  readonly kycPendingList = '[class*="pending"], table';
  readonly freelancerName = '[class*="name"]';
  readonly validateButton = 'button:has-text("Valider")';
  readonly rejectButton = 'button:has-text("Rejeter")';
  readonly successMessage = '.success-message, .alert-success, text=succès';
  readonly kycDetailsModal = '[role="dialog"], .modal';
  readonly closeModalButton = 'button:has-text("Fermer"), [aria-label="close"]';

  constructor(page: Page) {
    super(page);
  }

  async goToKyc() {
    await this.click(this.kycMenu);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async selectFreelancerKyc(freelancerName: string) {
    const row = this.page.locator(`text="${freelancerName}"`).first();
    await row.click();
    await this.page.waitForTimeout(2000);
  }

  async validateKyc() {
    await this.click(this.validateButton);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async rejectKyc() {
    await this.click(this.rejectButton);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successMessage);
  }

  async isSuccessVisible(): Promise<boolean> {
    return await this.isVisible(this.successMessage);
  }

  async closeModal() {
    if (await this.isVisible(this.closeModalButton)) {
      await this.click(this.closeModalButton);
    }
  }
}
