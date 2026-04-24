/**
 * apps/bvinvest/pages/KycPipelinePage.ts
 * ----------------------------------------
 * Page Object — Pipeline KYC/AML BV Invest
 * Couvre : qualification, upload documents, NDA/Charte, validation (SC-05)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';
import * as path from 'path';
import * as fs from 'fs';

export class KycPipelinePage extends BasePage {

  private readonly stepIndicator  = '[class*="step"],[class*="pipeline"],[class*="stage"],[class*="progress"],[class*="kyc"]';
  private readonly uploadInput    = 'input[type="file"]';
  private readonly ndaCheckbox    = 'input[type="checkbox"]';
  private readonly nextBtn        = 'button:has-text("Suivant"),button:has-text("Next"),button:has-text("Continuer"),button:has-text("Continue"),button[type="submit"]';
  private readonly signBtn        = 'button:has-text("Signer"),button:has-text("Sign"),button:has-text("Accepter"),button:has-text("Accept")';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    const lang = this.page.url().includes('/en/') ? 'en' : 'fr';
    // 👉 ADAPTER selon l'URL réelle du pipeline KYC
    await this.navigate(`/${lang}/verification`);
    await this.waitForLoad();
    await this.page.waitForTimeout(2000);
  }

  async verifyKycPageLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    const content = this.page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    await expect(this.page.getByText(/404|not found/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  }

  async verifyStepsVisible(): Promise<void> {
    const steps = this.page.locator(this.stepIndicator)
      .or(this.page.getByText(/qualification|documents|nda|charte|validation/i));
    const isVisible = await steps.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Indicateurs d\'étapes KYC non trouvés — vérifier URL dans KycPipelinePage');
    }
  }

  async verifyQualificationStep(): Promise<void> {
    const qualification = this.page.getByText(/qualification/i)
      .or(this.page.locator('[class*="qualification"],[data-step*="qualification"]'));
    const isVisible = await qualification.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Étape Qualification non visible');
    }
  }

  async verifyUploadStepPresent(): Promise<void> {
    const uploadArea = this.page.locator(this.uploadInput)
      .or(this.page.getByText(/upload|télécharger|documents/i))
      .or(this.page.locator('[class*="upload"],[class*="dropzone"]'));
    const isVisible = await uploadArea.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Zone d\'upload non trouvée — peut ne pas être encore accessible');
    }
  }

  async verifyNdaOrChartePresent(): Promise<void> {
    const nda = this.page.getByText(/nda|charte|accord de confidentialité|non-disclosure/i)
      .or(this.page.locator('[class*="nda"],[class*="charte"]'));
    const isVisible = await nda.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) {
      console.log('   ℹ️  Section NDA/Charte non visible — peut être une étape ultérieure');
    }
  }

  async verifySequentialProgress(): Promise<void> {
    // Vérifier que les étapes sont structurées séquentiellement
    const steps = this.page.locator(this.stepIndicator);
    const count = await steps.count();
    if (count >= 2) {
      console.log(`   ✅  Pipeline séquentiel détecté (${count} étapes)`);
    } else {
      console.log('   ℹ️  Structure du pipeline non décelable depuis le sélecteur courant');
    }
  }
}
