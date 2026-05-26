/**
 * shared/pages/BasePage.ts
 * -------------------------
 * Classe de base partagée par toutes les pages de toutes les applications.
 * Chaque Page Object spécifique à une application DOIT hériter de cette classe.
 *
 * Elle centralise les comportements communs :
 * - Navigation vers une URL
 * - Attente du chargement de la page
 * - Capture d'écran manuelle
 * - Récupération du titre de la page
 *
 * Usage : class LoginPage extends BasePage { ... }
 */

import { Page } from '@playwright/test';

export class BasePage {
  // Instance de la page Playwright injectée via le constructeur
  protected page: Page;

  /**
   * Constructeur — reçoit l'objet `page` fourni par Playwright dans chaque test
   * @param page - L'instance Page de Playwright
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigue vers un chemin relatif ou une URL complète.
   * Si un chemin relatif est fourni (ex: '/login'), il est combiné avec BASE_URL.
   *
   * @param path - Chemin relatif (ex: '/login') ou URL absolue
   */
  async navigate(path: string = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  }

  /**
   * Attend que la page soit complètement chargée.
   * Utile après une navigation ou une action qui déclenche un rechargement.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Prend une capture d'écran manuelle et la sauvegarde dans le dossier test-results/.
   * Utile pour documenter une étape ou déboguer un problème visuel.
   *
   * @param name - Nom du fichier sans extension (ex: 'apres-connexion')
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Retourne le titre de la page courante (balise <title>).
   * Utile pour vérifier que la bonne page est affichée.
   *
   * @returns Le titre de la page sous forme de chaîne
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Attend un certain nombre de millisecondes avant de continuer.
   * À utiliser avec parcimonie — préférer waitForSelector ou waitForURL quand possible.
   *
   * @param ms - Nombre de millisecondes à attendre
   */
  async waitForMs(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Vérifie si un élément est visible sur la page.
   * Retourne true si visible, false sinon.
   *
   * @param selector - Sélecteur CSS ou Playwright de l'élément
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * Clique sur un élément identifié par son sélecteur.
   *
   * @param selector - Sélecteur CSS ou Playwright de l'élément
   */
  async clickOn(selector: string): Promise<void> {
    await this.page.locator(selector).click();
  }

  /**
   * Retourne l'URL courante de la page.
   * Utile pour vérifier une redirection après une action.
   */
  getCurrentUrl(): string {
    return this.page.url();
  }
}
