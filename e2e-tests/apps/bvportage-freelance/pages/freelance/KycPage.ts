import { Page } from '@playwright/test';
import { BasePage } from '../common/BasePage';

export class KycPage extends BasePage {
  // Locators
  readonly kycMenu = 'a:has-text("KYC"), button:has-text("KYC")';
  readonly uploadSelfieButton = 'button:has-text("Photo"), button:has-text("Selfie")';
  readonly uploadIdButton = 'button:has-text("CIN"), button:has-text("Identité")';
  readonly uploadRibButton = 'button:has-text("RIB"), button:has-text("Bancaire")';
  readonly uploadDocumentButton = 'button:has-text("Document")';
  readonly submitKycButton = 'button:has-text("Soumettre"), button[type="submit"]:visible';
  readonly successMessage = '.success-message, .alert-success, text=succès';
  readonly kycStatus = '[class*="status"], .badge, text=validation';
  readonly fileInput = 'input[type="file"]';

  constructor(page: Page) {
    super(page);
  }

  async goToKyc() {
    await this.click(this.kycMenu);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async uploadSelfie(filePath: string) {
    const fileInput = this.page.locator(this.fileInput).first();
    await fileInput.setInputFiles(filePath);
  }

  async uploadIdDocument(filePath: string) {
    const fileInput = this.page.locator(this.fileInput).nth(1);
    await fileInput.setInputFiles(filePath);
  }

  async uploadRib(filePath: string) {
    const fileInput = this.page.locator(this.fileInput).nth(2);
    await fileInput.setInputFiles(filePath);
  }

  async uploadDocument(filePath: string) {
    const fileInput = this.page.locator(this.fileInput).nth(3);
    await fileInput.setInputFiles(filePath);
  }

  async submitKyc() {
    await this.click(this.submitKycButton);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successMessage);
  }

  async isSuccessVisible(): Promise<boolean> {
    return await this.isVisible(this.successMessage);
  }

  async getKycStatus(): Promise<string> {
    return await this.getText(this.kycStatus);
  }
}
