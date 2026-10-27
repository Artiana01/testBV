/**
 * e2e-21-reprise-guide.spec.ts
 * ----------------------------
 * BUILDNIVO-304 - Guide pratique de la Reprise de chantier après création.
 */

import { test, expect, Page } from '@playwright/test';
import { ChantiersPage } from '../pages/ChantiersPage';

/**
 * Le serveur de recette a des coupures passagères (503 sur POST /api/projects, page « Connexion au
 * serveur impossible ») qui n'ont rien à voir avec le guide testé ici. On retente donc la création
 * jusqu'à 3 fois, comme le ferait un utilisateur ; une panne persistante fait toujours échouer le test.
 */
async function createProjectAndWaitForGuide(page: Page) {
  const chantiers = new ChantiersPage(page);
  const serverDown = page.getByRole('heading', { name: /connexion au serveur impossible/i });
  const newProjectButton = page.getByText('Nouveau chantier', { exact: true }).first();
  const MAX_ATTEMPTS = 3;

  let projectName = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await chantiers.goto();
    await newProjectButton.or(serverDown).first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    if (await serverDown.isVisible().catch(() => false)) {
      expect(attempt, 'Serveur injoignable après 3 tentatives.').toBeLessThan(MAX_ATTEMPTS);
      await page.waitForTimeout(3_000);
      continue;
    }

    projectName = `E2E BUILDNIVO-304 ${Date.now()}`;
    await chantiers.openCreateModal();
    await chantiers.fillNom(projectName);
    await chantiers.fillVille('Antananarivo');

    const created = page.waitForResponse(
      response => response.url().includes('/api/projects') && response.request().method() === 'POST',
    );
    await chantiers.submitCreate();
    const response = await created;
    if (response.status() >= 500 && attempt < MAX_ATTEMPTS) {
      await page.waitForTimeout(3_000);
      continue;
    }
    expect(response.ok(), `Le chantier doit être créé avant d’afficher le guide (HTTP ${response.status()}).`).toBeTruthy();
    break;
  }

  const guide = page.getByRole('dialog');
  await expect(guide).toBeVisible({ timeout: 15_000 });
  await expect(guide).toContainText(`${projectName} est créé. Reprenez ce qui existe déjà`);
  return { guide, projectName };
}

/**
 * La liste /chantiers est paginée (176 chantiers à ce jour, les chantiers E2E des runs successifs s'y
 * accumulent) et son ordre de tri a changé (plus récent d'abord, puis l'inverse selon les versions) :
 * chercher le chantier page par page est fragile. On utilise la barre "Rechercher un projet", comme un
 * utilisateur, ce qui ramène le chantier créé sur la première page quel que soit l'ordre.
 */
async function findProjectCard(page: Page, projectName: string) {
  const heading = page.getByRole('heading', { name: projectName, exact: true });
  await page.getByRole('searchbox', { name: 'Rechercher un projet' }).fill(projectName);
  await heading.waitFor({ state: 'visible', timeout: 30_000 });
  return heading.locator('xpath=../../..');
}

