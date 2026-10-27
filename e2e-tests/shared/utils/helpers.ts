/**
 * shared/utils/helpers.ts
 * ------------------------
 * Fonctions utilitaires partagées entre tous les tests de toutes les applications.
 * Ces helpers simplifient les tâches répétitives : attente, génération de données,
 * formatage de dates, etc.
 *
 * Usage : import { waitForMs, generateRandomEmail } from '../../shared/utils/helpers';
 */

/**
 * Attend un certain nombre de millisecondes.
 * Pratique pour des pauses manuelles dans les tests, mais à éviter si possible -
 * préférer les attentes sémantiques de Playwright (waitForSelector, waitForURL...).
 *
 * @param ms - Durée de l'attente en millisecondes
 * @example await waitForMs(2000); // attend 2 secondes
 */
export async function waitForMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Génère une adresse email aléatoire unique.
 * Utile pour créer des comptes de test sans collision entre les tests.
 *
 * @param prefix - Préfixe à utiliser avant le symbole @ (par défaut: 'test')
 * @param domain - Domaine de l'email (par défaut: 'example.com')
 * @returns Une adresse email unique, ex: test-1714059823456@example.com
 *
 * @example
 * const email = generateRandomEmail(); // 'test-1714059823456@example.com'
 * const email = generateRandomEmail('user', 'monsite.fr'); // 'user-1714059823456@monsite.fr'
 */
export function generateRandomEmail(
  prefix: string = 'test',
  domain: string = 'example.com'
): string {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}@${domain}`;
}

/**
 * Formate une date JavaScript en chaîne lisible selon le format français JJ/MM/AAAA.
 * Utile pour remplir des champs de date dans les formulaires.
 *
 * @param date - L'objet Date à formater (par défaut: la date du jour)
 * @returns La date formatée, ex: '21/04/2026'
 *
 * @example
 * formatDate(); // '21/04/2026'
 * formatDate(new Date('2025-12-25')); // '25/12/2025'
 */
export function formatDate(date: Date = new Date()): string {
  const jour = String(date.getDate()).padStart(2, '0');
  const mois = String(date.getMonth() + 1).padStart(2, '0'); // Les mois commencent à 0
  const annee = date.getFullYear();
  return `${jour}/${mois}/${annee}`;
}

/**
 * Génère un identifiant unique court basé sur le timestamp.
 * Utile pour nommer des éléments créés pendant les tests (commandes, utilisateurs...).
 *
 * @param prefix - Préfixe pour rendre l'ID lisible (par défaut: 'id')
 * @returns Un identifiant unique, ex: 'id-823456'
 *
 * @example
 * generateUniqueId('commande'); // 'commande-823456'
 */
export function generateUniqueId(prefix: string = 'id'): string {
  // On prend les 6 derniers chiffres du timestamp pour garder l'ID court
  const shortId = String(Date.now()).slice(-6);
  return `${prefix}-${shortId}`;
}

/**
 * Vérifie si une chaîne est une adresse email valide.
 * Utile pour valider les données de test avant de les utiliser.
 *
 * @param email - L'adresse email à valider
 * @returns true si l'email est valide, false sinon
 *
 * @example
 * isValidEmail('test@example.com'); // true
 * isValidEmail('pas-un-email'); // false
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Retourne la date du jour au format ISO (AAAA-MM-JJ).
 * Utile pour les champs de date au format standard international.
 *
 * @returns La date du jour, ex: '2026-04-21'
 *
 * @example
 * getTodayISO(); // '2026-04-21'
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}
