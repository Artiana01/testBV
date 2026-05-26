import { Page } from '@playwright/test';
import { BasePage } from '../common/BasePage';

export class ProfilePage extends BasePage {
  // Locators
  readonly profileEditButton = 'button:has-text("Éditer"), button:has-text("Modifier")';
  readonly nameField = 'input[name*="name"]';
  readonly emailField = 'input[type="email"]';
  readonly bioField = 'textarea[name*="bio"]';
  readonly avatarUploadButton = 'button:has-text("Photo"), input[type="file"]';
  readonly coverPhotoUploadButton = 'button:has-text("Couverture"), input[type="file"]';
  readonly saveButton = 'button[type="submit"]:has-text("Sauvegarder")';
  readonly successMessage = '.success-message, .alert-success, text=succès';
  readonly errorMessage = '.error-message, .alert-danger';

  constructor(page: Page) {
    super(page);
  }

  async editProfile() {
    await this.click(this.profileEditButton);
  }

  async updateName(name: string) {
    await this.fill(this.nameField, name);
  }

  async updateBio(bio: string) {
    await this.fill(this.bioField, bio);
  }

  async uploadAvatar(filePath: string) {
    const fileInput = this.page.locator(this.avatarUploadButton).first();
    await fileInput.setInputFiles(filePath);
  }

  async uploadCoverPhoto(filePath: string) {
    try {
      const fileInput = this.page.locator(this.coverPhotoUploadButton);
      await fileInput.setInputFiles(filePath);
    } catch (e) {
      // Photo couverture non fonctionnelle
      console.log('⚠️ Photo couverture non modifiable');
    }
  }

  async saveProfile() {
    await this.click(this.saveButton);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successMessage);
  }

  async isSuccessVisible(): Promise<boolean> {
    return await this.isVisible(this.successMessage);
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.isVisible(this.errorMessage);
  }
}
