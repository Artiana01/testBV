/**
 * cleanup-test-chantiers.spec.ts
 * ----------------------------------
 * Maintenance (hors suite de recette) : supprime les chantiers jetables créés par les tests E2E
 * et jamais nettoyés ("E2E Chantier …", "RÉGRESSION Chantier …", "E2E BUILDNIVO-304 …", "E2E Reprise …").
 * Ils s'accumulent à chaque run, paginent la liste /chantiers et ralentissent les tests.
 *
 * Seuls les noms correspondant EXACTEMENT à ces préfixes sont supprimés — jamais les chantiers de
 * démo ("Résidence Itaosy", "Residence Antsirabe", …) ni un chantier créé à la main.
 *
 * Lancement (voir package.json) :
 *   npm run cleanup:buildnivo            → supprime
 *   DRY_RUN=1 npm run cleanup:buildnivo  → liste seulement, ne supprime rien
 *   (PowerShell : $env:DRY_RUN=1; npm run cleanup:buildnivo)
 */

import { test, expect } from '@playwright/test';
import { openModuleAs } from '../pages/RoleSession';

export const TEST_CHANTIER_NAME = /^(E2E Chantier|RÉGRESSION Chantier|E2E BUILDNIVO-304|E2E Reprise) \d/;

test('Nettoyage des chantiers de test E2E', async ({ browser }) => {
  test.setTimeout(30 * 60_000);
  const dryRun = !!process.env.DRY_RUN && process.env.DRY_RUN !== '0';
  const { context, page } = await openModuleAs(browser, 'direction', '/chantiers');

  const projects = await page.evaluate(async () => {
    const out: Array<{ id: string; name: string }> = [];
    for (let p = 1; p <= 50; p++) {
      const res = await fetch(`/api/projects?page=${p}&per_page=100`, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!res.ok) return { error: res.status, out };
      const json = await res.json();
      const rows: any[] = json?.data?.data ?? json?.data ?? [];
      if (!Array.isArray(rows) || rows.length === 0) break;
      const before = out.length;
      for (const r of rows) if (!out.some(o => o.id === r.id)) out.push({ id: r.id, name: r.name ?? r.title ?? '' });
      if (out.length === before) break; // page identique : pagination ignorée par l'API
    }
    return { out };
  });
  expect(projects.error, 'Lecture de la liste des chantiers').toBeUndefined();

  const all = projects.out;
  const targets = all.filter(p => TEST_CHANTIER_NAME.test(p.name));
  const kept = all.filter(p => !TEST_CHANTIER_NAME.test(p.name));
  console.log(`Chantiers au total : ${all.length} — à supprimer : ${targets.length} — conservés : ${kept.length}`);
  console.log('CONSERVÉS :', JSON.stringify(kept.map(k => k.name)));
  expect(kept.length, 'Garde-fou : au moins un chantier de démo doit rester').toBeGreaterThan(0);

  if (dryRun) {
    console.log('DRY_RUN — exemples à supprimer :', JSON.stringify(targets.slice(0, 5).map(t => t.name)));
    await context.close();
    return;
  }

  const results = await page.evaluate(async (ids) => {
    const xsrf = () => decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) ?? [])[1] ?? '');
    const statuses: Record<string, number> = {};
    for (const id of ids) {
      const r = await fetch(`/api/projects/${id}`, { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrf() } });
      statuses[r.status] = (statuses[r.status] ?? 0) + 1;
    }
    return statuses;
  }, targets.map(t => t.id));
  console.log('Résultat des suppressions (statut HTTP → nombre) :', JSON.stringify(results));
  await context.close();
});
