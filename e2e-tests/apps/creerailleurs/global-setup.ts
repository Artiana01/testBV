/**
 * apps/creerailleurs/global-setup.ts
 * ------------------------------------
 * Exécuté UNE SEULE FOIS avant tous les tests Créer Ailleurs.
 * Utilise le helper partagé : session réutilisée si < 4h, sinon reconnexion.
 */

import { FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { loginAndSave, ensureAuthDir, isSessionFresh } from '../../shared/login-helper';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL     = process.env.BASE_URL      ?? 'https://dev.creerailleurs.com';
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL   ?? 'webmaster@bluevaloris.com';
const ADMIN_PASS   = process.env.ADMIN_PASSWORD ?? '123456789Ca!';
const CLIENT_EMAIL = process.env.TEST_EMAIL    ?? '';
const CLIENT_PASS  = process.env.TEST_PASSWORD ?? '';

const AUTH_DIR       = path.resolve(__dirname, 'auth');
const ADMIN_SESSION  = path.join(AUTH_DIR, 'admin.json');
const CLIENT_SESSION = path.join(AUTH_DIR, 'client.json');
const LOGIN_URL      = `${BASE_URL}/fr/login`;

export default async function globalSetup(_config: FullConfig) {
  ensureAuthDir(AUTH_DIR);

  // === SESSION ADMIN ===
  await loginAndSave({
    email:       ADMIN_EMAIL,
    password:    ADMIN_PASS,
    loginUrl:    LOGIN_URL,
    sessionFile: ADMIN_SESSION,
    label:       'CreerAilleurs-Admin',
    skipUrls:    ['/connexion', '/login', '/signin'],
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
      label:       'CreerAilleurs-Client',
      skipUrls:    ['/connexion', '/login', '/signin'],
    });
  } else {
    console.log('\n   ℹ️   Pas de compte client configuré dans .env (TEST_EMAIL/TEST_PASSWORD)');
  }

  // Playwright crashe si storageState pointe vers un fichier inexistant.
  // Créer un placeholder vide pour la session client si le login a échoué.
  if (!fs.existsSync(CLIENT_SESSION)) {
    fs.writeFileSync(CLIENT_SESSION, JSON.stringify({ cookies: [], origins: [] }), 'utf-8');
    console.log('   ⚠️   Placeholder client.json créé (session invalide — tests SC-05/SC-07 non authentifiés)');
  }

  console.log('\n🚀  Sessions prêtes. Lancement des tests Créer Ailleurs...\n');
}