test.describe('BuildNivo - BUILDNIVO-304. Guide de reprise après création', () => {

  test('Ouverture automatique, contenu, animation intégrée et lien plein écran', async ({ page }) => {
    const { guide } = await createProjectAndWaitForGuide(page);

    for (const benefit of [
      'Fini la ressaisie',
      'Un chantier opérationnel dès le premier jour',
      'Vous gardez le contrôle',
    ]) {
      await expect(guide.getByText(benefit, { exact: true })).toBeVisible();
    }

    for (const step of [
      'Déposez vos pièces',
      'L’IA lit et structure',
      'Vous validez',
      'On crée dans le chantier',
    ]) {
      await expect(guide.getByText(step, { exact: true })).toBeVisible();
    }

    await expect(guide.getByRole('heading', { name: 'À préparer', level: 3 })).toBeVisible();
    await expect(guide).toContainText(/PDF, Word, Excel, CSV, images, ZIP, MS Project\. 50 Mo maximum par fichier/i);
    await expect(guide).toContainText(/vous pourrez la lancer plus tard/i);

    const iframe = guide.locator('iframe');
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute('src', /parcours-reprise-ia\.html/);
    await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');
    const animation = page.frameLocator('iframe');
    await expect(animation.getByRole('navigation', { name: 'Étapes du parcours' })).toBeVisible();

    const popupPromise = page.waitForEvent('popup');
    await guide.getByRole('link', { name: /ouvrir en plein écran/i }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/parcours-reprise-ia\.html(?:\?.*)?$/);
    await expect(popup).not.toHaveURL(/connexion/i);
    await expect(popup.getByRole('navigation', { name: 'Étapes du parcours' })).toBeVisible();

    const uploadChapter = popup.getByRole('button', { name: /N\+01 Téléverser/i });
    await uploadChapter.click();
    await expect(uploadChapter).toHaveAttribute('aria-current', 'step');
    await expect(popup.getByRole('heading', { name: 'Déposer ce qui existe déjà' })).toBeVisible();
    await popup.getByRole('button', { name: 'Étape suivante' }).click();
    await expect(popup.getByRole('button', { name: /N\+02 Analyser/i })).toHaveAttribute('aria-current', 'step');
    await popup.getByRole('button', { name: 'Étape précédente' }).click();
    await expect(uploadChapter).toHaveAttribute('aria-current', 'step');

    await popup.close();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(guide).toBeVisible();
    const guideBox = await guide.boundingBox();
    expect(guideBox?.width).toBeLessThanOrEqual(390);
    await expect(guide.getByRole('button', { name: 'Plus tard' })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await guide.getByRole('button', { name: 'Plus tard' }).click();
    await expect(guide).toBeHidden();
  });

  test('L’animation reste sur le premier chapitre jusqu’à une action utilisateur', async ({ page }) => {
    const { guide } = await createProjectAndWaitForGuide(page);
    const animation = page.frameLocator('iframe');

    await expect(animation.getByRole('navigation', { name: 'Étapes du parcours' })).toBeVisible();
    const firstChapter = animation.getByRole('button', { name: /N\+00 Le constat/i });
    await expect(firstChapter).toHaveAttribute('aria-current', 'step');
    await page.waitForTimeout(1_500);
    await expect(firstChapter).toHaveAttribute('aria-current', 'step');

    const uploadChapter = animation.getByRole('button', { name: /N\+01 Téléverser/i });
    await uploadChapter.click();
    await expect(uploadChapter).toHaveAttribute('aria-current', 'step');

    await guide.getByRole('button', { name: 'Plus tard' }).click();
    await expect(guide).toBeHidden();
  });

  test('Le guide réapparaît après Plus tard, la croix et Échap', async ({ page }) => {
    let { guide } = await createProjectAndWaitForGuide(page);
    await guide.getByRole('button', { name: 'Plus tard' }).click();
    await expect(guide).toBeHidden();

    await page.reload({ waitUntil: 'domcontentloaded' });
    ({ guide } = await createProjectAndWaitForGuide(page));
    await guide.locator('button').first().click();
    await expect(guide).toBeHidden();

    await page.reload({ waitUntil: 'domcontentloaded' });
    ({ guide } = await createProjectAndWaitForGuide(page));
    await page.keyboard.press('Escape');
    await expect(guide).toBeHidden();
  });

  test('Modifier un chantier existant ne déclenche pas le guide', async ({ page }) => {
    const { guide, projectName } = await createProjectAndWaitForGuide(page);
    await guide.getByRole('button', { name: 'Plus tard' }).click();

    const card = await findProjectCard(page, projectName);
    await card.getByTitle('Modifier le chantier').click();
    const editDialog = page.locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Modifier le chantier' }) })
      .filter({ has: page.getByRole('button', { name: 'Enregistrer' }) })
      .last();
    await expect(editDialog).toBeVisible();
    await editDialog.locator('input[type="text"]').first().fill(`${projectName} modifié`);

    const saved = page.waitForResponse(
      response => response.request().method() === 'PUT' && /\/api\/projects\/[^/?]+$/.test(response.url()),
    );
    await editDialog.getByRole('button', { name: 'Enregistrer' }).click();
    expect((await saved).ok(), 'La modification du chantier doit réussir.').toBeTruthy();
    await expect(editDialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText(/Reprenez ce qui existe déjà/i)).toHaveCount(0);
  });

  test('Une création refusée ne déclenche pas le guide', async ({ page }) => {
    const chantiers = new ChantiersPage(page);
    await chantiers.goto();
    await chantiers.openCreateModal();
    await chantiers.fillVille('Antananarivo');
    await chantiers.submitCreate();

    await expect(chantiers.getCreateSubmitButton()).toBeVisible();
    await expect(page.getByText(/Reprenez ce qui existe déjà/i)).toHaveCount(0);
  });
});