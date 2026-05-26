import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'https://dev.bluevalorisportage.com';
  }

  async goto(path: string = '') {
    const normalized = path && !path.startsWith('/fr/') && !path.startsWith('http')
      ? `/fr${path}`
      : path;
    await this.page.goto(`${this.baseURL}${normalized}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  }

  async waitForLoad(selector?: string) {
    if (selector) {
      await this.page.waitForSelector(selector, { timeout: 60_000 });
    } else {
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  async click(selector: string) {
    await this.page.click(selector);
  }

  async fill(selector: string, text: string) {
    await this.page.fill(selector, text);
  }

  async getText(selector: string): Promise<string> {
    return await this.page.textContent(selector) || '';
  }

  async isVisible(selector: string, timeout = 8_000): Promise<boolean> {
    return await this.page.locator(selector).first().isVisible({ timeout }).catch(() => false);
  }

  async waitForSelector(selector: string, timeout: number = 60000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `./screenshots/${name}.png`, fullPage: true });
  }

  async getUrl(): Promise<string> {
    return this.page.url();
  }
}
