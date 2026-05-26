import { Page } from '@playwright/test';
import { BasePage } from '../common/BasePage';

export class OtpPage extends BasePage {
  // Locators
  readonly otpInputs = 'input[inputmode="numeric"]';
  readonly otpInput1 = 'input[name*="otp"], input[placeholder*="1"]';
  readonly otpSubmitButton = 'button[type="submit"]:has-text("Valider")';
  readonly otpErrorMessage = '.error-message, .alert-danger';
  readonly otpSuccessMessage = '.success-message';
  readonly resendButton = 'button:has-text("Renvoyer")';

  constructor(page: Page) {
    super(page);
  }

  async enterOtp(otp: string) {
    const digits = otp.split('');
    const inputs = await this.page.$$eval(this.otpInputs, (elements) => elements.length);
    
    for (let i = 0; i < Math.min(digits.length, inputs); i++) {
      const locator = this.page.locator(`${this.otpInputs}`).nth(i);
      await locator.fill(digits[i]);
    }
  }

  async submitOtp() {
    await this.click(this.otpSubmitButton);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.otpErrorMessage);
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.isVisible(this.otpErrorMessage);
  }

  async isSuccessVisible(): Promise<boolean> {
    return await this.isVisible(this.otpSuccessMessage);
  }

  async resendOtp() {
    await this.click(this.resendButton);
  }
}
