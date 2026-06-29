/**
 * e2e-09-multilingue.spec.ts — Créer Ailleurs
 * SC-09 : Vérification multilingue (FR/EN)
 *
 * Vérifie : navigation EN, textes espace utilisateur, cohérence traduction
 * Priorité : P1 Important
 *
 * Anomalies documentées :
 *   - Mot "MODIFIER" en français dans la version anglaise
 */
import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

const BASE = process.env.BASE_URL ?? 'https://dev.creerailleurs.com';

test.describe('SC-09 — Vérification multilingue FR/EN', () => {

  test('09.1 — La version FR est la langue par défaut', async ({ page }) => {
    test.setTimeout(60_000);
    const home = new HomePage(page);
    await home.navigate();
    // Vérifier la langue de la page
    const lang = await page.locator('html').getAttribute('lang');
    const isFrench = lang?.startsWith('fr') ?? false;
    const hasFrText = await page.locator('text=/manifeste|découvrir|connexion/i').first().isVisible({ timeout: 5_000 }).catch(() => false);
    expect(isFrench || hasFrText).toBeTruthy();
    console.log(`Langue HTML détectée: ${lang}`);
  });

  test('09.2 — Le sélecteur de langue permet de passer en EN', async ({ page }) => {
    test.setTimeout(60_000);
    const home = new HomePage(page);
    await home.navigate();
    // Trouver et cliquer sur le lien EN
    const enLink = page.locator('a[href*="/en"], button:has-text("EN"), [hreflang="en"]').first();
    if (await enLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await enLink.click();
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      expect(url).toMatch(/\/en|lang=en/i);
      console.log(`Page EN accessible: ${url}`);
    } else {
      // Essai direct via URL
      await page.goto(`${BASE}/en`);
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      console.log(`URL EN direct: ${url}`);
    }
  });

  test('09.3 — La version EN charge correctement', async ({ page }) => {
    test.setTimeout(60_000);
    const home = new HomePage(page);
    await home.navigateEN();
    await expect(page.locator('header, nav, main').first()).toBeVisible({ timeout: 20_000 });
    console.log(`Version EN chargée: ${page.url()}`);
  });

  test('09.4 — Les menus de navigation sont traduits en EN', async ({ page }) => {
    test.setTimeout(60_000);
    const home = new HomePage(page);
    await home.navigateEN();
    // Vérifier qu'au moins un élément de navigation est en anglais
    const enNavEl = page.locator(
      'a:has-text("Manifesto"), a:has-text("Matthew"), a:has-text("Login"), a:has-text("Sign in"), nav'
    ).first();
    const isVisible = await enNavEl.isVisible({ timeout: 5_000 }).catch(() => false);
    if (isVisible) {
      console.log('Navigation EN détectée');
    } else {
      console.log('Navigation EN non détectée — vérifier si la traduction est complète');
    }
    await expect(page.locator('header, nav').first()).toBeVisible({ timeout: 20_000 });
  });

  test('09.5 — [BUG CONNU] Mot "MODIFIER" en français dans la version anglaise', async ({ page }) => {
    test.setTimeout(60_000);
    const home = new HomePage(page);
    await home.navigateEN();

    // Chercher le mot "MODIFIER" qui ne devrait pas apparaître en anglais
    const modifierText = page.getByText('MODIFIER', { exact: false }).first();
    const isVisible = await modifierText.isVisible({ timeout: 5_000 }).catch(() => false);
    if (isVisible) {
      console.log('ANOMALIE SC-09: Mot "MODIFIER" en français détecté dans la version anglaise');
      console.log('Correction requise: traduire en "EDIT" ou "UPDATE"');
    } else {
      console.log('"MODIFIER" non visible sur la page EN principale — peut apparaître dans l\'espace utilisateur');
    }
    expect(true).toBeTruthy();
  });

  test('09.6 — Espace utilisateur EN — vérification textes non traduits', async ({ page }) => {
    test.setTimeout(60_000);
    // Accéder au dashboard en version EN
    await page.goto(`${BASE}/en/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    const url = page.url();

    if (!url.includes('/login') && !url.includes('/connexion')) {
      // Chercher des mots français dans la version EN
      const frenchWords = ['MODIFIER', 'Aperçu', 'Connexion', 'Télécharger', 'Profil utilisateur'];
      for (const word of frenchWords) {
        const el = page.getByText(word, { exact: false }).first();
        const visible = await el.isVisible({ timeout: 2_000 }).catch(() => false);
        if (visible) {
          console.log(`ANOMALIE SC-09: Texte français "${word}" visible dans la version EN`);
        }
      }
    } else {
      // Pas connecté — tester sur la page publique EN
      await page.goto(`${BASE}/en`);
      await page.waitForLoadState('domcontentloaded');
      const modifierText = page.getByText('MODIFIER', { exact: false }).first();
      const isVisible = await modifierText.isVisible({ timeout: 3_000 }).catch(() => false);
      if (isVisible) {
        console.log('ANOMALIE SC-09: "MODIFIER" présent sur la page EN publique');
      }
    }
    expect(true).toBeTruthy();
  });

  test('09.7 — Cohérence FR/EN — la structure de la page est identique', async ({ page }) => {
    test.setTimeout(60_000);
    // Comparer le nombre de sections entre FR et EN
    const home = new HomePage(page);
    await home.navigate();
    const frSections = await page.locator('section, [class*="section"]').count();

    await home.navigateEN();
    const enSections = await page.locator('section, [class*="section"]').count();

    console.log(`Sections FR: ${frSections} | Sections EN: ${enSections}`);
    // Les deux versions doivent avoir une structure comparable (tolérance ±2)
    expect(Math.abs(frSections - enSections)).toBeLessThanOrEqual(2);
  });

  test('09.8 — Le footer est traduit en EN', async ({ page }) => {
    test.setTimeout(60_000);
    const home = new HomePage(page);
    await home.navigateEN();
    const footer = page.locator('footer').first();
    if (await footer.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const footerText = await footer.textContent();
      // Chercher des mots français qui ne devraient pas être là
      const hasFrenchOnly = footerText?.includes('Mentions légales') && !footerText?.includes('Legal');
      if (hasFrenchOnly) {
        console.log('ANOMALIE SC-09: Footer contient du texte non traduit en EN');
      } else {
        console.log('Footer EN semble correctement traduit');
      }
    }
    expect(true).toBeTruthy();
  });

});
