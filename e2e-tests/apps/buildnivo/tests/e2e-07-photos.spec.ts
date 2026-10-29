/**
 * e2e-07-photos.spec.ts
 * -------------------------
 * Section 08 du cahier de recette - Photos & problèmes.
 * Couvre : PHOTO-01 à PHOTO-03.
 */

import { test, expect } from '@playwright/test';
import { ModulePage } from '../pages/ModulePage';
import { JPEG } from '../fixtures';

test.describe('BuildNivo - 08. Photos & problèmes', () => {

  test('Page Photos & problèmes accessible avec filtres', async ({ page }) => {
    const mod = new ModulePage(page, '/photos');
    await mod.goto();
    await mod.verifyLoaded(/photos.*problèmes/i);
    await expect(page.getByText('Ajouter une photo').first()).toBeVisible({ timeout: 10_000 });
  });

  test('PHOTO-03 - Upload d\'un format non supporté (.exe) → refus explicite', async ({ page }) => {
    const mod = new ModulePage(page, '/photos');
    await mod.goto();

    await page.getByText('Ajouter une photo').first().click();
    await mod.dismissOnboardingTour();
    await page.waitForTimeout(800);

    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Ajouter une photo de chantier' });
    const fileInput = modal.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles({
      name: 'interdit.exe', mimeType: 'application/x-msdownload',
      buffer: Buffer.from('MZ-fake-executable-for-e2e-test'),
    });
    // Le fichier non image est écarté à la sélection. La soumission explique
    // ensuite qu'aucune photo valide n'a été ajoutée au relevé.
    await modal.getByPlaceholder(/cloisons R\+2/i).fill('E2E fichier interdit');
    await modal.getByRole('button', { name: 'Enregistrer la photo', exact: true }).click();
    await expect(modal.getByText('Ajoutez au moins une photo au relevé.', { exact: true }))
      .toBeVisible({ timeout: 10_000 });
    await expect(modal).toBeVisible();
    await expect(modal.locator('img')).toHaveCount(0);
  });

  test('PHOTO-01 - Upload d\'une photo JPEG valide', async ({ page }) => {
    const mod = new ModulePage(page, '/photos');
    await mod.goto();

    await page.getByText('Ajouter une photo').first().click();
    await mod.dismissOnboardingTour();
    await page.waitForTimeout(800);

    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Ajouter une photo de chantier' });
    const title = `Photo E2E ${Date.now()}`;
    await modal.getByPlaceholder(/cloisons R\+2/i).fill(title);
    await modal.locator('input[type="file"]').setInputFiles({
      name: `${title}.jpg`, mimeType: 'image/jpeg', buffer: JPEG,
    });
    await modal.locator('select').filter({
      has: page.locator('option', { hasText: 'Bâtiment Principal' }),
    }).selectOption({ label: 'Bâtiment Principal' });
    await modal.getByRole('button', { name: 'Enregistrer la photo', exact: true }).click();
    await expect(modal).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 15_000 });
  });

});
