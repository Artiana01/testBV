/**
 * apps/bvinvest/tests/e2e-05-kyc-pipeline.spec.ts
 * --------------------------------------------------
 * SC-05 : Accès au pipeline de vérification KYC/AML (CRITIQUE)
 *
 * Préconditions : utilisateur connecté (storageState client)
 * Couvre : affichage étapes, qualification, upload, NDA/Charte, progression séquentielle
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { KycPipelinePage } from '../pages/KycPipelinePage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('SC-05 — Pipeline de Vérification KYC/AML (CRITIQUE)', () => {

  test('05.1 — La page vérification est accessible', async ({ page }) => {
    test.setTimeout(30_000);
    const kycPage = new KycPipelinePage(page);
    await kycPage.goto();
    await kycPage.verifyKycPageLoaded();
  });

  test('05.2 — Les étapes KYC sont affichées (qualification → validation)', async ({ page }) => {
    test.setTimeout(30_000);
    const kycPage = new KycPipelinePage(page);
    await kycPage.goto();
    await kycPage.verifyStepsVisible();
  });

  test('05.3 — L\'étape Qualification est présente', async ({ page }) => {
    test.setTimeout(30_000);
    const kycPage = new KycPipelinePage(page);
    await kycPage.goto();
    await kycPage.verifyQualificationStep();
  });

  test('05.4 — La zone d\'upload de documents est présente', async ({ page }) => {
    test.setTimeout(30_000);
    const kycPage = new KycPipelinePage(page);
    await kycPage.goto();
    await kycPage.verifyUploadStepPresent();
  });

  test('05.5 — La section NDA / Charte est présente', async ({ page }) => {
    test.setTimeout(30_000);
    const kycPage = new KycPipelinePage(page);
    await kycPage.goto();
    await kycPage.verifyNdaOrChartePresent();
  });

  test('05.6 — La progression est structurée séquentiellement', async ({ page }) => {
    test.setTimeout(30_000);
    const kycPage = new KycPipelinePage(page);
    await kycPage.goto();
    await kycPage.verifySequentialProgress();
  });

});
