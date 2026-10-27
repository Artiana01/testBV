/**
 * apps/app-template/pages/LoginPage.ts
 * --------------------------------------
 * Page Object représentant la page de connexion de l'application.
 * Hérite de BasePage pour accéder aux méthodes communes (navigate, waitForLoad...).
 *
 * IMPORTANT : Les sélecteurs CSS sont des EXEMPLES génériques.
 * Ils doivent être adaptés à chaque application.
 * Repérez les commentaires // 👉 ADAPTER selon l'app pour savoir quoi modifier.
 *
 * Pour trouver les bons sélecteurs, utilisez :
 * - npm run codegen -- https://votre-app.com
 * - Ou l'inspecteur Playwright : PWDEBUG=1 npm test
 */

import { expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class LoginPage extends BasePage {
  // =========================================================
  // SÉLECTEURS - À ADAPTER selon la structure HTML de l'app
  // =========================================================

  // 👉 ADAPTER : Sélecteur du champ email (ici on cherche un input de type email)
  private readonly emailInput = 'input[type="email"]';

  // 👉 ADAPTER : Sélecteur du champ mot de passe
  private readonly passwordInput = 'input[type="password"]';

  // 👉 ADAPTER : Sélecteur du bouton de soumission du formulaire
  private readonly submitButton = 'button[type="submit"]';

  // 👉 ADAPTER : Sélecteur d'un élément visible uniquement après connexion réussie
  // Exemples : '.dashboard', '#user-menu', '[data-testid="welcome-banner"]'
  private readonly successIndicator = '.dashboard';

  // 👉 ADAPTER : Sélecteur du message d'erreur affiché en cas d'identifiants incorrects
  private readonly errorMessage = '.error-message';

  // =========================================================
  // MÉTHODES DE LA PAGE
  // =========================================================

  /**
   * Remplit le champ email avec la valeur fournie.
   * @param email - L'adresse email à saisir
   */
  async fillEmail(email: string): Promise<void> {
    // 👉 ADAPTER le sélecteur si le champ email n'est pas détecté automatiquement
    await this.page.locator(this.emailInput).fill(email);
  }

  /**
   * Remplit le champ mot de passe avec la valeur fournie.
   * @param password - Le mot de passe à saisir
   */
  async fillPassword(password: string): Promise<void> {
    // 👉 ADAPTER le sélecteur si le champ password n'est pas détecté automatiquement
    await this.page.locator(this.passwordInput).fill(password);
  }

  /**
   * Clique sur le bouton de soumission du formulaire de connexion.
   */
  async clickSubmit(): Promise<void> {
    // 👉 ADAPTER le sélecteur si le bouton n'est pas un <button type="submit">
    await this.page.locator(this.submitButton).click();
  }

  /**
   * Effectue la connexion complète en une seule méthode.
   * Navigue vers la page login, remplit les identifiants et soumet le formulaire.
   *
   * Les identifiants peuvent être passés en paramètre ou lus depuis process.env.
   *
   * @param email - Email de connexion (par défaut : process.env.TEST_EMAIL)
   * @param password - Mot de passe (par défaut : process.env.TEST_PASSWORD)
   */
  async login(
    email: string = process.env.TEST_EMAIL ?? '',
    password: string = process.env.TEST_PASSWORD ?? ''
  ): Promise<void> {
    // Vérification que les identifiants sont définis
    if (!email || !password) {
      throw new Error(
        'Les identifiants de test sont manquants. ' +
        'Vérifiez que TEST_EMAIL et TEST_PASSWORD sont définis dans votre fichier .env'
      );
    }

    // 👉 ADAPTER : Changer '/login' si la page de connexion est à une autre URL
    await this.navigate('/login');

    // Attendre que la page soit chargée avant de remplir les champs
    await this.waitForLoad();

    // Remplissage du formulaire
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * Vérifie que la connexion a réussi en attendant l'apparition d'un indicateur de succès.
   * À appeler après login() pour confirmer que l'utilisateur est bien connecté.
   */
  async verifyLoginSuccess(): Promise<void> {
    // 👉 ADAPTER le sélecteur selon ce qui apparaît après connexion réussie
    await expect(this.page.locator(this.successIndicator)).toBeVisible({
      timeout: 10_000,
    });
  }

  /**
   * Vérifie qu'un message d'erreur est affiché (connexion échouée).
   * Utile pour tester les cas négatifs (mauvais mot de passe, email inconnu...).
   */
  async verifyLoginError(): Promise<void> {
    // 👉 ADAPTER le sélecteur selon le message d'erreur affiché par l'app
    await expect(this.page.locator(this.errorMessage)).toBeVisible({
      timeout: 5_000,
    });
  }

  /**
   * Variante utilisant les sélecteurs sémantiques de Playwright (recommandé).
   * Ces sélecteurs sont plus stables car basés sur le rôle et le texte visible.
   *
   * 👉 ADAPTER les textes selon les labels réels de l'application testée.
   */
  async loginSemantic(
    email: string = process.env.TEST_EMAIL ?? '',
    password: string = process.env.TEST_PASSWORD ?? ''
  ): Promise<void> {
    await this.navigate('/login');
    await this.waitForLoad();

    // 👉 ADAPTER : Changer 'Email' par le label réel du champ email dans l'app
    await this.page.getByLabel('Email').fill(email);

    // 👉 ADAPTER : Changer 'Mot de passe' par le label réel du champ password
    await this.page.getByLabel('Mot de passe').fill(password);

    // 👉 ADAPTER : Changer 'Se connecter' par le texte réel du bouton
    await this.page.getByRole('button', { name: 'Se connecter' }).click();
  }
}
