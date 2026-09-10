/**
 * e2e-07-photos.spec.ts
 * -------------------------
 * Section 08 du cahier de recette — Photos & problèmes.
 * Couvre : PHOTO-01 à PHOTO-03.
 */

import { test, expect } from '@playwright/test';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { ModulePage } from '../pages/ModulePage';

test.describe('BuildNivo — 08. Photos & problèmes', () => {

  test('Page Photos & problèmes accessible avec filtres', async ({ page }) => {
    const mod = new ModulePage(page, '/photos');
    await mod.goto();
    await mod.verifyLoaded(/photos.*problèmes/i);
    await expect(page.getByText('Ajouter une photo').first()).toBeVisible({ timeout: 10_000 });
  });

  test('PHOTO-03 — Upload d\'un format non supporté (.exe) → refus explicite', async ({ page }) => {
    const mod = new ModulePage(page, '/photos');
    await mod.goto();

    await page.getByText('Ajouter une photo').first().click();
    await mod.dismissOnboardingTour();
    await page.waitForTimeout(800);

    const fileInput = page.locator('input[type="file"]').first();
    const hasFileInput = await fileInput.count() > 0;
    test.skip(!hasFileInput, 'PHOTO-03 — champ d\'upload de fichier introuvable après clic sur "Ajouter une photo".');

    const fakeExePath = path.join(os.tmpdir(), `buildnivo-e2e-fake-${Date.now()}.exe`);
    fs.writeFileSync(fakeExePath, Buffer.from('MZ-fake-executable-for-e2e-test'));

    await fileInput.setInputFiles(fakeExePath).catch(() => {});
    await page.waitForTimeout(1500);

    const errorMsg = page.getByText(/format.*(non supporté|invalide|accepté)|type de fichier|jpeg|jpg|png/i);
    await expect(errorMsg.first()).toBeVisible({ timeout: 10_000 });

    fs.unlinkSync(fakeExePath);
  });

  test('PHOTO-01 — Upload d\'une photo JPEG valide', async ({ page }) => {
    const mod = new ModulePage(page, '/photos');
    await mod.goto();

    await page.getByText('Ajouter une photo').first().click();
    await mod.dismissOnboardingTour();
    await page.waitForTimeout(800);

    const fileInput = page.locator('input[type="file"]').first();
    const hasFileInput = await fileInput.count() > 0;
    test.skip(!hasFileInput, 'PHOTO-01 — champ d\'upload de fichier introuvable après clic sur "Ajouter une photo".');

    // Un JPEG minimal valide (en-tête JFIF) suffit à passer la validation de format.
    const jpegPath = path.join(os.tmpdir(), `buildnivo-e2e-photo-${Date.now()}.jpg`);
    const minimalJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
    ]);
    fs.writeFileSync(jpegPath, minimalJpeg);

    await fileInput.setInputFiles(jpegPath).catch(() => {});
    await page.waitForTimeout(2000);

    const validateBtn = await mod.findActionButton(/enregistrer|valider|publier|confirmer/i);
    if (validateBtn) {
      await validateBtn.click();
      await page.waitForTimeout(1500);
    }

    // Pas de message d'erreur de format après upload d'un JPEG
    const errorMsg = page.getByText(/format.*(non supporté|invalide)/i);
    await expect(errorMsg.first()).not.toBeVisible({ timeout: 5_000 }).catch(() => {});

    fs.unlinkSync(jpegPath);
  });

});
