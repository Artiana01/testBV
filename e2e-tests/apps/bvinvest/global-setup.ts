/**
 * apps/bvinvest/global-setup.ts
 * --------------------------------
 * Exécuté UNE SEULE FOIS avant tous les tests BV Invest.
 *
 * But : se connecter en tant qu'admin et client,
 *       sauvegarder les sessions dans auth/admin.json et auth/client.json.
 *       Les tests réutilisent ces sessions via storageState.
 *
 * Sur Railway : si BVINVEST_ADMIN_SESSION est définie (base64 du admin.json),
 *   on l'écrit dans le fichier et on saute la validation navigateur.
 */

import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL      = process.env.BVINVEST_BASE_URL     ?? 'https://dev.bluevalorisinvest.com';
const ADMIN_EMAIL   = process.env.BVINVEST_ADMIN_EMAIL  ?? 'admin@bluevaloris.com';
const ADMIN_PASS    = process.env.BVINVEST_ADMIN_PASSWORD ?? 'Admin@2026!';
const CLIENT_EMAIL  = process.env.BVINVEST_CLIENT_EMAIL ?? '';
const CLIENT_PASS   = process.env.BVINVEST_CLIENT_PASSWORD ?? '';

const AUTH_DIR      = path.resolve(__dirname, 'auth');
const ADMIN_SESSION = path.join(AUTH_DIR, 'admin.json');
const CLIENT_SESSION = path.join(AUTH_DIR, 'client.json');

async function loginAndSave(
  context: Awaited<ReturnType<typeof chromium.newContext>>,
  email: string,
  password: string,
  sessionFile: string,
  label: string
): Promise<boolean> {
  const page = await context.newPage();

  try {
    console.log(`\n🔐  Connexion ${label} (${email})...`);
    await page.goto(`${BASE_URL}/fr/login`);
    await page.waitForLoadState('load');
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15_000 });

    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(
      (url) => !url.toString().includes('/login'),
      { timeout: 30_000 }
    );

    await context.storageState({ path: sessionFile });
    console.log(`   ✅  Session ${label} sauvegardée → ${path.basename(sessionFile)}`);
    await page.close();
    return true;

  } catch (err) {
    const url = page.url();
    console.warn(`   ⚠️  Connexion ${label} échouée (URL actuelle : ${url})`);

    const isRateLimit = await page
      .getByText(/too many|trop de|limit|rate/i)
      .isVisible()
      .catch(() => false);

    if (isRateLimit) {
      console.warn('   🚫  Rate limiting détecté. Attente 60s puis nouvel essai...');
      await page.waitForTimeout(60_000);

      try {
        await page.goto(`${BASE_URL}/fr/login`);
        await page.waitForLoadState('load');
        await page.locator('input[type="email"]').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(
          (url) => !url.toString().includes('/login'),
          { timeout: 30_000 }
        );
        await context.storageState({ path: sessionFile });
        console.log(`   ✅  Session ${label} sauvegardée (2e essai) → ${path.basename(sessionFile)}`);
        await page.close();
        return true;
      } catch {
        console.warn(`   ❌  Échec persistant pour ${label}. Session non sauvegardée.`);
      }
    }

    await page.close();
    return false;
  }
}

export default async function globalSetup(_config: FullConfig) {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // Sur Railway : charger la session admin depuis la variable d'environnement
  const adminSessionEnv = process.env.BVINVEST_ADMIN_SESSION;
  if (adminSessionEnv) {
    try {
      const decoded = Buffer.from(adminSessionEnv, 'base64').toString('utf-8');
      const sessionData = JSON.parse(decoded);
      fs.writeFileSync(ADMIN_SESSION, decoded, 'utf-8');

      const now = Date.now() / 1000;
      const cookies: Array<{ name?: string; expires?: number }> = sessionData.cookies ?? [];
      const jwtCookie = cookies.find((c) => c.name === 'token' || c.name === 'session_user');
      if (jwtCookie && jwtCookie.expires && jwtCookie.expires > 0 && jwtCookie.expires < now) {
        console.log('   ⚠️   JWT token expiré dans BVINVEST_ADMIN_SESSION. Renouveler la session.');
      } else {
        console.log('   📦  Session admin chargée depuis BVINVEST_ADMIN_SESSION (Railway). JWT valide.');
        console.log('   ✅  Lancement des tests...\n');
        return;
      }
    } catch {
      console.log('   ⚠️   BVINVEST_ADMIN_SESSION invalide — ignorée.');
    }
  }

  const browser = await chromium.launch({ headless: true });

  // === SESSION ADMIN ===
  {
    const ctx = await browser.newContext();
    await loginAndSave(ctx, ADMIN_EMAIL, ADMIN_PASS, ADMIN_SESSION, 'Admin');
    await ctx.close();
  }

  // === SESSION CLIENT ===
  if (CLIENT_EMAIL && CLIENT_PASS) {
    await new Promise((r) => setTimeout(r, 5_000));
    const ctx = await browser.newContext();
    await loginAndSave(ctx, CLIENT_EMAIL, CLIENT_PASS, CLIENT_SESSION, 'Client');
    await ctx.close();
  } else {
    console.log('\n   ℹ️   Pas de compte client configuré dans .env (BVINVEST_CLIENT_EMAIL/PASSWORD)');
    console.log('       → Les tests client seront ignorés ou en mode dégradé.');
  }

  await browser.close();
  console.log('\n🚀  Sessions prêtes. Lancement des tests BV Invest...\n');
}
