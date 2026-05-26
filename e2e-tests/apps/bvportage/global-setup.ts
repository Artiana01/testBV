/**
 * apps/bvportage/global-setup.ts
 * --------------------------------
 * Exécuté UNE SEULE FOIS avant tous les tests BV Portage.
 * Utilise le helper partagé : session réutilisée si < 4h, sinon reconnexion.
 */

import { FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { loginAndSave, ensureAuthDir, isSessionFresh } from '../../shared/login-helper';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL       = process.env.BASE_URL        ?? 'https://dev.bluevalorisportage.com';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL      ?? '';
const ADMIN_PASS     = process.env.ADMIN_PASSWORD   ?? '';
const CLIENT_EMAIL   = process.env.CLIENT_EMAIL     ?? '';
const CLIENT_PASS    = process.env.CLIENT_PASSWORD  ?? '';

const AUTH_DIR       = path.resolve(__dirname, 'auth');
const ADMIN_SESSION  = path.join(AUTH_DIR, 'admin.json');
const CLIENT_SESSION = path.join(AUTH_DIR, 'client.json');
const LOGIN_URL      = `${BASE_URL}/fr/connexion`;

export default async function globalSetup(_config: FullConfig) {
  ensureAuthDir(AUTH_DIR);

  // === SESSION ADMIN ===
  await loginAndSave({
    email:       ADMIN_EMAIL,
    password:    ADMIN_PASS,
    loginUrl:    LOGIN_URL,
    sessionFile: ADMIN_SESSION,
    label:       'BVPortage-Admin',
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
      label:       'BVPortage-Client',
      skipUrls:    ['/login', '/connexion', '/signin'],
    });
  } else {
    console.log('\n   ℹ️   Pas de compte client configuré dans .env (CLIENT_EMAIL/CLIENT_PASSWORD)');
  }

  console.log('\n🚀  Sessions prêtes. Lancement des tests BV Portage...\n');
}
