/**
 * global-setup.ts — Créer Ailleurs
 * Connexion admin + client avant les tests, sessions sauvegardées dans auth/.
 */
import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL       = process.env.BASE_URL      ?? 'https://www.creerailleurs.com';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL   ?? '';
const ADMIN_PASS     = process.env.ADMIN_PASSWORD ?? '';
const CLIENT_EMAIL   = process.env.TEST_EMAIL    ?? '';
const CLIENT_PASS    = process.env.TEST_PASSWORD  ?? '';

const AUTH_DIR = path.resolve(__dirname, 'auth');

async function loginAndSave(
  context: Awaited<ReturnType<typeof chromium.newContext>>,
  email: string,
  password: string,
  sessionFile: string,
  label: string
): Promise<boolean> {
  if (!email || !password) {
    console.log(`   ℹ️  Credentials ${label} non configurés — session ignorée`);
    return false;
  }

  const page = await context.newPage();
  try {
    console.log(`\n🔐  Connexion ${label} (${email})...`);

    // Tenter /connexion (FR) puis /login en fallback
    await page.goto(`${BASE_URL}/connexion`);
    await page.waitForLoadState('load');

    // Si on est redirigé vers une page sans formulaire, essayer /login
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const visible = await emailInput.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!visible) {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('load');
    }
    await emailInput.waitFor({ state: 'visible', timeout: 15_000 });

    await emailInput.fill(email);
    await page.locator('input[type="password"], input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(
      url => !url.toString().includes('/connexion') && !url.toString().includes('/login'),
      { timeout: 30_000 }
    );
    await context.storageState({ path: sessionFile });
    console.log(`   ✅  Session ${label} sauvegardée → ${path.basename(sessionFile)}`);
    await page.close();
    return true;
  } catch (err) {
    console.warn(`   ⚠️  Connexion ${label} échouée (URL: ${page.url()})`);
    await page.close();
    return false;
  }
}

export default async function globalSetup(_config: FullConfig) {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // Session admin
  {
    const ctx = await browser.newContext();
    await loginAndSave(ctx, ADMIN_EMAIL, ADMIN_PASS, path.join(AUTH_DIR, 'admin.json'), 'Admin');
    await ctx.close();
  }

  // Session client (pause entre les deux logins)
  await new Promise(r => setTimeout(r, 3_000));
  {
    const ctx = await browser.newContext();
    await loginAndSave(ctx, CLIENT_EMAIL, CLIENT_PASS, path.join(AUTH_DIR, 'client.json'), 'Client');
    await ctx.close();
  }

  await browser.close();
  console.log('\n🚀  Sessions prêtes. Lancement des tests...\n');
}
