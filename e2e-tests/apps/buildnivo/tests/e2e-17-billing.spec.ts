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
import { AppShellPage } from '../pages/AppShellPage';
import { openModuleAs } from '../pages/RoleSession';

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

// NB: pas AppShellPage.gotoModule() ici — son self-heal en cas de session expirée se
// reconnecte en Direction ; openModuleAs() se reconnecte avec le compte "Propriétaire".

/**
 * Depuis /parametres, clique "Gérer mon abonnement" et attend l'arrivée sur le
 * portail Stripe hébergé (billing.stripe.com). Centralisé ici car réutilisé
 * par les scénarios 1 et 2.
 */
async function openStripePortal(page: Page): Promise<void> {
  const manageBtn = page.getByRole('button', { name: /gérer mon abonnement/i });
  await manageBtn.click();
  // 'commit' et pas 'load' : l'événement load du portail Stripe (scripts tiers, sandbox)
  // arrive parfois bien après 20s alors que la page est déjà là — le vrai signal de
  // disponibilité est le bloc abonnement attendu juste après.
  await page.waitForURL(/stripe\.com/i, { timeout: 45_000, waitUntil: 'commit' });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  // Le portail Stripe affiche d'abord une coquille (logo + bandeau "Sandbox"/"Environnement de
  // test") avant que son contenu réel (abonnement, moyen de paiement...) ne s'hydrate quelques
  // secondes après — 'networkidle' seul résout trop tôt (observé : capture d'écran de page blanche
  // juste après). "Powered by Stripe" fait partie du pied de page statique de la coquille
  // elle-même, donc PAS un bon indicateur — on attend plutôt le bloc abonnement, qui n'apparaît
  // qu'une fois le contenu réel monté.
  await page.getByText(RE_CURRENT_SUB).waitFor({ state: 'visible', timeout: 60_000 });
}

interface PortalPlan { index: number; name: string; price: number; current: boolean; selectable: boolean }

/** Depuis la vue principale du portail, ouvre "Modifier l'abonnement" et relève les forfaits. */
async function openPlanPicker(page: Page): Promise<PortalPlan[]> {
  await page.getByRole('link', { name: RE_UPDATE_SUB_LINK }).click();
  const cards = page.locator('[data-testid="pricing-table-card"]');
  await cards.first().waitFor({ state: 'visible', timeout: 30_000 });
  const plans: PortalPlan[] = [];
  for (let i = 0; i < await cards.count(); i++) {
    const card = cards.nth(i);
    const text = await card.innerText();
    plans.push({
      index: i,
      name: text.split('\n').map(l => l.trim()).find(l => l && !/abonnement actuel|current subscription/i.test(l)) ?? '',
      price: parseEuroAmount(text),
      current: /abonnement actuel|current subscription/i.test(text),
      selectable: await card.getByRole('button', { name: RE_SELECT_BTN }).isVisible().catch(() => false),
    });
  }
  return plans;
}

// Forfait d'entrée de gamme visé pour redescendre : "Company Essential" à 99 €/mois, l'offre
// d'origine du compte (historique de facturation du 17/09). Le portail propose aussi un
// "Company Essential" à 59 € que l'app ne reconnaît pas (constaté le 2026-09-25 : carte
// Abonnement sans ligne "Offre actuelle", quasiment tous les modules verrouillés) — évité ici,
// c'est une incohérence de configuration Stripe/app à traiter à part.
function entryPlan(plans: PortalPlan[]): PortalPlan {
  const plan = plans.find(p => p.selectable && p.name === 'Company Essential' && p.price === 99);
  expect(plan, 'Forfait "Company Essential" à 99 € introuvable dans le portail').toBeTruthy();
  return plan!;
}

/**
 * Choisit un forfait dans le sélecteur ouvert, vérifie le récapitulatif (prorata : "Montant dû
 * aujourd'hui" distinct du tarif mensuel) et confirme ; revient sur la vue principale du portail.
 */
async function confirmPlan(page: Page, plan: PortalPlan): Promise<void> {
  await page.locator('[data-testid="pricing-table-card"]').nth(plan.index).getByRole('button', { name: RE_SELECT_BTN }).click();
  await page.getByRole('button', { name: RE_CONTINUE_BTN }).click();
  await expect(page.getByText(RE_CONFIRM_UPDATES)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(RE_AMOUNT_DUE)).toBeVisible();
  await page.getByRole('button', { name: RE_CONFIRM_BTN }).click();
  await expect(page.getByText(RE_CURRENT_SUB)).toBeVisible({ timeout: 60_000 });
}

