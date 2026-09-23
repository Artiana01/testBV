/**
 * e2e-18-carnet-entretien.spec.ts
 * ------------------------------------
 * Carnet d'entretien engins : historique complet, pièces jointes et aperçu.
 * Couvre : /engins → "Carnet d'entretien" (modale par engin, pas une page
 * dédiée), création/édition d'interventions, upload de pièces jointes
 * (photo/PDF), restrictions par rôle, aperçu (zoom/rotation photo, lecteur
 * PDF intégré, téléchargement), et engins sans compteur horaire.
 *
 * Les engins sont des ressources d'entreprise (pas propres à un chantier —
 * confirmé : liste identique quel que soit le chantier actif), donc pas
 * besoin du garde-fou chantier utilisé ailleurs dans la suite (ensureDemoChantierSelected).
 *
 * Comptes : Direction pour les scénarios "chef/conducteur/direction"
 * (création, édition, suppression de pièce jointe) ; "Ouvrier sous-traitant"
 * pour le scénario de restriction de rôle.
 *
 * IMPORTANT (confirmé par un run réel, pas une supposition) : la modale
 * "Carnet d'entretien" se FERME ENTIÈREMENT après une soumission réussie
 * (création ou édition) — elle ne revient pas à la liste des interventions
 * DANS la même modale. Toute vérification post-soumission doit donc rouvrir
 * le carnet (via openCarnetForGrue4/openCarnetForEngine) plutôt que réutiliser
 * la référence `modal` d'avant la soumission, qui pointerait vers un élément
 * détaché du DOM.
 */

import { test, expect, Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ModulePage } from '../pages/ModulePage';
import { AppShellPage } from '../pages/AppShellPage';

const OUVRIER_SESSION = path.resolve(__dirname, '../auth/ouvrier-sous-traitant.json');

// Fichiers de test écrits sous e2e-tests/ (disque D:) plutôt que os.tmpdir() (disque C:, chroniquement
// proche de saturation sur cette machine sur toute la durée de cette session — un fichier de 11 Mo y a
// déjà fait échouer un run avec ENOSPC).
const FIXTURES_DIR = path.resolve(__dirname, '../../../.tmp-carnet-fixtures');
fs.mkdirSync(FIXTURES_DIR, { recursive: true });
function makeFile(name: string, content: Buffer): string {
  const p = path.join(FIXTURES_DIR, name);
  fs.writeFileSync(p, content);
  return p;
}
function uniqueName(ext: string): string {
  return `carnet-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}
const MINIMAL_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);
const MINIMAL_PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');

/**
 * Attend que le contenu réel de la modale "Carnet d'entretien" soit monté —
 * elle s'ouvre d'abord sur une coquille/état transitoire (observé : titre
 * générique "Carnet d'entretien" au lieu de "<Engin> · Carnet d'entretien",
 * tableau vide) avant que les interventions ne s'affichent.
 */
async function waitForCarnetLoaded(page: Page, modal: Locator): Promise<void> {
  await page.waitForTimeout(400);
  await modal.locator('[class*="animate-pulse"]').first().waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
  await modal.getByText(/^chargement/i).first().waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
  await modal.locator('table').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
}

/**
 * Ouvre la modale "Carnet d'entretien" pour un engin repéré par la présence
 * (ou l'absence) d'un compteur d'heures dans la colonne dédiée — plus fiable
 * qu'un libellé fixe : plusieurs engins partagent le même libellé ("Grue 4"
 * existe en double, un avec compteur et un sans, cf. parcours "sans compteur
 * horaire") et l'ordre des lignes n'est pas garanti stable.
 */
async function openCarnetForEngine(page: Page, opts: { tracksHours: boolean }): Promise<Locator> {
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const compteurText = (await row.locator('td').nth(3).textContent()) ?? '';
    const hasCounter = !compteurText.includes('—');
    if (hasCounter === opts.tracksHours) {
      await row.getByRole('button', { name: /carnet d.entretien/i }).click();
      const modal = page.locator('[role="dialog"]').first();
      await modal.waitFor({ state: 'visible', timeout: 10_000 });
      await waitForCarnetLoaded(page, modal);
      return modal;
    }
  }
  throw new Error(`Aucun engin ${opts.tracksHours ? 'avec' : 'sans'} compteur d'heures trouvé dans /engins.`);
}

