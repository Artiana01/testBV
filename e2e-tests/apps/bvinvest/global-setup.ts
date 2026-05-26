/**
 * apps/bvinvest/global-setup.ts
 * --------------------------------
 * Exécuté UNE SEULE FOIS avant tous les tests BV Invest.
 * Utilise le helper partagé : session réutilisée si < 4h, sinon reconnexion.
 *
 * Sur Railway : si BVINVEST_ADMIN_SESSION est définie (base64 du admin.json),
 *   on l'écrit dans le fichier et on saute la validation navigateur.
 */

import { FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { loginAndSave, ensureAuthDir, isSessionFresh } from '../../shared/login-helper';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL     = process.env.BVINVEST_BASE_URL       ?? 'https://dev.bluevalorisinvest.com';
const ADMIN_EMAIL  = process.env.BVINVEST_ADMIN_EMAIL    ?? 'admin@bluevaloris.com';
const ADMIN_PASS   = process.env.BVINVEST_ADMIN_PASSWORD ?? 'Admin@2026!';
const CLIENT_EMAIL = process.env.BVINVEST_CLIENT_EMAIL   ?? '';
const CLIENT_PASS  = process.env.BVINVEST_CLIENT_PASSWORD ?? '';

const AUTH_DIR       = path.resolve(__dirname, 'auth');
const ADMIN_SESSION  = path.join(AUTH_DIR, 'admin.json');
const CLIENT_SESSION = path.join(AUTH_DIR, 'client.json');
const LOGIN_URL      = `${BASE_URL}/fr/connexion`;

export default async function globalSetup(_config: FullConfig) {
  ensureAuthDir(AUTH_DIR);

  // Railway : charger la session admin depuis la variable d'environnement
  const adminSessionEnv = process.env.BVINVEST_ADMIN_SESSION;
  if (adminSessionEnv) {
    try {
      const decoded = Buffer.from(adminSessionEnv, 'base64').toString('utf-8');
      const sessionData = JSON.parse(decoded);
      fs.writeFileSync(ADMIN_SESSION, decoded, 'utf-8');

      const now = Date.now() / 1000;
      const cookies: Array<{ name?: string; expires?: number }> = sessionData.cookies ?? [];
      const jwtCookie = cookies.find(c => c.name === 'token' || c.name === 'session_user');
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

  // === SESSION ADMIN ===
  await loginAndSave({
    email:       ADMIN_EMAIL,
    password:    ADMIN_PASS,
    loginUrl:    LOGIN_URL,
    sessionFile: ADMIN_SESSION,
    label:       'BVInvest-Admin',
    skipUrls:    ['/login', '/connexion', '/signin'],
  });

  // === SESSION CLIENT ===
  if (CLIENT_EMAIL && CLIENT_PASS) {
    if (!isSessionFresh(CLIENT_SESSION)) {
      await new Promise(r => setTimeout(r, 3_000));
    }
    await loginAndSave({
      email:       CLIENT_EMAIL,
      password:    CLIENT_PASS,
      loginUrl:    LOGIN_URL,
      sessionFile: CLIENT_SESSION,
      label:       'BVInvest-Client',
      skipUrls:    ['/login', '/connexion', '/signin'],
    });
  } else {
    console.log('\n   ℹ️   Pas de compte client configuré dans .env (BVINVEST_CLIENT_EMAIL/PASSWORD)');
  }

  console.log('\n🚀  Sessions prêtes. Lancement des tests BV Invest...\n');
}
