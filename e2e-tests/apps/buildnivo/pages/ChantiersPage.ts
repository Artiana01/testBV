/**
 * apps/buildnivo/pages/ChantiersPage.ts
 * ----------------------------------------
 * Page Object — /chantiers : liste des chantiers + création (PROJ-01, PROJ-04).
 */

import { Page, expect } from '@playwright/test';
import { AppShellPage } from './AppShellPage';

export class ChantiersPage extends AppShellPage {

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.gotoModule('/chantiers');
  }

  async openCreateModal(): Promise<void> {
    await this.page.getByText('Nouveau chantier', { exact: true }).first().click();
    await this.dismissOnboardingTour();
    await this.page.getByText("Nom de l'opération", { exact: false }).first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  async fillNom(nom: string): Promise<void> {
    // Premier champ texte du formulaire = "Nom de l'opération *"
    await this.page.locator('input[type="text"]').first().fill(nom);
  }

  async fillVille(ville: string): Promise<void> {
    await this.page.getByPlaceholder('Ex : Saint-Denis').fill(ville);
  }

  async submitCreate(): Promise<void> {
    await this.page.getByRole('button', { name: 'Créer le chantier' }).click();
  }

  async cancelCreate(): Promise<void> {
    await this.page.getByRole('button', { name: 'Annuler' }).click();
  }

  getCreateSubmitButton() {
    return this.page.getByRole('button', { name: 'Créer le chantier' });
  }

  getChantierCard(nom: string) {
    return this.page.locator('div, section, article').filter({ hasText: nom }).first();
  }

  async verifyChantierVisible(nom: string): Promise<void> {
    await expect(this.page.getByText(nom).first()).toBeVisible({ timeout: 15_000 });
  }

  async verifyModalStillOpen(): Promise<void> {
    await expect(this.getCreateSubmitButton()).toBeVisible();
  }
}
