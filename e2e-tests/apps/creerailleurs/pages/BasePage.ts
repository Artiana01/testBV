import { Page } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'https://www.creerailleurs.com';
  }

  async goto(path: string = '') {
    await this.page.goto(path || this.baseURL);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('load');
  }

  getCurrentUrl(): string {
    return this.page.url();
  }
}
