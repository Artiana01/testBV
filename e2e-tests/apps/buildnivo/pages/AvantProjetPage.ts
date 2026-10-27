import { Browser, expect, Page } from '@playwright/test';
import { openModuleAs, RoleModule } from './RoleSession';

/** Sélection explicite d'un avant-projet : le chantier actif ne possède pas ces onglets. */
export async function openAvantProjet(browser: Browser): Promise<RoleModule> {
  const session = await openModuleAs(browser, 'direction', '/projets');
  const reference = process.env.BUILDNIVO_AVANT_PROJET_REFERENCE ?? 'GUIDE-DEVIS-IA';
  const search = session.page.getByPlaceholder(/rechercher par nom, référence, client ou lieu/i);
  await search.fill(reference);
  const card = session.page.locator('main button').filter({
    has: session.page.getByText(reference, { exact: true }),
  });
  await expect(card, `Avant-projet ${reference} absent du registre`).toHaveCount(1, { timeout: 30_000 });
  await card.click();
  await expect(session.page.getByRole('tab', { name: 'Synthèse', exact: true }))
    .toHaveAttribute('aria-selected', 'true', { timeout: 30_000 });
  return session;
}

export async function openProjectTab(page: Page, name: string, slug: string): Promise<void> {
  const tab = page.getByRole('tab', { name, exact: true });
  await tab.click();
  await expect(page).toHaveURL(new RegExp(`/projet/${slug}(?:[?#]|$)`));
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

export async function closeProjectDialog(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: /fermer|close/i }).first().click();
    await expect(dialog).toBeHidden();
  }
}