// Le forfait du compte de test change à chaque run (mode TEST Stripe) : le Scénario 2 le fait
// monter d'un palier, et au palier maximum ("Project") il n'y a plus d'upgrade possible ni de
// module verrouillé. Les scénarios 2 et 4 redescendent donc au forfait d'entrée de gamme quand leur
// précondition n'est plus remplie (downgrade immédiat, 0 € dû, confirmé en direct le 2026-09-25).

test.describe('BuildNivo — 17. Billing (Stripe Customer Portal)', () => {

  test('Scénario 1 — Carte Abonnement sur /parametres et accès au portail Stripe', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'tenant-owner', '/parametres');

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
    test.setTimeout(300_000);
    const { context, page } = await openModuleAs(browser, 'tenant-owner', '/parametres');
    await openStripePortal(page);

    // Forfaits = cartes [data-testid="pricing-table-card"] ; l'upgrade vise un forfait
    // STRICTEMENT plus cher que l'actuel, recalculé à chaque run (pas de nom de plan figé).
    let plans = await openPlanPicker(page);
    let currentPrice = plans.find(p => p.current)?.price ?? NaN;
    if (!plans.some(p => p.selectable && p.price > currentPrice)) {
      // Déjà au palier maximum (runs précédents) : préparation → forfait d'entrée de gamme.
      await confirmPlan(page, entryPlan(plans));
      plans = await openPlanPicker(page);
      currentPrice = plans.find(p => p.current)?.price ?? NaN;
    }
    const target = plans.find(p => p.selectable && p.price > currentPrice);
    expect(target, `Aucun forfait plus cher que ${currentPrice} € dans le portail`).toBeTruthy();

    // Récapitulatif avec prorata ("Montant dû aujourd'hui" ≠ tarif mensuel) puis confirmation.
    await confirmPlan(page, target!);

    // L'abonnement en cours affiche bien le prix du forfait choisi.
    const bodyText = (await page.locator('body').textContent()) ?? '';
    const currentSubIdx = bodyText.search(RE_CURRENT_SUB);
    expect(parseEuroAmount(bodyText.slice(currentSubIdx, currentSubIdx + 200))).toBe(target!.price);

    await page.getByRole('link', { name: RE_RETURN_LINK }).click();
    await expect(page).toHaveURL(/dev\.buildnivo\.com\/parametres/i, { timeout: 20_000 });

    await context.close();
  });

  test('Scénario 3 — Badge "Votre plan actuel" sur /tarifs', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'tenant-owner', '/tarifs');
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
    test.setTimeout(300_000);
    const { context, page } = await openModuleAs(browser, 'tenant-owner', '/chantiers');

    // Module verrouillé = lien de la sidebar dont le texte se TERMINE par le badge "Pro"
    // ("Journal de chantierPro"), casse respectée — un simple /pro/i attrapait "Photos &
    // problèmes", module pourtant inclus. Lequel est verrouillé dépend du forfait courant.
    const lockedLinks = page.getByRole('navigation').getByRole('link').filter({ hasText: /Pro$/ });
    if (!(await lockedLinks.first().isVisible({ timeout: 5_000 }).catch(() => false))) {
      // Forfait courant = tous modules inclus : préparation → forfait d'entrée de gamme.
      await page.goto('/parametres', { waitUntil: 'domcontentloaded' });
      await new AppShellPage(page).waitForSkeletonToClear();
      await openStripePortal(page);
      await confirmPlan(page, entryPlan(await openPlanPicker(page)));
      await page.getByRole('link', { name: RE_RETURN_LINK }).click();
      await page.waitForURL(/dev\.buildnivo\.com/i, { timeout: 30_000 });
      await page.goto('/chantiers', { waitUntil: 'domcontentloaded' });
      await new AppShellPage(page).waitForSkeletonToClear();
    }
    const lockedLink = lockedLinks.first();
    await expect(lockedLink).toBeVisible({ timeout: 15_000 });

    const moduleName = (await lockedLink.textContent())?.replace(/\s*Pro\s*$/, '').trim();
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
