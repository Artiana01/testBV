/**
 * apps/buildnivo/pages/RoleSession.ts
 * --------------------------------------
 * Ouvre un module BuildNivo avec la session d'un rôle précis (pas Direction).
 * AppShellPage.gotoModule() se reconnecte en Direction quand la session expire -
 * inacceptable pour un test qui doit s'exécuter avec les droits d'un autre rôle
 * (il changerait silencieusement de rôle). Ici la reconnexion se fait avec le
 * compte du rôle demandé, et la session rafraîchie est réécrite pour les tests
 * suivants.
 */

import { Browser, BrowserContext, Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getRole } from '../roles';
import { LoginPage } from './LoginPage';
import { AppShellPage } from './AppShellPage';
import { gotoBuildNivo } from './navigation';

const AUTH_DIR = path.resolve(__dirname, '../auth');

export interface RoleModule {
  context: BrowserContext;
  page: Page;
  shell: AppShellPage;
}

export async function openModuleAs(
  browser: Browser, roleKey: string, modulePath: string,
  options: { projectScoped?: boolean } = {},
): Promise<RoleModule> {
  const role = getRole(roleKey);
  const sessionFile = path.join(AUTH_DIR, role.session);
  const context = await browser.newContext(fs.existsSync(sessionFile) ? { storageState: sessionFile } : {});
  const page = await context.newPage();
  const shell = new AppShellPage(page);

  await gotoBuildNivo(page, '/chantiers');
  // Sous charge, la redirection d'une session expirée peut dépasser huit secondes.
  // Vérifier la session depuis le navigateur plutôt que déduire sa validité de l'URL.
  // Le client HTTP Playwright n'envoie pas les en-têtes d'origine requis par Sanctum.
  const readSessionStatus = () => page.evaluate(async () => (
    await fetch('/api/auth/me', {
      credentials: 'same-origin', headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
  ).status).catch(() => 0);
  let sessionStatus = 0;
  await expect.poll(async () => {
    sessionStatus = await readSessionStatus();
    return sessionStatus >= 500 ? 0 : sessionStatus;
  }, { message: `État de la session ${roleKey}`, timeout: 45_000 })
    .toBeGreaterThan(0);
  expect([200, 401], `Réponse de /api/auth/me pour ${roleKey} : HTTP ${sessionStatus}`)
    .toContain(sessionStatus);
  if (sessionStatus === 401 || page.url().includes('/connexion')) {
    // Un cookie bn_auth périmé peut encore faire rediriger /connexion côté client.
    // Retirer ces cookies avant de demander une vraie connexion du rôle attendu.
    await context.clearCookies();
    const login = new LoginPage(page);
    await login.login(role.login, role.password);
    await login.verifyLoginSuccessWithRetry(role.login, role.password);
    await expect.poll(readSessionStatus, { message: `Session authentifiée du rôle ${roleKey}`, timeout: 45_000 })
      .toBe(200);
    await context.storageState({ path: sessionFile });
    if (new URL(page.url()).pathname !== '/chantiers') {
      await gotoBuildNivo(page, '/chantiers');
    }
  }

  await shell.dismissOnboardingTour();
  await shell.waitForSkeletonToClear();
  if (options.projectScoped !== false) {
    await shell.waitForChantierContext();
    await shell.ensureDemoChantierSelected(false);
  }
  await shell.navigateWithinApp(modulePath);
  return { context, page, shell };
}

/**
 * Recharge un module avec la session déjà ouverte par openModuleAs (même rôle, même contexte) :
 * permet à plusieurs tests d'un fichier de partager un contexte (une seule connexion) tout en
 * repartant d'une page propre - aucune modale ouverte par un test précédent ne survit au rechargement.
 */
export async function revisit(page: Page, modulePath: string): Promise<void> {
  const shell = new AppShellPage(page);
  // Un aller-retour dans l'interface remonte une page propre sans perdre le chantier.
  await shell.navigateWithinApp('/chantiers');
  await shell.ensureDemoChantierSelected(false);
  await shell.navigateWithinApp(modulePath);
  await shell.dismissOnboardingTour();
  await shell.waitForSkeletonToClear();
}

/** Date locale (AAAA-MM-JJ) à J+n - les champs date de l'app refusent le passé (min = aujourd'hui). */
export function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
