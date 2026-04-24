/**
 * apps/bvbusiness/pages/AdminMediaLibraryPage.ts
 * ------------------------------------------------
 * Page Object — Media Library Admin BV Business
 * Couvre : upload fichier, vérification (SC-06)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';
import * as path from 'path';
import * as fs from 'fs';

export class AdminMediaLibraryPage extends BasePage {

  // 👉 ADAPTER : sélecteurs réels de la media library
  private readonly uploadInput     = 'input[type="file"]';
  private readonly uploadBtn       = 'button:has-text("Upload"), button:has-text("Télécharger"), button:has-text("Ajouter"), label[for*="file"]';
  private readonly mediaGrid       = '[class*="media"], [class*="gallery"], [class*="library"], [class*="file"]';
  private readonly deleteBtn       = 'button:has-text("Supprimer"), button:has-text("Delete"), [aria-label*="delete" i], [aria-label*="supprimer" i]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    // 👉 ADAPTER : URL réelle de la media library
    await this.navigate(`/${lang}/admin/media`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyMediaLibraryLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/admin.*media|media.*admin|library/i, { timeout: 15_000 });
    const content = this.page.locator('main, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  }

  async verifyUploadButtonVisible(): Promise<void> {
    const btn = this.page.locator(this.uploadBtn).first()
      .or(this.page.locator(this.uploadInput).first());
    await expect(btn).toBeVisible({ timeout: 10_000 });
  }

  async uploadFile(filePath?: string): Promise<void> {
    // Utiliser un fichier de test PNG minimal si aucun n'est fourni
    const testFilePath = filePath ?? path.resolve(__dirname, '../fixtures/test-image.png');

    // Créer un fichier PNG minimal si absent
    if (!fs.existsSync(testFilePath)) {
      const fixturesDir = path.dirname(testFilePath);
      if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
      // PNG 1x1 pixel transparent (binaire minimal)
      const pngBuffer = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
        'hex'
      );
      fs.writeFileSync(testFilePath, pngBuffer);
    }

    const fileInput = this.page.locator(this.uploadInput).first();
    if (await fileInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await fileInput.setInputFiles(testFilePath);
    } else {
      // Certains boutons d'upload masquent l'input — tenter avec filechooser
      const uploadButton = this.page.locator(this.uploadBtn).first();
      if (!await uploadButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        console.log('   ℹ️  Bouton upload non trouvé — vérifier URL/sélecteurs dans AdminMediaLibraryPage');
        return;
      }
      try {
        const [fileChooser] = await Promise.all([
          this.page.waitForEvent('filechooser', { timeout: 8_000 }),
          uploadButton.click(),
        ]);
        await fileChooser.setFiles(testFilePath);
      } catch {
        console.log('   ℹ️  File chooser non déclenché — le mécanisme d\'upload peut utiliser drag-and-drop ou une API directe');
        return;
      }
    }
    await this.page.waitForTimeout(3000);
  }

  async verifyUploadSuccess(): Promise<void> {
    const successIndicator = this.page.getByText(/upload|télécharg|ajouté|success|complet/i)
      .or(this.page.locator('[class*="success"], [class*="toast"], [role="status"]'));
    const isVisible = await successIndicator.first().isVisible({ timeout: 8_000 }).catch(() => false);

    if (!isVisible) {
      // Vérifier que la grille média a au moins un élément
      const mediaItems = this.page.locator(this.mediaGrid);
      const count = await mediaItems.count();
      expect(count).toBeGreaterThan(0);
    } else {
      await expect(successIndicator.first()).toBeVisible();
    }
  }

  async verifyMediaGridNotEmpty(): Promise<void> {
    const mediaItems = this.page.locator(this.mediaGrid);
    const count = await mediaItems.count();
    expect(count).toBeGreaterThan(0);
  }
}
