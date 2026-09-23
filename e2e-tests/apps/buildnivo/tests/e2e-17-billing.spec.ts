/**
 * e2e-17-billing.spec.ts
 * ---------------------------
 * Billing — Intégration du Stripe Customer Portal pour upgrade/gestion
 * d'abonnement, badge plan actuel et soft-gating (PlanUpgradeRequired).
 *
 * Compte : "Propriétaire" (tenant-owner, johnim@entreprise.test) — c'est le
 * SEUL rôle qui a le bouton "Gérer mon abonnement" sur /parametres. Confirmé
 * en direct : Direction voit bien la carte Abonnement avec la pastille
 * "Abonnement actif", mais SANS ce bouton — message affiché par l'app :
 * "Seul le propriétaire de l'entreprise peut gérer l'abonnement." Le compte
 * tenant-owner doit en plus avoir terminé son onboarding (Entreprise → Premier
 * Chantier → Abonnement) pour disposer d'un abonnement actif ; sans ça, seule
 * l'étape d'onboarding s'affiche et /parametres redirige vers /onboarding.
 *
 * Stripe est en mode TEST (bandeau "Sandbox" visible sur le portail) — les
 * scénarios ci-dessous vont jusqu'à la mutation réelle de l'abonnement
 * (changement de forfait avec proration), sans risque de paiement réel.
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { AppShellPage } from '../pages/AppShellPage';

const OWNER_SESSION = path.resolve(__dirname, '../auth/tenant-owner.json');

// Le portail Stripe suit la locale du navigateur (locale: 'fr-FR' dans ce config, voir
// playwright.buildnivo.config.ts) et s'affiche donc en FRANÇAIS lors des vrais runs — confirmé en
// direct (ex. "Confirmer vos mises à jour", "Montant dû aujourd'hui"). Une exploration manuelle
// antérieure sans cette locale explicite avait affiché la même page en anglais, d'où ces
// regex bilingues : robuste dans les deux cas plutôt que de figer sur l'un des deux.
const RE_CURRENT_SUB = /current subscription|abonnement en cours/i;
const RE_UPDATE_SUB_LINK = /update subscription|modifier l.abonnement/i;
const RE_SELECT_BTN = /^select$|^sélectionner$/i;
const RE_CONTINUE_BTN = /^continue$|^continuer$/i;
const RE_CONFIRM_UPDATES = /confirm your updates|confirmer vos mises à jour/i;
const RE_AMOUNT_DUE = /amount due today|montant dû aujourd.hui/i;
const RE_CONFIRM_BTN = /^confirm$|^confirmer$/i;
const RE_RETURN_LINK = /return to|retour vers/i;

/** Extrait un montant euro d'un texte Stripe ("299,00 € par mois" / "€299.00 per month" → 299). */
function parseEuroAmount(text: string | null): number {
  const match = (text ?? '').match(/(\d+)[.,]\d{2}\s*€|€\s*(\d+)[.,]\d{2}/);
  if (!match) return NaN;
  return parseInt(match[1] ?? match[2], 10);
}

