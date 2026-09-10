/**
 * apps/buildnivo/global-setup.ts
 * --------------------------------
 * Exécuté UNE SEULE FOIS avant tous les tests BuildNivo.
 * Connecte les 13 comptes de démonstration (un par rôle métier du cahier de
 * recette) et sauvegarde leur session dans auth/<role>.json — réutilisée
 * ensuite par les tests via storageState (voir playwright.buildnivo.config.ts).
 */

import { FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { loginAndSave, ensureAuthDir } from '../../shared/login-helper';
import { getRoles } from './roles';

// override:true — voir la note dans playwright.buildnivo.config.ts : BASE_URL est un nom
// de variable partagé entre toutes les apps du repo, dotenv ne l'écrase pas par défaut.
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const BASE_URL  = process.env.BASE_URL ?? 'https://dev.buildnivo.com';
const LOGIN_URL = `${BASE_URL}/connexion`;
const AUTH_DIR  = path.resolve(__dirname, 'auth');

// Cache négatif : certains comptes du cahier de recette échouent systématiquement
// (identifiants refusés — non provisionnés dans cet environnement, voir
// e2e-02-roles-login.spec.ts). Sans ça, chaque lancement perd ~5-8 min à retenter
// 2 fois chacun de ces logins avec leurs timeouts complets avant de démarrer les tests.
const FAILED_LOGIN_CACHE_MIN = 30;

function failedMarkerPath(session: string): string {
  return path.join(AUTH_DIR, `${session}.failed`);
}

function recentlyFailed(session: string): boolean {
  const p = failedMarkerPath(session);
  if (!fs.existsSync(p)) return false;
  const ageMin = (Date.now() - fs.statSync(p).mtimeMs) / 60_000;
  return ageMin < FAILED_LOGIN_CACHE_MIN;
}

export default async function globalSetup(_config: FullConfig) {
  ensureAuthDir(AUTH_DIR);

  const roles = getRoles();
  for (const role of roles) {
    const sessionFile = path.join(AUTH_DIR, role.session);

    if (recentlyFailed(role.session)) {
      console.log(`   ⏭️   Session BuildNivo-${role.label} — échec récent (< ${FAILED_LOGIN_CACHE_MIN}min), pas de nouvelle tentative`);
      continue;
    }

    const ok = await loginAndSave({
      email:       role.login,
      password:    role.password,
      loginUrl:    LOGIN_URL,
      sessionFile,
      label:       `BuildNivo-${role.label}`,
      skipUrls:    ['/connexion'],
    });

    const marker = failedMarkerPath(role.session);
    if (ok) {
      fs.rmSync(marker, { force: true });
    } else {
      fs.writeFileSync(marker, new Date().toISOString());
    }

    // Petite pause entre chaque connexion pour ne pas déclencher le throttle (AUTH-06)
    await new Promise(r => setTimeout(r, 1_500));
  }

  console.log('\n🚀  Sessions BuildNivo prêtes. Lancement des tests...\n');
}
