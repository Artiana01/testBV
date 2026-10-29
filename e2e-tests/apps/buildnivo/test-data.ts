import { BrowserContext, Page, Response } from '@playwright/test';

export const TEST_CHANTIER_NAME = /^(?:E2E Chantier|RÉGRESSION Chantier|E2E BUILDNIVO-304|E2E Reprise) \d{13}(?:-\d+)?(?: modifié)?$/u;
export interface TestProject { id: string; name: string }

export async function listProjects(page: Page): Promise<TestProject[]> {
  return page.evaluate(async () => {
    const projects = new Map<string, { id: string; name: string }>();
    for (let current = 1; current <= 100; current++) {
      const response = await fetch(`/api/projects?page=${current}&per_page=25`, {
        credentials: 'include', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Lecture des chantiers : HTTP ${response.status}, page ${current}`);
      const json = await response.json();
      const rows = json?.data?.data ?? json?.data;
      if (!Array.isArray(rows)) throw new Error('Format de liste des chantiers inattendu');
      const before = projects.size;
      for (const row of rows) projects.set(row.id, { id: row.id, name: row.name ?? row.title ?? '' });
      const lastPage = json?.meta?.pagination?.last_page ?? json?.data?.last_page;
      if (!rows.length || (lastPage ? current >= lastPage : rows.length < 25)) return [...projects.values()];
      if (projects.size === before) throw new Error('Pagination des chantiers ignorée par le serveur');
    }
    throw new Error('Inventaire incomplet : plus de 100 pages de chantiers');
  });
}

/** Ne supprime que les identifiants effectivement créés par le test observé. */
export class TestProjectCleaner {
  private readonly projects = new Map<string, TestProject>();
  private readonly pending = new Set<Promise<void>>();
  private readonly errors: string[] = [];

  constructor(private readonly context: BrowserContext) {
    context.on('response', this.onResponse);
  }

  private readonly onResponse = (response: Response): void => {
    if (response.request().method() !== 'POST'
      || new URL(response.url()).pathname !== '/api/projects' || !response.ok()) return;
    let name: string;
    try { name = response.request().postDataJSON()?.name ?? ''; } catch { return; }
    if (!TEST_CHANTIER_NAME.test(name)) return;
    const capture = (async () => {
      try {
        const json = await response.json();
        const id = json?.data?.id ?? json?.data?.data?.id;
        if (!id) throw new Error(`Identifiant absent après création de ${name}`);
        this.projects.set(id, { id, name });
      } catch (error) { this.errors.push(String(error)); }
    })();
    this.pending.add(capture);
    void capture.finally(() => this.pending.delete(capture));
  };

  async cleanup(page: Page): Promise<TestProject[]> {
    this.context.off('response', this.onResponse);
    await Promise.all([...this.pending]);
    const projects = [...this.projects.values()];
    await deleteTestProjects(page, projects);
    if (this.errors.length) throw new Error(this.errors.join('\n'));
    return projects;
  }
}

export async function deleteTestProjects(page: Page, projects: TestProject[]): Promise<void> {
  for (const project of projects) {
    if (!TEST_CHANTIER_NAME.test(project.name) || !/^[\w-]+$/.test(project.id)) {
      throw new Error(`Suppression refusée : chantier hors périmètre E2E (${project.name})`);
    }
  }
  const results = await page.evaluate(async targets => {
    const xsrf = decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) ?? [])[1] ?? '');
    const out: Array<{ id: string; name: string; status: number }> = [];
    for (const project of targets) {
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
          method: 'DELETE', credentials: 'include', signal: AbortSignal.timeout(20_000),
          headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrf },
        });
        out.push({ ...project, status: response.status });
      } catch { out.push({ ...project, status: 0 }); }
    }
    return out;
  }, projects);
  const failures = results.filter(result => ![200, 204, 404, 410].includes(result.status));
  if (failures.length) throw new Error(`Nettoyage des chantiers E2E refusé : ${JSON.stringify(failures)}`);
}
