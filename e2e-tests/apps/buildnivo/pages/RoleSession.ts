/**
 * apps/buildnivo/pages/RoleSession.ts
 * --------------------------------------
 * Ouvre un module BuildNivo avec la session d'un rôle précis (pas Direction).
 * AppShellPage.gotoModule() se reconnecte en Direction quand la session expire —
 * inacceptable pour un test qui doit s'exécuter avec les droits d'un autre rôle
 * (il changerait silencieusement de rôle). Ici la reconnexion se fait avec le
 * compte du rôle demandé, et la session rafraîchie est réécrite pour les tests
 * suivants.
 */

import { Browser, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getRole } from '../roles';
import { LoginPage } from './LoginPage';
import { AppShellPage } from './AppShellPage';

const AUTH_DIR = path.resolve(__dirname, '../auth');

export interface RoleModule {
  context: BrowserContext;
  page: Page;
  shell: AppShellPage;
}

export async function openModuleAs(browser: Browser, roleKey: string, modulePath: string): Promise<RoleModule> {
  const role = getRole(roleKey);
  const sessionFile = path.join(AUTH_DIR, role.session);
  const context = await browser.newContext(fs.existsSync(sessionFile) ? { storageState: sessionFile } : {});
  const page = await context.newPage();
  const shell = new AppShellPage(page);

  await page.goto(modulePath, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => {});
  // La redirection vers /connexion d'une session expirée arrive côté client, après
  // l'appel /api/auth/me — pas encore visible juste après domcontentloaded.
  await page.waitForURL(/\/connexion/, { timeout: 8_000 }).catch(() => {});
  if (page.url().includes('/connexion')) {
    const login = new LoginPage(page);
    await login.login(role.login, role.password);
    await login.verifyLoginSuccessWithRetry(role.login, role.password);
    await context.storageState({ path: sessionFile });
    await page.goto(modulePath, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  }

  await shell.dismissOnboardingTour();
  await shell.waitForSkeletonToClear();
  await shell.ensureDemoChantierSelected();
  await shell.watchForOnboardingTour();
  return { context, page, shell };
}

/** Date locale (AAAA-MM-JJ) à J+n — les champs date de l'app refusent le passé (min = aujourd'hui). */
export function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