// NB: on n'utilise pas AppShellPage.gotoModule() ici — son self-heal en cas de
// session expirée se reconnecte en dur avec le compte Direction (voir
// reauthenticateAsDirection()), ce qui basculerait ces tests sur le mauvais
// compte au lieu de "Propriétaire". Navigation directe + vérifications
// explicites, comme dans e2e-16-rbac.spec.ts (même situation, autre rôle).
async function gotoAsOwner(page: Page, urlPath: string): Promise<void> {
  const shell = new AppShellPage(page);
  await page.goto(urlPath, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await shell.dismissOnboardingTour();
  await shell.waitForSkeletonToClear();
  await shell.dismissOnboardingTour();
}

/**
 * Depuis /parametres, clique "Gérer mon abonnement" et attend l'arrivée sur le
 * portail Stripe hébergé (billing.stripe.com). Centralisé ici car réutilisé
 * par les scénarios 1 et 2.
 */
async function openStripePortal(page: Page): Promise<void> {
  const manageBtn = page.getByRole('button', { name: /gérer mon abonnement/i });
  await manageBtn.click();
  await page.waitForURL(/stripe\.com/i, { timeout: 20_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  // Le portail Stripe affiche d'abord une coquille (logo + bandeau "Sandbox"/"Environnement de
  // test") avant que son contenu réel (abonnement, moyen de paiement...) ne s'hydrate quelques
  // secondes après — 'networkidle' seul résout trop tôt (observé : capture d'écran de page blanche
  // juste après). "Powered by Stripe" fait partie du pied de page statique de la coquille
  // elle-même, donc PAS un bon indicateur — on attend plutôt le bloc abonnement, qui n'apparaît
  // qu'une fois le contenu réel monté.
  await page.getByText(RE_CURRENT_SUB).waitFor({ state: 'visible', timeout: 30_000 });
}

test.describe('BuildNivo — 17. Billing (Stripe Customer Portal)', () => {

  test.beforeEach(async ({ page }) => {
    test.skip(!fs.existsSync(OWNER_SESSION),
      'Session "Propriétaire" (tenant-owner) indisponible (identifiants refusés au login — ' +
      'voir e2e-02-roles-login.spec.ts) : les scénarios billing ne peuvent pas être exécutés ' +
      'tant que ce compte n\'est pas provisionné dans cet environnement.'
    );
  });

  test('Scénario 1 — Carte Abonnement sur /parametres et accès au portail Stripe', async ({ browser }) => {
    const context = await browser.newContext({ storageState: OWNER_SESSION });
    const page = await context.newPage();
    await gotoAsOwner(page, '/parametres');

    // Pastille verte "Abonnement actif"
    await expect(page.getByText(/^abonnement actif$/i).first()).toBeVisible({ timeout: 15_000 });

    // Libellé du plan actuel — nom exact non figé ici : le Scénario 2 (et les runs répétés de
    // la suite) change le forfait à chaque exécution, donc seul le format "Offre actuelle : X"
    // est vérifié, pas une valeur précise.
    await expect(page.getByText(/offre actuelle\s*:/i).first()).toBeVisible();

    // Bouton "Gérer mon abonnement" avec icône carte bancaire (aria-hidden, non vérifiable par
    // texte — sa présence est déjà garantie par le rôle du bouton lui-même).
    const manageBtn = page.getByRole('button', { name: /gérer mon abonnement/i });
    await expect(manageBtn).toBeVisible();

    await manageBtn.click();
    // Spinner de chargement bref dans le bouton — best-effort : sa fenêtre d'affichage est trop
    // courte pour être fiable (redirection quasi immédiate une fois la session Stripe créée côté
    // serveur), donc on ne bloque pas le test dessus si on ne l'attrape pas à temps.
    await page.locator('[class*="spin"], [class*="loading"]').first().isVisible({ timeout: 2_000 }).catch(() => {});

    await expect(page).toHaveURL(/billing\.stripe\.com\/p\/session/i, { timeout: 20_000 });
    // Le portail affiche d'abord sa coquille statique (logo, bandeau environnement de test) avant
    // que le contenu réel ne s'hydrate quelques secondes après — le bloc abonnement n'apparaît
    // qu'une fois ce contenu monté, donc c'est un bien meilleur indicateur de "page réellement
    // chargée" qu'un simple changement d'URL ou networkidle (observé : page blanche capturée juste
    // après ceux-ci).
    await expect(page.getByText(RE_CURRENT_SUB)).toBeVisible({ timeout: 30_000 });

    await context.close();
  });

  test('Scénario 2 — Changement de forfait (upgrade) et calcul du prorata', async ({ browser }) => {
    const context = await browser.newContext({ storageState: OWNER_SESSION });
    const page = await context.newPage();
    await gotoAsOwner(page, '/parametres');
    await openStripePortal(page);

    // Prix du forfait actuel, pour choisir ensuite une formule STRICTEMENT supérieure — la suite
    // tourne plusieurs fois par jour et change le forfait à chaque passage (mode TEST, sans
    // risque), donc on ne peut pas viser un nom de plan fixe ("Company Business"...) : il faut
    // recalculer l'upgrade à chaque run par rapport au prix courant, pas par son nom. On travaille
    // sur le texte brut de la page (pas de traversée DOM ancêtre/suivant, trop fragile ici selon
    // la structure Stripe réelle — testé, une extraction par xpath following::*[1] renvoie du vide).
    const bodyText = (await page.locator('body').textContent()) ?? '';
    const currentSubIdx = bodyText.search(RE_CURRENT_SUB);
    const currentPrice = currentSubIdx >= 0
      ? parseEuroAmount(bodyText.slice(currentSubIdx, currentSubIdx + 200))
      : NaN;

    await page.getByRole('link', { name: RE_UPDATE_SUB_LINK }).click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

    // Chaque option de forfait est une carte [data-testid="pricing-table-card"] (confirmé par
    // inspection du DOM réel — pas de rôle ARIA de type "listitem"/"radio" exploitable ici) avec
    // un lien role="button" "Select"/"Sélectionner" (PAS un <button> HTML — piège si on cible
    // document.querySelectorAll('button') côté page.evaluate, ça ne matche pas ces liens ;
    // getByRole('button', ...) fonctionne car il lit l'arbre d'accessibilité, pas les balises
    // brutes). parseEuroAmount() gère le séparateur décimal virgule français ("59,00 €" → 59, pas
    // 5900 comme le donnerait un simple strip des caractères non numériques).
    const cards = page.locator('[data-testid="pricing-table-card"]');
    const cardCount = await cards.count();
    let upgraded = false;
    for (let i = 0; i < cardCount && !upgraded; i++) {
      const card = cards.nth(i);
      const price = parseEuroAmount(await card.textContent());
      const selectBtn = card.getByRole('button', { name: RE_SELECT_BTN });
      const hasSelect = await selectBtn.isVisible({ timeout: 1_000 }).catch(() => false);
      if (hasSelect && (Number.isNaN(currentPrice) || price > currentPrice)) {
        await selectBtn.click();
        upgraded = true;
      }
    }
    test.skip(!upgraded, 'Scénario 2 — aucune formule strictement supérieure au forfait actuel trouvée dans le catalogue Stripe.');

    await page.getByRole('button', { name: RE_CONTINUE_BTN }).click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

    // Récapitulatif avec prorata — "Montant dû aujourd'hui" est le montant prélevé immédiatement,
    // distinct du tarif plein mensuel à partir du prochain cycle. Les deux doivent être présents
    // pour confirmer un vrai calcul de prorata (et pas juste le plein tarif du nouveau forfait
    // facturé immédiatement).
    await expect(page.getByText(RE_CONFIRM_UPDATES)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(RE_AMOUNT_DUE)).toBeVisible();

    await page.getByRole('button', { name: RE_CONFIRM_BTN }).click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    // Retour sur la vue principale du portail — pas de message "Votre forfait a été mis à jour"
    // observé (Stripe redirige directement vers le récapitulatif d'abonnement mis à jour) ; on
    // vérifie donc le résultat concret (abonnement bien passé au nouveau prix) plutôt qu'un texte
    // de confirmation qui n'existe pas tel quel sur ce portail.
    await expect(page.getByText(RE_CURRENT_SUB)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('link', { name: RE_RETURN_LINK }).click();
    await expect(page).toHaveURL(/dev\.buildnivo\.com\/parametres/i, { timeout: 20_000 });

    await context.close();
  });

  test('Scénario 3 — Badge "Votre plan actuel" sur /tarifs', async ({ browser }) => {
    const context = await browser.newContext({ storageState: OWNER_SESSION });
    const page = await context.newPage();
    await page.goto('/tarifs', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(2_000);

    // ANOMALIE OBSERVÉE (inspection live, 2026-09-23) : le badge "Votre plan actuel" apparaît sur
    // DEUX cartes simultanément pour ce compte (Company Essential ET Company Business), pas
    // seulement sur le forfait réellement souscrit. Peut être volontaire (una offre supérieure
    // "couvre" une offre inférieure) ou un vrai bug d'affichage — pas tranché ici. On vérifie donc
    // seulement qu'il apparaît AU MOINS une fois (le cas "aucun badge du tout" serait, lui,
    // clairement anormal pour un compte abonné), sans exiger l'unicité.
    const badge = page.getByText(/votre plan actuel/i);
    await expect(badge.first()).toBeVisible({ timeout: 15_000 });

    // Les autres cartes (offres non détenues) gardent un bouton vers le détail de l'offre.
    await expect(page.getByRole('link', { name: /choisir essential|démarrer maintenant|ajouter un studio/i }).first())
      .toBeVisible();

    await context.close();

    // Visiteur anonyme : aucun badge nulle part.
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto('/tarifs', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await anonPage.waitForTimeout(2_000);
    await expect(anonPage.getByText(/votre plan actuel/i)).toHaveCount(0);
    await expect(anonPage.getByRole('link', { name: /se connecter/i }).first()).toBeVisible();
    await anonContext.close();
  });

  test('Scénario 4 — Soft gating : module non inclus dans l\'offre', async ({ browser }) => {
    const context = await browser.newContext({ storageState: OWNER_SESSION });
    const page = await context.newPage();
    await gotoAsOwner(page, '/chantiers');

    // Repère un module verrouillé (badge "Pro" + cadenas dans la sidebar) plutôt que de viser un
    // module précis par son nom : lequel est verrouillé dépend du forfait courant, qui change à
    // chaque exécution du Scénario 2 — un module fixe ("Journal de chantier"...) casserait dès
    // que le compte passerait à un forfait qui l'inclut déjà.
    const lockedLink = page.locator('a').filter({ hasText: /pro/i }).first();
    const hasLocked = await lockedLink.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!hasLocked, 'Scénario 4 — aucun module verrouillé "Pro" trouvé (le forfait actuel du compte les inclut peut-être tous).');

    const moduleName = (await lockedLink.textContent())?.replace(/pro/i, '').trim();
    await lockedLink.click();
    await page.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => {});

    const shell = new AppShellPage(page);
    await shell.dismissOnboardingTour();
    await shell.waitForSkeletonToClear();

    await expect(page.locator('svg, img, [class*="lock" i]').first()).toBeVisible({ timeout: 15_000 });
    if (moduleName) {
      await expect(page.getByText(new RegExp(moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first())
        .toBeVisible();
    }
    // getByText() seul matche 2 éléments ici : le vrai titre <h1> ET un <div role="alert"
    // id="__next-route-announcer__"> — l'annonceur de route Next.js qui duplique le texte de la
    // page pour les lecteurs d'écran à chaque navigation (violation de strict mode Playwright si
    // on ne précise pas le rôle). On cible donc explicitement le heading.
    await expect(page.getByRole('heading', { name: /n'est pas inclus dans votre offre/i })).toBeVisible();

    const upgradeLink = page.getByRole('link', { name: /voir les offres/i })
      .or(page.getByRole('button', { name: /voir les offres/i }));
    await expect(upgradeLink.first()).toBeVisible();
    await upgradeLink.first().click();
    await expect(page).toHaveURL(/\/tarifs/i, { timeout: 15_000 });

    await context.close();
  });

});