/**
 * Repère spécifiquement "Grue 4" (avec compteur d'heures) — c'est l'engin de
 * démo qui a un historique réel (plusieurs interventions déjà consignées),
 * contrairement aux autres engins à compteur qui ressemblent à des doublons
 * de test (12h/0h ronds, peu ou pas d'historique). Nécessaire pour le
 * parcours "historique complet" qui a justement besoin de PLUSIEURS
 * interventions déjà présentes.
 */
async function openCarnetForGrue4(page: Page): Promise<Locator> {
  const rows = page.locator('tbody tr').filter({ hasText: 'Grue 4' });
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const compteurText = (await row.locator('td').nth(3).textContent()) ?? '';
    if (!compteurText.includes('—')) {
      await row.getByRole('button', { name: /carnet d.entretien/i }).click();
      const modal = page.locator('[role="dialog"]').first();
      await modal.waitFor({ state: 'visible', timeout: 10_000 });
      await waitForCarnetLoaded(page, modal);
      return modal;
    }
  }
  throw new Error('"Grue 4" avec compteur d\'heures introuvable dans /engins.');
}

test.describe('BuildNivo — 18. Carnet d\'entretien engins', () => {

  test.afterAll(() => {
    fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
  });

  test('Historique complet — toutes les interventions déjà consignées s\'affichent', async ({ page }) => {
    const mod = new ModulePage(page, '/engins');
    await mod.goto();

    const modal = await openCarnetForGrue4(page);
    const interventionRows = modal.locator('table').first().locator('tbody tr');
    const rowCount = await interventionRows.count();
    // Historique réel connu (inspection live, 2026-09-23) : plusieurs interventions déjà
    // consignées sur cet engin — un carnet qui n'affiche que la plus récente resterait bloqué
    // à 1 ligne.
    expect(rowCount).toBeGreaterThan(1);
  });

  test('Consignation d\'une intervention avec photo + PDF en une seule fois', async ({ page }) => {
    const mod = new ModulePage(page, '/engins');
    await mod.goto();

    const modal = await openCarnetForGrue4(page);
    await modal.getByRole('button', { name: /consigner une intervention/i }).click();
    await page.waitForTimeout(500);

    const label = `E2E multi-fichiers ${Date.now()}`;
    await page.getByPlaceholder(/ex : vidange/i).fill(label);
    await page.locator('input[type="date"]').first().fill(new Date().toISOString().slice(0, 10));
    // Compteur requis pour cet engin (a un compteur d'heures) — une valeur largement au-dessus
    // de l'historique existant pour ne pas déclencher une validation "doit être croissant".
    await page.locator('input[type="number"]').first().fill('900');

    const jpegPath = makeFile(uniqueName('jpg'), MINIMAL_JPEG);
    const pdfPath = makeFile(uniqueName('pdf'), MINIMAL_PDF);
    // Sélection des 2 fichiers EN UNE SEULE fois (setInputFiles avec un tableau), pas 2 appels
    // séparés — c'est justement ce que ce scénario vérifie (upload simultané, pas séquentiel).
    await page.locator('input[type="file"]').first().setInputFiles([jpegPath, pdfPath]);
    // Confirmé (inspection live) : la sélection affiche "N fichier(s) sélectionné(s)" avant tout
    // envoi réel — l'upload effectif n'a lieu qu'à la soumission du formulaire.
    await expect(page.getByText(/2 fichier\(s\) sélectionné/i)).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: /consigner l.intervention/i }).click();
    await page.waitForTimeout(1_500);

    // La modale se ferme entièrement après succès (confirmé) — on rouvre le carnet pour
    // constater le résultat, au lieu de réutiliser `modal` (détachée du DOM à ce stade).
    const modalAfter = await openCarnetForGrue4(page);
    const newRow = modalAfter.locator('table').first().locator('tbody tr').filter({ hasText: label });
    await expect(newRow).toBeVisible({ timeout: 10_000 });
    const attachmentChips = newRow.locator('button[title$=".jpg"], button[title$=".pdf"]');
    await expect(attachmentChips).toHaveCount(2, { timeout: 10_000 });
  });

  test('Fichier interdit — extension refusée (.exe)', async ({ page }) => {
    const mod = new ModulePage(page, '/engins');
    await mod.goto();

    const modal = await openCarnetForGrue4(page);
    await modal.getByRole('button', { name: /consigner une intervention/i }).click();
    await page.waitForTimeout(500);

    const label = `E2E exe-refuse ${Date.now()}`;
    await page.getByPlaceholder(/ex : vidange/i).fill(label);
    await page.locator('input[type="date"]').first().fill(new Date().toISOString().slice(0, 10));
    await page.locator('input[type="number"]').first().fill('904');

    const exePath = makeFile(uniqueName('exe'), Buffer.from('MZ-fake-executable-for-e2e-test'));
    const fileInput = page.locator('input[type="file"]').first();
    // L'attribut accept="image/*,.pdf" (confirmé par inspection) empêche la sélection via la
    // boîte de dialogue native du navigateur, mais setInputFiles() la contourne (comme le
    // ferait un utilisateur modifiant la requête à la main). Confirmé (run réel) : le fichier
    // est accepté EN SÉLECTION malgré cet attribut ("1 fichier(s) sélectionné(s)" s'affiche) —
    // le vrai refus, s'il existe, ne peut donc être vérifié qu'à la SOUMISSION, pas avant.
    await fileInput.setInputFiles(exePath).catch(() => {});
    await page.waitForTimeout(800);

    // Requête réseau observée (inspection live, run réel, pas une supposition) : POST
    // /api/engins/{id}/entretiens répond 422, et le formulaire affiche le message de validation
    // Laravel renvoyé par l'API telle quelle : "Le champ files.0 doit être un fichier de type :
    // jpg, jpeg, png, webp, heic, pdf." — texte très spécifique, on ancre dessus sans trop le
    // figer (liste d'extensions exacte non garantie stable) plutôt que de deviner un message
    // générique qui ne correspond pas à ce que l'app affiche réellement.
    const submitResponse = page.waitForResponse(r => /\/api\/engins\/.+\/entretiens/i.test(r.url()) && r.request().method() === 'POST', { timeout: 10_000 }).catch(() => null);
    await page.getByRole('button', { name: /consigner l.intervention/i }).click();
    const response = await submitResponse;
    await page.waitForTimeout(1_000);

    if (response) {
      // Jamais un succès (2xx) pour ce fichier interdit — ce serait le signe d'un contrôle de
      // type manquant côté serveur, une vraie anomalie de sécurité, pas un défaut de ce test.
      expect(response.ok(), 'Le serveur a accepté un fichier .exe (réponse 2xx) — contrôle de type manquant côté API.').toBeFalsy();
    }
    await expect(page.getByText(/doit être un fichier de type/i)).toBeVisible({ timeout: 5_000 });
  });

  test('Fichier interdit — image trop volumineuse (> 10 Mo)', async ({ page }) => {
    const mod = new ModulePage(page, '/engins');
    await mod.goto();

    const modal = await openCarnetForGrue4(page);
    await modal.getByRole('button', { name: /consigner une intervention/i }).click();
    await page.waitForTimeout(500);

    // Un JPEG minimal valide (en-tête correct) mais gonflé à 11 Mo de données bidon — teste la
    // limite de TAILLE spécifiquement, pas le format (déjà couvert par le test .exe ci-dessus).
    const oversized = Buffer.concat([MINIMAL_JPEG.subarray(0, 20), Buffer.alloc(11 * 1024 * 1024, 0), MINIMAL_JPEG.subarray(20)]);
    const bigPath = makeFile(uniqueName('jpg'), oversized);
    await page.locator('input[type="file"]').first().setInputFiles(bigPath).catch(() => {});
    await page.waitForTimeout(1_000);

    const errorMsg = page.getByText(/trop volumineux|dépasse|taille maximale|10\s*Mo/i);
    const rejected = await errorMsg.first().isVisible({ timeout: 5_000 }).catch(() => false);
    const staged = await page.getByText(/1 fichier\(s\) sélectionné/i).isVisible({ timeout: 2_000 }).catch(() => false);

    expect(rejected || !staged).toBeTruthy();
  });

  test('Édition — ajout puis suppression d\'une pièce jointe (Direction)', async ({ page }) => {
    const mod = new ModulePage(page, '/engins');
    await mod.goto();

    // Intervention dédiée et fraîche pour ce test (1 seule pièce jointe au départ), plutôt que
    // d'éditer une ligne existante de l'historique : les lignes historiques ("fdfdfd"...)
    // accumulent des pièces jointes à chaque run de cette suite depuis le début de la session
    // (observé : 2, puis 3... au fil des runs), ce qui rend un comptage avant/après peu fiable
    // sur une base qui grossit sans cesse. Une intervention isolée par son libellé unique garde
    // un point de départ prévisible (1 pièce jointe) quel que soit le nombre de runs précédents.
    let modal = await openCarnetForGrue4(page);
    await modal.getByRole('button', { name: /consigner une intervention/i }).click();
    await page.waitForTimeout(500);
    const label = `E2E edit-attach ${Date.now()}`;
    await page.getByPlaceholder(/ex : vidange/i).fill(label);
    await page.locator('input[type="date"]').first().fill(new Date().toISOString().slice(0, 10));
    await page.locator('input[type="number"]').first().fill('905');
    await page.locator('input[type="file"]').first().setInputFiles(makeFile(uniqueName('jpg'), MINIMAL_JPEG));
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /consigner l.intervention/i }).click();
    await page.waitForTimeout(1_500);

    modal = await openCarnetForGrue4(page);
    const targetRow = modal.locator('table').first().locator('tbody tr').filter({ hasText: label });
    await expect(targetRow).toBeVisible({ timeout: 10_000 });
    await targetRow.getByTitle(/modifier/i).click();
    await page.waitForTimeout(800);

    // Confirmé (inspection du DOM réel) : dans CE formulaire (pas dans la liste des
    // interventions), chaque pièce jointe existante est <span><button>nom-fichier</button>
    // <button title="Supprimer">X</button></span>, sans attribut title sur le bouton nom de
    // fichier — donc button[title$=".jpg"] etc. (qui ciblent la puce de la LISTE, pas celle du
    // FORMULAIRE) ne comptent rien ici. Le conteneur des puces est le frère précédent immédiat
    // du champ <input type="file"> lui-même.
    const removeButtons = page.locator('input[type="file"]').first().locator('xpath=..').getByTitle('Supprimer');
    await expect(removeButtons).toHaveCount(1, { timeout: 5_000 });

    const jpegPath = makeFile(uniqueName('jpg'), MINIMAL_JPEG);
    await page.locator('input[type="file"]').first().setInputFiles(jpegPath);
    await expect(page.getByText(/1 fichier\(s\) sélectionné/i)).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: /enregistrer les modifications/i }).click();
    await page.waitForTimeout(1_500);

    // Modale fermée après succès (confirmé) — rouvrir pour vérifier que l'ajout a bien été
    // persisté (pas juste affiché localement avant un rechargement qui l'effacerait).
    modal = await openCarnetForGrue4(page);
    const targetRowAfterAdd = modal.locator('table').first().locator('tbody tr').filter({ hasText: label });
    await targetRowAfterAdd.getByTitle(/modifier/i).click();
    await page.waitForTimeout(800);
    const removeButtonsAfterAdd = page.locator('input[type="file"]').first().locator('xpath=..').getByTitle('Supprimer');
    await expect(removeButtonsAfterAdd).toHaveCount(2, { timeout: 10_000 });

    // Suppression : le bouton "Supprimer" dédié à la puce la plus récemment ajoutée. Confirmé
    // par un test live dédié : ce clic ne retire PAS la puce immédiatement de l'écran (la
    // suppression est visiblement différée, comme le reste du formulaire — seul "Enregistrer
    // les modifications" applique le changement) ; on ne vérifie donc le résultat qu'après
    // sauvegarde + réouverture, pas juste après le clic.
    await removeButtonsAfterAdd.last().click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /enregistrer les modifications/i }).click();
    await page.waitForTimeout(1_500);

    // Vérification finale : la suppression est bien persistée après réouverture.
    modal = await openCarnetForGrue4(page);
    const targetRowFinal = modal.locator('table').first().locator('tbody tr').filter({ hasText: label });
    await targetRowFinal.getByTitle(/modifier/i).click();
    await page.waitForTimeout(800);
    await expect(page.locator('input[type="file"]').first().locator('xpath=..').getByTitle('Supprimer'))
      .toHaveCount(1, { timeout: 10_000 });
  });

  test('Rôle restreint (Ouvrier sous-traitant) — création OK, édition et API bloquées', async ({ browser }) => {
    test.skip(!fs.existsSync(OUVRIER_SESSION), 'Session "Ouvrier sous-traitant" indisponible (global-setup).');

    const context = await browser.newContext({ storageState: OUVRIER_SESSION });
    const page = await context.newPage();
    const shell = new AppShellPage(page);
    await page.goto('/engins', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const authenticated = !page.url().includes('/connexion');
    test.skip(!authenticated, 'Session "Ouvrier sous-traitant" présente mais invalide/expirée (redirigé vers /connexion).');
    await shell.dismissOnboardingTour();
    await shell.waitForSkeletonToClear();

    const rows = page.locator('tbody tr');
    const hasRows = await rows.first().isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!hasRows, 'Aucun engin visible pour ce rôle — impossible de vérifier la restriction.');

    await rows.first().getByRole('button', { name: /carnet d.entretien/i }).click();
    const modal = page.locator('[role="dialog"]').first();
    await modal.waitFor({ state: 'visible', timeout: 10_000 });
    await waitForCarnetLoaded(page, modal);

    // Création : peut joindre un fichier en créant une intervention.
    const consignerBtn = modal.getByRole('button', { name: /consigner une intervention/i });
    const canCreate = await consignerBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (canCreate) {
      await consignerBtn.click();
      await page.waitForTimeout(500);
      const fileInput = page.locator('input[type="file"]').first();
      const hasFileInput = await fileInput.isVisible({ timeout: 3_000 }).catch(() => false);
      expect(hasFileInput).toBeTruthy();
      await page.getByRole('button', { name: /annuler/i }).click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // Édition d'une intervention existante : aucun bouton "Modifier" (crayon) disponible.
    const editPencils = modal.getByTitle(/modifier/i);
    await expect(editPencils).toHaveCount(0);

    // Sécurité API : même sans bouton dans l'UI, une tentative directe doit être bloquée. On
    // découvre la vraie forme de la requête PATCH/PUT d'ajout de pièce jointe à la volée (en
    // observant un appel authentique fait par une session Direction dans un contexte
    // temporaire séparé) plutôt que de deviner l'URL — plus robuste qu'une valeur figée, et le
    // test se dégrade en skip explicite si la découverte échoue, au lieu d'échouer pour une
    // mauvaise raison.
    const directionSessionPath = path.resolve(__dirname, '../auth/direction.json');
    let discoveredCall: { method: string; url: string } | null = null;
    if (fs.existsSync(directionSessionPath)) {
      const probeContext = await browser.newContext({ storageState: directionSessionPath });
      const probePage = await probeContext.newPage();
      probePage.on('requestfinished', req => {
        const m = req.method();
        if ((m === 'PATCH' || m === 'PUT' || m === 'POST') && /engin/i.test(req.url()) && !discoveredCall) {
          discoveredCall = { method: m, url: req.url() };
        }
      });
      const probeShell = new AppShellPage(probePage);
      await probePage.goto('/engins', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
      await probeShell.dismissOnboardingTour().catch(() => {});
      await probeShell.waitForSkeletonToClear().catch(() => {});
      const probeRows = probePage.locator('tbody tr');
      if (await probeRows.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await probeRows.first().getByRole('button', { name: /carnet d.entretien/i }).click().catch(() => {});
        const probeModal = probePage.locator('[role="dialog"]').first();
        await probeModal.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
        await waitForCarnetLoaded(probePage, probeModal).catch(() => {});
        const firstEdit = probeModal.locator('table').first().locator('tbody tr').first().getByTitle(/modifier/i);
        if (await firstEdit.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await firstEdit.click();
          await probePage.waitForTimeout(500);
          await probePage.getByRole('button', { name: /enregistrer les modifications/i }).click().catch(() => {});
          await probePage.waitForTimeout(2_000);
        }
      }
      await probeContext.close();
    }

    test.skip(!discoveredCall, 'Endpoint API d\'ajout de pièce jointe non découvert dynamiquement — vérification 403 à faire manuellement.');
    if (discoveredCall) {
      const call = discoveredCall as { method: string; url: string };
      const response = await context.request.fetch(call.url, { method: call.method, multipart: { probe: 'e2e' } }).catch(() => null);
      // Refus attendu : 403 (Forbidden) idéalement, mais 401/404 restent acceptables selon la
      // façon dont l'API distingue "pas les droits" de "n'existe pas pour vous" — jamais un
      // succès (2xx), qui indiquerait une vraie faille IDOR.
      expect(response, 'La requête API directe aurait dû être bloquée, pas planter côté test').not.toBeNull();
      if (response) {
        expect(response.ok()).toBeFalsy();
      }
    }

    await context.close();
  });

  test('Aperçu photo — zoom et rotation restent lisibles', async ({ page }) => {
    const mod = new ModulePage(page, '/engins');
    await mod.goto();

    let modal = await openCarnetForGrue4(page);
    await modal.getByRole('button', { name: /consigner une intervention/i }).click();
    await page.waitForTimeout(500);

    const label = `E2E preview photo ${Date.now()}`;
    await page.getByPlaceholder(/ex : vidange/i).fill(label);
    await page.locator('input[type="date"]').first().fill(new Date().toISOString().slice(0, 10));
    await page.locator('input[type="number"]').first().fill('901');
    const jpegPath = makeFile(uniqueName('jpg'), MINIMAL_JPEG);
    await page.locator('input[type="file"]').first().setInputFiles(jpegPath);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /consigner l.intervention/i }).click();
    await page.waitForTimeout(1_500);

    modal = await openCarnetForGrue4(page);
    const newRow = modal.locator('table').first().locator('tbody tr').filter({ hasText: label });
    await expect(newRow).toBeVisible({ timeout: 10_000 });
    await newRow.locator('button[title$=".jpg"]').first().click();
    await page.waitForTimeout(1_000);

    const preview = page.locator('[role="dialog"]').filter({ hasText: /\.jpg/i }).last();
    const image = preview.locator('img').first();
    await expect(image).toBeVisible({ timeout: 10_000 });
    // Le conteneur de l'image porte le zoom/la rotation réels via un style CSS inline
    // ("transform: scale(1) rotate(0deg)") — on vérifie que les boutons changent CETTE valeur,
    // pas juste que l'image reste visible (elle le resterait de toute façon, zoom ou pas).
    const transformBox = preview.locator('div[style*="transform"]').first();
    const initialTransform = await transformBox.getAttribute('style');

    // Confirmé (inspection du DOM réel) : zoom avant/arrière n'ont ni texte ni title/aria-label
    // (icônes lucide-zoom-in/lucide-zoom-out nues) — seule la rotation a un title exploitable
    // ("Pivoter de 90°"). On cible donc les boutons zoom via leur icône SVG.
    const zoomIn = preview.locator('button').filter({ has: page.locator('svg.lucide-zoom-in') }).first();
    await expect(zoomIn).toBeVisible({ timeout: 5_000 });
    await zoomIn.click();
    await page.waitForTimeout(300);
    await expect(transformBox).not.toHaveAttribute('style', initialTransform ?? '');
    await expect(image).toBeVisible();

    const zoomOut = preview.locator('button').filter({ has: page.locator('svg.lucide-zoom-out') }).first();
    await expect(zoomOut).toBeVisible();
    await zoomOut.click();
    await page.waitForTimeout(300);
    await expect(image).toBeVisible();

    const rotateBtn = preview.getByTitle(/pivoter/i);
    await expect(rotateBtn).toBeVisible({ timeout: 5_000 });
    const beforeRotate = await transformBox.getAttribute('style');
    await rotateBtn.click();
    await page.waitForTimeout(300);
    await expect(transformBox).not.toHaveAttribute('style', beforeRotate ?? '');
    await expect(image).toBeVisible();
  });

  test('Aperçu PDF — lecteur intégré, pas un simple lien', async ({ page }) => {
    const mod = new ModulePage(page, '/engins');
    await mod.goto();

    let modal = await openCarnetForGrue4(page);
    await modal.getByRole('button', { name: /consigner une intervention/i }).click();
    await page.waitForTimeout(500);

    const label = `E2E preview pdf ${Date.now()}`;
    await page.getByPlaceholder(/ex : vidange/i).fill(label);
    await page.locator('input[type="date"]').first().fill(new Date().toISOString().slice(0, 10));
    await page.locator('input[type="number"]').first().fill('902');
    const pdfPath = makeFile(uniqueName('pdf'), MINIMAL_PDF);
    await page.locator('input[type="file"]').first().setInputFiles(pdfPath);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /consigner l.intervention/i }).click();
    await page.waitForTimeout(1_500);

    modal = await openCarnetForGrue4(page);
    const newRow = modal.locator('table').first().locator('tbody tr').filter({ hasText: label });
    await expect(newRow).toBeVisible({ timeout: 10_000 });
    await newRow.locator('button[title$=".pdf"]').first().click();
    await page.waitForTimeout(1_000);

    // Confirmé (inspection live) : l'aperçu PDF s'ouvre dans une modale dédiée avec le nom du
    // fichier en titre et un bouton "Télécharger" — un simple lien de téléchargement n'ouvrirait
    // pas de modale du tout (le navigateur lancerait directement le téléchargement).
    const preview = page.locator('[role="dialog"]').filter({ hasText: /\.pdf/i }).last();
    await expect(preview).toBeVisible({ timeout: 10_000 });
    await expect(preview.getByRole('button', { name: /télécharger/i })).toBeVisible();
    // Le contenu réel (iframe/objet PDF) doit être présent, pas seulement le cadre de la modale.
    const viewer = preview.locator('iframe, embed, object, canvas');
    await expect(viewer.first()).toBeVisible({ timeout: 10_000 });
  });

  test('Téléchargement d\'une pièce jointe — nom de fichier d\'origine conservé', async ({ page }) => {
    const mod = new ModulePage(page, '/engins');
    await mod.goto();

    let modal = await openCarnetForGrue4(page);
    await modal.getByRole('button', { name: /consigner une intervention/i }).click();
    await page.waitForTimeout(500);

    const label = `E2E download ${Date.now()}`;
    const originalName = `rapport-original-${Date.now()}.pdf`;
    await page.getByPlaceholder(/ex : vidange/i).fill(label);
    await page.locator('input[type="date"]').first().fill(new Date().toISOString().slice(0, 10));
    await page.locator('input[type="number"]').first().fill('903');
    const pdfPath = makeFile(originalName, MINIMAL_PDF);
    await page.locator('input[type="file"]').first().setInputFiles(pdfPath);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /consigner l.intervention/i }).click();
    await page.waitForTimeout(1_500);

    modal = await openCarnetForGrue4(page);
    const newRow = modal.locator('table').first().locator('tbody tr').filter({ hasText: label });
    await expect(newRow).toBeVisible({ timeout: 10_000 });
    await newRow.locator('button[title$=".pdf"]').first().click();
    await page.waitForTimeout(1_000);

    const preview = page.locator('[role="dialog"]').filter({ hasText: /\.pdf/i }).last();
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
    await preview.getByRole('button', { name: /télécharger/i }).click();
    const download = await downloadPromise;
    // Le nom suggéré doit reprendre le nom d'origine (pas un UUID/hash généré côté stockage).
    expect(download.suggestedFilename()).toBe(originalName);
  });

  test('Engin sans compteur horaire — formulaire et pièces jointes fonctionnent pareil', async ({ page }) => {
    const mod = new ModulePage(page, '/engins');
    await mod.goto();

    let modal = await openCarnetForEngine(page, { tracksHours: false });
    await modal.getByRole('button', { name: /consigner une intervention/i }).click();
    await page.waitForTimeout(500);

    // Le champ "Compteur d'heures relevé" ne doit pas exister pour cet engin (tracks_hours=false)
    // — contrairement aux tests ci-dessus sur "Grue 4" (avec compteur) où il est requis.
    await expect(page.getByText(/compteur d.heures relevé/i)).toHaveCount(0);
    await expect(page.locator('input[type="number"]')).toHaveCount(0);

    const label = `E2E sans compteur ${Date.now()}`;
    await page.getByPlaceholder(/ex : vidange/i).fill(label);
    await page.locator('input[type="date"]').first().fill(new Date().toISOString().slice(0, 10));

    const jpegPath = makeFile(uniqueName('jpg'), MINIMAL_JPEG);
    await page.locator('input[type="file"]').first().setInputFiles(jpegPath);
    await expect(page.getByText(/1 fichier\(s\) sélectionné/i)).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: /consigner l.intervention/i }).click();
    await page.waitForTimeout(1_500);

    modal = await openCarnetForEngine(page, { tracksHours: false });
    const newRow = modal.locator('table').first().locator('tbody tr').filter({ hasText: label });
    await expect(newRow).toBeVisible({ timeout: 10_000 });
    await expect(newRow.locator('button[title$=".jpg"]')).toBeVisible();
  });

});
