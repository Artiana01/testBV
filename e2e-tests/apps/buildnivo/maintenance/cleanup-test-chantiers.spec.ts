/** Nettoyage ponctuel des anciens chantiers E2E. DRY_RUN=1 : inventaire sans mutation. */
import { test, expect, Browser, Page } from '@playwright/test';
import { openModuleAs } from '../pages/RoleSession';
import { getRole } from '../roles';
import { deleteTestProjects, listProjects, TEST_CHANTIER_NAME, TestProject } from '../test-data';

export { TEST_CHANTIER_NAME } from '../test-data';

// Le compte Salarié dépendait d'un ancien chantier RÉGRESSION. Son compte existant
// rejoint la démo afin de pouvoir supprimer ce chantier sans casser ses tests.
async function preserveSalaryFixture(browser: Browser, operator: Page, demo: TestProject) {
  const { context, page } = await openModuleAs(browser, 'salarie', '/chantiers', { projectScoped: false });
  try {
    const projects = await listProjects(page);
    if (projects.some(project => !TEST_CHANTIER_NAME.test(project.name))) return;
    const user = await page.evaluate(async () => {
      const response = await fetch('/api/auth/me', { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Session Salarié : HTTP ${response.status}`);
      const json = await response.json();
      return json?.data?.user ?? json?.data;
    });
    expect(user?.id, 'Compte Salarié existant avant rattachement').toBeTruthy();
    expect(user?.email?.toLowerCase(), 'Identité du seul compte de recette à rattacher')
      .toBe(getRole('salarie').login.toLowerCase());
    const result = await operator.evaluate(async ({ projectId, email }) => {
      const xsrf = decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) ?? [])[1] ?? '');
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST', credentials: 'include', signal: AbortSignal.timeout(30_000),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrf },
        body: JSON.stringify({ email, role_code: 'ouvrier', invitation_type: 'salarie' }),
      });
      return { status: response.status, json: await response.json() };
    }, { projectId: demo.id, email: user.email });
    expect(result.status, 'Rattachement du compte existant à Résidence Itaosy').toBe(201);
    expect(result.json.data.account_created, 'Aucun nouveau compte').toBe(false);
    expect(result.json.data.email_sent, 'Aucun e-mail envoyé pour le compte existant').toBe(false);
    expect((await listProjects(page)).some(project => project.id === demo.id), 'Fixture Salarié stable avant suppression').toBe(true);
    console.log('Compte Salarié existant rattaché à Résidence Itaosy avec le rôle Ouvrier.');
  } finally { await context.close(); }
}

test('Nettoyage des chantiers de test E2E', async ({ browser }, testInfo) => {
  test.setTimeout(30 * 60_000);
  const dryRun = !!process.env.DRY_RUN && process.env.DRY_RUN !== '0';
  const { context, page } = await openModuleAs(browser, 'direction', '/chantiers', { projectScoped: false });
  try {
    const all = await listProjects(page);
    const targets = all.filter(project => TEST_CHANTIER_NAME.test(project.name));
    const kept = all.filter(project => !TEST_CHANTIER_NAME.test(project.name));
    const demo = kept.filter(project => /^résidence itaosy$/i.test(project.name));
    expect(demo, 'Résidence Itaosy doit être conservé').toHaveLength(1);
    await testInfo.attach('inventaire-nettoyage', {
      body: JSON.stringify({ dryRun, targets, kept }, null, 2), contentType: 'application/json',
    });
    console.log(`Inventaire : ${all.length} chantiers, ${targets.length} E2E à supprimer, ${kept.length} conservés.`);
    if (dryRun) {
      console.log('DRY_RUN : aucune modification. Exemples :', JSON.stringify(targets.slice(0, 5)));
      return;
    }
    if (targets.length) {
      await preserveSalaryFixture(browser, page, demo[0]);
      await deleteTestProjects(page, targets);
    }
    const remaining = await listProjects(page);
    expect(remaining.filter(project => TEST_CHANTIER_NAME.test(project.name)), 'Aucun chantier E2E restant').toEqual([]);
    const remainingIds = new Set(remaining.map(project => project.id));
    expect(kept.filter(project => !remainingIds.has(project.id)), 'Tous les chantiers hors E2E sont conservés').toEqual([]);
    console.log(`Nettoyage vérifié : ${targets.length} supprimés, ${remaining.length} chantiers conservés.`);
  } finally { await context.close(); }
});
