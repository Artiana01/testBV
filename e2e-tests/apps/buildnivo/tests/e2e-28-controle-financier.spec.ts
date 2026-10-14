/**
 * e2e-28-controle-financier.spec.ts
 * ---------------------------------
 * Module "Contrôle financier" (BuildNivo Finance) : espace de suivi d'un organisme financier (garant
 * d'achèvement, banque...) sans lui ouvrir le chantier.
 *   /controle              Synthèse de l'opération
 *   /controle/rapports     Rapports périodiques (brouillon IA → validé par le promoteur → publié/figé)
 *   /controle/justificatifs Justificatifs et historique
 *   /controle/acces        Accès financiers (côté promoteur : utilisateurs autorisés, blocs partagés)
 *
 * Les comptes "Contrôle financier" de la recette ne sont rattachés à aucun chantier (leur accueil est
 * "Aucun chantier créé") : les pages sont donc vérifiées côté promoteur (Direction), en lecture seule.
 * Les boutons "Suspendre" / "Révoquer l'accès" sont vérifiés présents mais JAMAIS cliqués.
 * Les refus d'accès à /controle/acces pour les autres rôles sont couverts par e2e-16-rbac.
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { openModuleAs, revisit } from '../pages/RoleSession';

const REPORT_SECTIONS = [
  'Résumé de la situation', 'Avancement physique', 'Comparaison avec le planning', 'Situation financière',
  'Cohérence entre avancement et dépenses', 'Coût prévisionnel à terminaison', 'Financement et trésorerie',
  'Commercialisation', 'Risques significatifs', 'Actions correctives', "Photographies d'avancement",
  'Principaux documents et justificatifs', 'Date de la prochaine mise à jour',
];

test.describe('BuildNivo — 28. Contrôle financier', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    ({ context, page } = await openModuleAs(browser, 'direction', '/controle'));
  });
  test.afterAll(async () => { await context?.close(); });

  test('CTRL-01 — Sidebar : les 4 entrées du Contrôle financier sont proposées', async () => {
    await revisit(page, '/dashboard');
    await expect(page.getByRole('link', { name: "Synthèse de l'opération" })).toHaveAttribute('href', '/controle');
    await expect(page.getByRole('link', { name: 'Rapports périodiques' })).toHaveAttribute('href', '/controle/rapports');
    await expect(page.getByRole('link', { name: 'Justificatifs & historique' })).toHaveAttribute('href', '/controle/justificatifs');
    await expect(page.getByRole('link', { name: 'Accès financiers' })).toHaveAttribute('href', '/controle/acces');
  });

  test('CTRL-02 — Synthèse de l\'opération : synthèse publiée, ou message explicite sans donnée approximative', async () => {
    await revisit(page, '/controle');
    await expect(page.getByRole('heading', { name: "Synthèse de l'opération", level: 1 })).toBeVisible({ timeout: 20_000 });
    // Soit une synthèse est rattachée, soit l'app l'indique — jamais de chiffres inventés.
    const empty = page.getByText('Aucune synthèse publiée pour cette opération');
    if (await empty.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(page.getByText(/aucune donnée approximative n'est affichée à la place/i)).toBeVisible();
    }
    await expect(page).not.toHaveURL(/\/connexion/);
  });

  test('CTRL-03 — Rapports périodiques : 13 rubriques standardisées, versions, statut Brouillon / Publié', async () => {
    await revisit(page, '/controle/rapports');
    await expect(page.getByRole('heading', { name: 'Rapports périodiques', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/préparé par l'IA, vérifié et validé par le promoteur avant publication/i)).toBeVisible();

    const versions = page.getByRole('button', { name: /v\d+\s*(Brouillon|Publié)/i });
    expect(await versions.count(), 'Au moins une version de rapport doit être listée').toBeGreaterThan(0);

    for (const section of REPORT_SECTIONS) {
      await expect(page.getByRole('heading', { name: section }), `Rubrique "${section}"`).toBeVisible();
    }
  });

  test('CTRL-04 — Rapports périodiques : un rapport publié est figé, un brouillon exige une vérification humaine', async () => {
    await revisit(page, '/controle/rapports');
    await expect(page.getByRole('heading', { name: 'Rapports périodiques', level: 1 })).toBeVisible({ timeout: 20_000 });

    const published = page.getByRole('button', { name: /Publié/ }).first();
    if (await published.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await published.click();
      await expect(page.getByText('Figé', { exact: false }).first()).toBeVisible();
      await expect(page.getByText(/publié le/i).first()).toBeVisible();
    }

    const draft = page.getByRole('button', { name: /Brouillon/ }).first();
    if (await draft.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await draft.click();
      await expect(page.getByText(/vérification humaine obligatoire avant publication/i)).toBeVisible();
    }
  });

  test('CTRL-05 — Justificatifs & historique : documents partagés, photos sélectionnées, rapports publiés, journal des accès', async () => {
    await revisit(page, '/controle/justificatifs');
    await expect(page.getByRole('heading', { name: 'Justificatifs et historique', level: 1 })).toBeVisible({ timeout: 20_000 });
    for (const section of ['Documents partagés', "Photographies d'avancement", 'Historique des rapports publiés', 'Journal des accès']) {
      await expect(page.getByRole('heading', { name: section }), `Section "${section}"`).toBeVisible();
    }
    await expect(page.getByText(/seules les pièces expressément partagées par le promoteur apparaissent ici/i)).toBeVisible();
    await expect(page.getByText(/les photographies brutes du chantier ne sont pas accessibles/i)).toBeVisible();
    await expect(page.getByText(/tout est journalisé/i)).toBeVisible();

    // "Voir tout" mène au journal complet.
    await page.getByRole('link', { name: 'Voir tout' }).click();
    await expect(page).toHaveURL(/\/controle\/acces$/, { timeout: 20_000 });
  });

  test('CTRL-06 — Accès financiers : organisme, utilisateurs autorisés, blocs optionnels, documents partagés, journal', async () => {
    await revisit(page, '/controle/acces');
    await expect(page.getByRole('heading', { name: 'Accès contrôle financier', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/ouvrez un accès de suivi à un organisme financier/i)).toBeVisible();
    await expect(page.getByText(/ne peuvent pas être masqués/i)).toBeVisible();

    await expect(page.getByText(/utilisateurs autorisés/i).first()).toBeVisible();
    await expect(page.getByText(/blocs optionnels/i).first()).toBeVisible();
    for (const bloc of ['Données de commercialisation', 'Données de trésorerie', 'Données du compte séquestre', 'Photographies sélectionnées']) {
      await expect(page.getByText(bloc, { exact: true })).toBeVisible();
    }
    await expect(page.getByText(/documents partagés/i).first()).toBeVisible();
    await expect(page.getByText(/les documents non cochés restent invisibles pour l'organisme/i)).toBeVisible();

    // Actions sensibles : présentes, jamais déclenchées.
    await expect(page.getByRole('button', { name: 'Suspendre' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: "Révoquer l'accès" }).first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Journal des accès' })).toBeVisible();
    for (const col of ['Date', 'Utilisateur', 'Action', 'Élément', 'Adresse IP']) {
      await expect(page.getByRole('columnheader', { name: col, exact: true }), `Colonne "${col}"`).toBeVisible();
    }
  });
});
