/**
 * e2e-20-rapports-ia.spec.ts
 * -----------------------
 * "Rapports IA" — comptes rendus de chantier (journalier / synthèse hebdo /
 * relances) générés par un agent LLM distant (observé en direct : modèle
 * "gemini-3-flash-preview", avec un mode "fallback-local" en repli), validés
 * par un humain avant tout envoi.
 *
 * Couvre la structure de la page et la restriction de rôle (lecture seule
 * pour Maître d'ouvrage : pas de prompt système, pas de Générer/Modifier/
 * Régénérer — confirmé en comparant les rendus réels Direction vs MOA).
 *
 * NE DÉCLENCHE PAS "Générer avec l'Agent IA" / "Régénérer" : ce sont de
 * vrais appels à un LLM distant qui écrivent par-dessus le rapport existant
 * du chantier actif (partagé avec d'autres tests/l'environnement de démo),
 * contrairement au Stripe Customer Portal (billing) dont le mode test avait
 * été confirmé explicitement avant d'automatiser le flux réel. Aucune
 * confirmation équivalente n'a été donnée ici — à ajouter si confirmé.
 */

import { test, expect } from '@playwright/test';
import { openModuleAs } from '../pages/RoleSession';

test.describe('BuildNivo — Rapports IA', () => {

  test('Direction — page complète : onglets, prompt système, actions Modifier/Régénérer, export PDF', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'direction', '/rapports');

    await expect(page.getByRole('heading', { name: 'Rapports IA', level: 1 })).toBeVisible();

    const tabJournalier = page.getByRole('tab', { name: /rapport journalier/i });
    const tabHebdo = page.getByRole('tab', { name: /synthèse hebdo/i });
    const tabRelances = page.getByRole('tab', { name: /relances/i });
    await expect(tabJournalier).toBeVisible();
    await expect(tabHebdo).toBeVisible();
    await expect(tabRelances).toBeVisible();
    await expect(tabJournalier).toHaveAttribute('aria-selected', 'true');

    // Section prompt système — réservée aux rôles avec droit de génération.
    await expect(page.getByRole('heading', { name: /directives.*prompt système/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /générer avec l.agent ia/i })).toBeVisible();

    // Rapport existant : actions d'édition + métadonnée de génération réelle (agent/modèle + date).
    await expect(page.getByRole('button', { name: /^modifier$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^régénérer$/i })).toBeVisible();
    await expect(page.getByText(/généré le .+(agentic|fallback-local)/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /télécharger en pdf/i })).toBeVisible();

    await context.close();
  });

  test('Direction — changement d\'onglet : Synthèse hebdo et Relances affichent un contenu propre à l\'onglet', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'direction', '/rapports');

    await page.getByRole('tab', { name: /synthèse hebdo/i }).click();
    await page.waitForTimeout(1_000);
    await expect(page.getByRole('tab', { name: /synthèse hebdo/i })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: /synthèse hebdomadaire/i })).toBeVisible();

    await page.getByRole('tab', { name: /relances/i }).click();
    await page.waitForTimeout(1_000);
    await expect(page.getByRole('tab', { name: /relances/i })).toHaveAttribute('aria-selected', 'true');
    // "Relances" : consigne de régénération partagée + liste de relances préparées par l'IA.
    // Chaque relance est éditable, et celles pas encore parties attendent une validation
    // humaine explicite ("Valider l'envoi") — jamais d'envoi automatique ("Envoyée" sinon).
    await expect(page.getByRole('button', { name: /^régénérer$/i })).toBeVisible();
    const relances = page.getByText(/^Relance\b/);
    if (await relances.count() > 0) {
      await expect(page.getByRole('button', { name: /^modifier$/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /valider l.envoi/i }).or(page.getByText('Envoyée', { exact: true })).first())
        .toBeVisible();
    } else {
      await expect(page.getByText(/aucune relance à préparer/i)).toBeVisible();
    }

    await context.close();
  });

  test('Maître d\'ouvrage — accès en lecture seule confirmé : pas de prompt système, pas de Générer/Modifier/Régénérer', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'maitre-ouvrage', '/rapports');

    // La page se charge bien pour ce rôle (contenu métier légitime), contrairement à
    // /admin/activity-logs (e2e-19) qui ne devrait jamais être accessible à personne d'autre
    // que Superadmin — deux restrictions de nature différente, pas à confondre.
    await expect(page.getByRole('heading', { name: 'Rapports IA', level: 1 })).toBeVisible();

    await expect(page.getByRole('heading', { name: /directives.*prompt système/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /générer avec l.agent ia/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^modifier$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^régénérer$/i })).toHaveCount(0);

    // La lecture/export reste permise : seule la production de contenu est restreinte.
    await expect(page.getByRole('button', { name: /télécharger en pdf/i })).toBeVisible();

    await context.close();
  });

  test('Direction — export PDF déclenche un téléchargement réel', async ({ browser }) => {
    const { context, page } = await openModuleAs(browser, 'direction', '/rapports');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      page.getByRole('button', { name: /télécharger en pdf/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    await context.close();
  });

});
