/**
 * e2e-33-administration.spec.ts
 * -----------------------------
 * Console d'administration plateforme (Superadmin), hors "Journal d'audit" (couvert par
 * e2e-19-supervision-audit) :
 *   /admin/dashboard  Dashboard admin (métriques plateforme : clients, revenus, engagement, support)
 *   /admin/packages   Offres & tarification (catalogue des offres et fonctionnalités, synchro Stripe)
 *   /admin/rbac       Rôles & permissions (rôles, modules, matrice)
 *   /matrix           Matrice des permissions (référentiel RBAC partagé)
 *
 * Navigation par la sidebar : une URL ouverte directement est ramenée vers /dashboard par la garde de
 * navigation de l'app. Lecture seule : "Nouvelle offre" / "Nouveau rôle" sont ouverts puis annulés,
 * "Synchroniser vers Stripe" et la matrice (modification enregistrée immédiatement) ne sont jamais utilisés.
 * L'accès refusé pour les rôles non-Superadmin est vérifié en fin de fichier.
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { openModuleAs, revisit } from '../pages/RoleSession';
import { getRole } from '../roles';

async function openAdminPage(page: Page, link: RegExp | string, url: RegExp) {
  await page.getByRole('link', { name: link }).first().click();
  await expect(page).toHaveURL(url, { timeout: 20_000 });
}

test.describe('BuildNivo - 33. Administration plateforme (Superadmin)', () => {
  test.skip(!getRole('superadmin').login, 'SUPERADMIN_EMAIL/PASSWORD absents de apps/buildnivo/.env.');

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    ({ context, page } = await openModuleAs(browser, 'superadmin', '/chantiers'));
  });
  test.afterAll(async () => { await context?.close(); });

  test.beforeEach(async () => {
    await revisit(page, '/chantiers');
    await expect(page.getByRole('link', { name: 'Dashboard admin' })).toBeVisible({ timeout: 30_000 });
  });

  test('ADM-01 - Dashboard admin : métriques plateforme (clients, revenus, engagement, inscriptions, support)', async () => {
    await openAdminPage(page, 'Dashboard admin', /\/admin\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard admin', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Métriques plateforme')).toBeVisible();

    for (const kpi of ['Entreprises clientes', 'Utilisateurs', 'Chantiers']) {
      await expect(page.getByText(kpi, { exact: true }).first(), `Indicateur "${kpi}"`).toBeVisible();
    }
    for (const section of [
      'Engagement', 'Revenus', 'Revenus encaissés (30 derniers jours)', 'MRR par offre', 'Abonnements par offre',
      'Inscriptions (30 derniers jours)', "Top entreprises par nb d'utilisateurs", 'Répartition des rôles',
      "Funnel d'activation", 'Tickets support', 'Tickets par catégorie',
    ]) {
      await expect(page.getByRole('heading', { name: section, exact: true }), `Section "${section}"`).toBeVisible();
    }
  });

  test('ADM-02 - Offres & tarification : catalogue des offres (code, famille, nom, prix, statut)', async () => {
    await openAdminPage(page, /offres & tarification/i, /\/admin\/packages$/);
    await expect(page.getByRole('heading', { name: 'Offres & tarification', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/catalogue des offres vendues sur \/tarifs et de leurs fonctionnalités/i)).toBeVisible();

    for (const col of ['Code', 'Famille', 'Nom', 'Prix', 'Statut', 'Actions']) {
      await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();
    }
    // Offres commerciales de base : gratuit, essential, business, studio.
    for (const code of ['free', 'essential', 'business', 'studio']) {
      await expect(page.getByRole('cell', { name: code, exact: true }).first(), `Offre "${code}"`).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Modifier' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Synchroniser vers Stripe' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aperçu synchro' })).toBeVisible();
  });

  test('ADM-03 - Offres & tarification : onglet Fonctionnalités et formulaire "Nouvelle offre" (annulé)', async () => {
    await openAdminPage(page, /offres & tarification/i, /\/admin\/packages$/);
    await expect(page.getByRole('button', { name: 'Fonctionnalités' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Fonctionnalités' }).click();
    await expect(page.getByRole('button', { name: 'Nouvelle fonctionnalité' })).toBeVisible();
    for (const col of ['Code', 'Type', 'Libellé']) {
      await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();
    }
    // Chaque module de l'app est une fonctionnalité du catalogue.
    await expect(page.getByRole('cell', { name: 'Signalements d\'anomalie', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Achats & livraisons', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Offres', exact: true }).click();
    await page.getByRole('button', { name: 'Nouvelle offre' }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Nouvelle offre' });
    await expect(dialog).toBeVisible();
    for (const label of ['Code', 'Famille', 'Prix (€ / mois)', 'Nom (FR)', 'Nom (EN)']) {
      await expect(dialog.getByText(label, { exact: true }).first(), `Champ "${label}"`).toBeVisible();
    }
    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialog).toBeHidden();
  });

  test('ADM-04 - Rôles & permissions : rôles de la plateforme par famille, onglets Modules et Matrice', async () => {
    await openAdminPage(page, /rôles & permissions/i, /\/admin\/rbac$/);
    await expect(page.getByRole('heading', { name: 'Rôles & permissions', level: 1 })).toBeVisible({ timeout: 20_000 });

    for (const tab of ['Rôles', 'Modules', 'Matrice']) {
      await expect(page.getByRole('button', { name: tab, exact: true }), `Onglet "${tab}"`).toBeVisible();
    }
    for (const col of ['Code', 'Libellé', 'Famille']) {
      await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();
    }
    // Rôles métier du cahier de recette présents dans le référentiel.
    for (const code of ['direction', 'conducteur', 'chef', 'ouvrier', 'soustraitant', 'moa', 'financier', 'superadmin', 'responsable_reprise']) {
      await expect(page.getByRole('cell', { name: code, exact: true }).first(), `Rôle "${code}"`).toBeVisible();
    }
    for (const family of ['INTERNE', 'EXTERNE', 'FINANCIER']) {
      await expect(page.getByRole('cell', { name: new RegExp(`^${family}$`, 'i') }).first(), `Famille "${family}"`).toBeVisible();
    }

    await page.getByRole('button', { name: 'Matrice', exact: true }).click();
    await expect(page.getByText(/niveau d'accès de chaque rôle sur chaque module/i)).toBeVisible();
    await expect(page.getByText(/modification enregistrée immédiatement/i)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Direction', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Conducteur de travaux', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Modules', exact: true }).click();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('ADM-05 - Rôles & permissions : formulaire "Nouveau rôle" (code, libellé, famille) ; annulation sans création', async () => {
    await openAdminPage(page, /rôles & permissions/i, /\/admin\/rbac$/);
    await page.getByRole('button', { name: 'Nouveau rôle' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: 'Nouveau rôle' });
    await expect(dialog).toBeVisible();
    for (const label of ['Code', 'Libellé', 'Famille']) await expect(dialog.getByText(label, { exact: true }).first()).toBeVisible();
    await expect(dialog.getByText(/identifiant technique, non modifiable après création/i)).toBeVisible();
    await expect(dialog.getByPlaceholder('ex : commercial')).toBeVisible();
    for (const family of ['Interne', 'Externe', 'Financier']) await expect(dialog.locator('option', { hasText: family })).toHaveCount(1);

    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialog).toBeHidden();
  });

  test('ADM-06 - Matrice des permissions : référentiel RBAC partagé rôle × module', async () => {
    await openAdminPage(page, /matrice des permissions/i, /\/matrix$/);
    await expect(page.getByRole('heading', { name: 'Matrice des permissions', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/référentiel rbac partagé de la plateforme/i)).toBeVisible();
    await expect(page.getByText(/role_module_permissions/)).toBeVisible();
  });
});

// Accès négatif : ces pages sont réservées au Superadmin. NB : la garde d'autorisation des routes /admin/*
// peut s'exécuter après un premier rendu (voir e2e-19-supervision-audit) - on attend donc la redirection
// finale plutôt que de juger le premier affichage.
test.describe('BuildNivo - 33. Administration plateforme : accès refusé hors Superadmin', () => {
  for (const route of ['/admin/dashboard', '/admin/packages', '/admin/rbac']) {
    test(`ADM-07 - Direction : ${route} refusé (redirigé hors de l'administration)`, async ({ browser }) => {
      const { context, page } = await openModuleAs(browser, 'direction', route, { projectScoped: false });
      await expect(page).not.toHaveURL(new RegExp(`${route}$`), { timeout: 30_000 });
      await expect(page.getByRole('heading', { name: /dashboard admin|offres & tarification|rôles & permissions/i, level: 1 })).toHaveCount(0);
      await context.close();
    });
  }

  test('ADM-08 - Direction : la sidebar ne propose pas la section "Administration"', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'direction', '/dashboard');
    await expect(page.getByRole('link', { name: 'Reprise de chantier' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Administration', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Dashboard admin' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /offres & tarification/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /rôles & permissions/i })).toHaveCount(0);
    await context.close();
  });
});
