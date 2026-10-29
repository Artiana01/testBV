import { Page, Response } from '@playwright/test';

/** Une panne transitoire du proxy ne doit pas devenir une attente de sélecteur absent. */
export async function gotoBuildNivo(page: Page, target: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response | null;
    try {
      response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    } catch (error) {
      const message = (error as Error).message;
      if (attempt === 0 && /net::ERR_(CONNECTION_RESET|CONNECTION_CLOSED|EMPTY_RESPONSE|TIMED_OUT)/.test(message)) {
        await page.waitForTimeout(1_000);
        continue;
      }
      if (!/interrupted by another navigation/i.test(message) || !/\/connexion/.test(message)) throw error;
      await page.waitForURL(/\/connexion/, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      return null;
    }
    const status = response?.status() ?? 200;
    if (![502, 503, 504].includes(status)) return response;
    if (attempt === 1) {
      throw new Error(`BuildNivo indisponible : HTTP ${status} sur ${new URL(page.url()).pathname} après deux tentatives.`);
    }
    await page.waitForTimeout(1_000);
  }
  return null;
}
