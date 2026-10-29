import { test as base, expect } from '@playwright/test';
import { ChantiersPage } from './pages/ChantiersPage';
import { TestProject, TestProjectCleaner } from './test-data';

export { expect } from '@playwright/test';

export const test = base.extend<{ cleanupProjects: void; testChantier: TestProject }>({
  cleanupProjects: [async ({ context, page }, use, testInfo) => {
    const cleaner = new TestProjectCleaner(context);
    try { await use(); } finally {
      const deleted = await cleaner.cleanup(page);
      if (deleted.length) await testInfo.attach('chantiers-nettoyes', {
        body: JSON.stringify(deleted, null, 2), contentType: 'application/json',
      });
    }
  }, { auto: true, timeout: 90_000 }],

  testChantier: async ({ page, cleanupProjects: _cleanup }, use) => {
    const chantiers = new ChantiersPage(page);
    await chantiers.goto();
    const name = `E2E Chantier ${Date.now()}`;
    await chantiers.openCreateModal();
    await chantiers.fillNom(name);
    await chantiers.fillVille('Antananarivo');
    const [response] = await Promise.all([
      page.waitForResponse(r => new URL(r.url()).pathname === '/api/projects' && r.request().method() === 'POST'),
      chantiers.submitCreate(),
    ]);
    expect(response.ok(), `Création de la fixture chantier : HTTP ${response.status()}`).toBeTruthy();
    const json = await response.json();
    const id = json?.data?.id ?? json?.data?.data?.id;
    expect(id, 'Identifiant du chantier temporaire').toBeTruthy();
    const guide = page.getByRole('dialog').filter({ hasText: `${name} est créé` });
    await expect(guide).toBeVisible({ timeout: 20_000 });
    const later = guide.getByRole('button', { name: 'Plus tard' });
    await expect(later).toBeEnabled();
    // Le guide animé peut rester en mouvement sur une machine chargée ;
    // l'activation au clavier ne dépend pas de la stabilité de ses coordonnées.
    await later.press('Enter');
    await expect(guide).toBeHidden();
    await page.getByRole('searchbox', { name: 'Rechercher un projet' }).fill(name);
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible({ timeout: 30_000 });
    await use({ id, name });
  },
});
