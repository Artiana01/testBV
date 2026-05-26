import { Page } from '@playwright/test';
import { BasePage } from '../common/BasePage';

export class ContractPage extends BasePage {
  // Locators
  readonly generatePdfButton = 'button:has-text("Générer PDF"), button:has-text("Générer")';
  readonly previewButton = 'button:has-text("Aperçu"), button:has-text("Prévisualisation")';
  readonly downloadButton = 'button:has-text("Télécharger"), a:has-text("Télécharger")';
  readonly sendSignatureButton = 'button:has-text("Signer"), button:has-text("Signature")';
  readonly signatureLink = 'a[href*="signature"], text=signature';
  readonly successMessage = '.success-message, .alert-success, text=succès';
  readonly pdfPreview = '[class*="pdf"], iframe[src*="pdf"]';
  readonly signatureInput = 'input[name*="signature"], canvas';
  readonly confirmSignatureButton = 'button:has-text("Confirmer"), button[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  async generatePdf() {
    await this.click(this.generatePdfButton);
    await this.page.waitForTimeout(2000);
  }

  async previewContract() {
    await this.click(this.previewButton);
    await this.page.waitForTimeout(2000);
  }

  async downloadContract() {
    await this.click(this.downloadButton);
    await this.page.waitForTimeout(2000);
  }

  async sendForSignature() {
    await this.click(this.sendSignatureButton);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successMessage);
  }

  async isSuccessVisible(): Promise<boolean> {
    return await this.isVisible(this.successMessage);
  }

  async isPdfPreviewVisible(): Promise<boolean> {
    return await this.isVisible(this.pdfPreview);
  }

  async signContract(signature: string) {
    await this.fill(this.signatureInput, signature);
    await this.click(this.confirmSignatureButton);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }
}
