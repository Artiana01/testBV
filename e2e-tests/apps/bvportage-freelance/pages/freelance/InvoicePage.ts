import { Page } from '@playwright/test';
import { BasePage } from '../common/BasePage';

export class InvoicePage extends BasePage {
  // Locators
  readonly invoiceList = '[class*="invoice"], table';
  readonly generateInvoiceButton = 'button:has-text("Générer"), button:has-text("Créer facture")';
  readonly selectMissionDropdown = 'select, [role="combobox"]';
  readonly missionOption = 'option, [role="option"]';
  readonly invoiceButton = 'button[type="submit"]:has-text("Facture")';
  readonly successMessage = '.success-message, .alert-success, text=succès';
  readonly invoiceLink = 'a[href*="invoice"], text=lien paiement';
  readonly downloadInvoiceButton = 'button:has-text("Télécharger")';
  readonly paymentStatusPaid = 'text=Payé';
  readonly viewInvoiceButton = 'button:has-text("Voir"), a:has-text("Voir")';
  readonly sendInvoiceButton = 'button:has-text("Envoyer"), button:has-text("Message")';

  constructor(page: Page) {
    super(page);
  }

  async selectMissionForInvoice(missionTitle: string) {
    await this.click(this.selectMissionDropdown);
    await this.click(`text="${missionTitle}"`);
  }

  async generateInvoice() {
    await this.click(this.generateInvoiceButton);
    await this.page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  }

  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successMessage);
  }

  async isSuccessVisible(): Promise<boolean> {
    return await this.isVisible(this.successMessage);
  }

  async getInvoiceLink(): Promise<string | null> {
    return await this.page.getAttribute(this.invoiceLink, 'href');
  }

  async downloadInvoice() {
    await this.click(this.downloadInvoiceButton);
    await this.page.waitForTimeout(2000);
  }

  async isPaid(): Promise<boolean> {
    return await this.isVisible(this.paymentStatusPaid);
  }

  async viewInvoice() {
    await this.click(this.viewInvoiceButton);
  }

  async sendInvoiceToClient() {
    await this.click(this.sendInvoiceButton);
    await this.page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  }
}
