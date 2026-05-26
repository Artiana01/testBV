/**
 * shared/login-helper.ts
 * ──────────────────────
 * Helper partagé pour tous les global-setups.
 *
 * Logique :
 *   1. Si le fichier de session existe et a moins de SESSION_MAX_AGE_H heures → on le réutilise
 *   2. Sinon → on tente le login avec retry automatique
 *   3. En cas d'échec → screenshot de debug sauvegardé dans debug/
 */

import { chromium } from '@playwright/test';
import * as fs   from 'fs';
import * as path from 'path';

// Durée de validité d'une session en cache (heures)
const SESSION_MAX_AGE_H = 4;

// ── Vérifie si le fichier de session est récent ────────────────────────────────
export function isSessionFresh(sessionFile: string): boolean {
  if (!fs.existsSync(sessionFile)) return false;
  try {
    const stat = fs.statSync(sessionFile);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageH  = ageMs / (1000 * 60 * 60);
    return ageH < SESSION_MAX_AGE_H;
  } catch {
    return false;
  }
}

// ── Tente le login et sauvegarde la session ────────────────────────────────────
export async function loginAndSave(opts: {
  email:       string;
  password:    string;
  loginUrl:    string;               // ex: 'https://app.example.com/fr/connexion'
  sessionFile: string;
  label:       string;
  debugDir?:   string;               // dossier pour les screenshots de debug
  skipUrls?:   string[];             // NON utilisé pour la détection de succès (gardé pour rétrocompat)
}): Promise<boolean> {
  const {
    email, password, loginUrl, sessionFile, label,
    debugDir = path.join(process.cwd(), 'debug-screenshots'),
  } = opts;

  if (!email || !password) {
    console.log(`   ℹ️   Credentials ${label} non configurés — session ignorée`);
    return false;
  }

  // ── Réutiliser la session si elle est fraîche ──────────────────────────────
  if (isSessionFresh(sessionFile)) {
    const ageMin = Math.round((Date.now() - fs.statSync(sessionFile).mtimeMs) / 60_000);
    console.log(`   ♻️   Session ${label} réutilisée (sauvegardée il y a ${ageMin} min)`);
    return true;
  }

  // ── Tenter le login (2 essais max) ────────────────────────────────────────
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext();
  const page    = await ctx.newPage();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`\n🔐  Connexion ${label} (${email})${attempt > 1 ? ` — essai ${attempt}` : ''}...`);

      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });

      // Capturer l'URL réelle après les redirects (ex: /fr/login → /fr/connexion)
      // C'est cette URL qui sert de référence pour détecter le succès du login
      const actualLoginUrl = page.url();

      // Rejeter les bandeaux cookies (RGPD) qui peuvent bloquer les formulaires
      const cookieDismiss = page.locator([
        'button:has-text("Accepter")',      'button:has-text("Tout accepter")',
        'button:has-text("Accept")',        'button:has-text("Accept all")',
        'button:has-text("Refuser")',       'button:has-text("Reject")',
        'button[id*="accept"]',             'button[id*="cookie"]',
        '#didomi-notice-agree-button',      '#tarteaucitronPersonalize2',
        '.cc-btn.cc-dismiss',
      ].join(', ')).first();
      if (await cookieDismiss.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await cookieDismiss.click().catch(() => {});
        await page.waitForTimeout(400);
      }

      // ── Email : sélecteurs larges (type, name, id, placeholder avec "@", label) ──
      const emailSel = [
        'input[type="email"]',
        'input[name="email"]',
        'input[id*="email" i]',
        'input[placeholder*="email" i]',
        'input[placeholder*="@"]',           // ex: "johndoe@gmail.com"
        'input[autocomplete="email"]',
        'input[autocomplete="username"]',
      ].join(', ');
      const emailInput = page.locator(emailSel).first();
      await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
      await emailInput.click();
      await emailInput.fill(email);
      // Vérifier que le fill a bien fonctionné (React peut ignorer fill sans events)
      const filledEmail = await emailInput.inputValue().catch(() => '');
      if (filledEmail !== email) {
        await emailInput.clear();
        await emailInput.pressSequentially(email, { delay: 30 });
      }

      // ── Password ──────────────────────────────────────────────────────────────
      const pwSel = [
        'input[type="password"]',
        'input[name="password"]',
        'input[id*="password" i]',
        'input[autocomplete="current-password"]',
      ].join(', ');
      const pwInput = page.locator(pwSel).first();
      await pwInput.click();
      await pwInput.fill(password);
      const filledPw = await pwInput.inputValue().catch(() => '');
      if (filledPw !== password) {
        await pwInput.clear();
        await pwInput.pressSequentially(password, { delay: 30 });
      }

      // ── Submit : type=submit → texte connu → Enter ───────────────────────────
      const submitByType = page.locator('button[type="submit"]').first();
      const submitByText = page.locator([
        'button:has-text("Continuer avec mon adresse e-mail")',
        'button:has-text("Se connecter")',
        'button:has-text("CONNEXION")',
        'button:has-text("Connexion")',
        'button:has-text("Login")',
        'button:has-text("Sign in")',
        'button:has-text("Continuer")',
        'input[type="submit"]',
      ].join(', ')).first();

      if (await submitByType.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await submitByType.click();
      } else if (await submitByText.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await submitByText.click();
      } else {
        await page.keyboard.press('Enter');
      }

      // ── Succès = URL différente de la page de login initiale ─────────────────
      // On ne liste pas de mots-clés — on compare directement avec l'URL de départ.
      await page.waitForURL(
        u => {
          const current = u.toString();
          return current !== actualLoginUrl && current !== loginUrl;
        },
        { timeout: 60_000 }
      );

      await ctx.storageState({ path: sessionFile });
      console.log(`   ✅  Session ${label} sauvegardée → ${path.basename(sessionFile)}`);
      await browser.close();
      return true;

    } catch {
      const currentUrl = page.url();
      console.warn(`   ⚠️   Connexion ${label} échouée (URL: ${currentUrl})`);

      // Sauvegarder un screenshot pour debug
      try {
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
        const screenshotPath = path.join(
          debugDir,
          `login-fail-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}-attempt${attempt}-${Date.now()}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`   📸  Screenshot → ${screenshotPath}`);
      } catch (_) {}

      // Détecter rate limiting
      const isRateLimit = await page.getByText(/too many|trop de|rate limit|limite/i)
        .isVisible({ timeout: 2_000 }).catch(() => false);

      if (isRateLimit && attempt < 2) {
        console.warn('   🚫  Rate limiting détecté — pause 90s avant 2e essai...');
        await page.waitForTimeout(90_000);
      } else if (attempt < 2) {
        await page.waitForTimeout(5_000);
      }
    }
  }

  await browser.close();
  console.warn(`   ❌  Session ${label} non sauvegardée après 2 essais.`);
  return false;
}

// ── Utilitaire : s'assurer que le dossier auth existe ─────────────────────────
export function ensureAuthDir(authDir: string): void {
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
}
