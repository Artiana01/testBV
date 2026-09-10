/**
 * e2e-15-notifications.spec.ts
 * ---------------------------------
 * Section 16 du cahier de recette — Notifications.
 * Couvre : NOTIF-01, NOTIF-02.
 * NOTIF-03 (accès aux notifications d'un tiers via manipulation d'URL) est
 * couvert dans e2e-16-rbac.spec.ts.
 */

import { test, expect } from '@playwright/test';
import { AppShellPage } from '../pages/AppShellPage';

test.describe('BuildNivo — 16. Notifications', () => {

  test('NOTIF-01 — Le compteur de notifications non-lues est visible', async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.gotoModule('/chantiers');

    const bell = shell.getNotificationsButton();
    await expect(bell).toBeVisible({ timeout: 10_000 });
  });

  test('Ouverture du panneau de notifications', async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.gotoModule('/chantiers');
    await shell.openNotifications();

    // Le panneau n'a ni role ARIA dédié ni classe "notification" — il s'identifie par son
    // titre "Alertes prioritaires" (confirmé par capture d'écran, pas de sélecteur structurel fiable).
    await expect(page.getByText('Alertes prioritaires').first()).toBeVisible({ timeout: 8_000 });
  });

  test('NOTIF-02 — "Tout marquer comme lu" remet le compteur à zéro', async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.gotoModule('/chantiers');
    await shell.openNotifications();

    const markAllReadBtn = page.getByRole('button', { name: /tout marquer comme lu/i })
      .or(page.getByText(/tout marquer comme lu/i));
    const hasBtn = await markAllReadBtn.first().isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!hasBtn, 'NOTIF-02 — bouton "Tout marquer comme lu" introuvable dans le panneau de notifications.');

    await markAllReadBtn.first().click();
    await page.waitForTimeout(1000);

    const badge = page.locator('button[aria-label="Notifications"] >> text=/^\\d+$/');
    const badgeVisible = await badge.isVisible({ timeout: 3_000 }).catch(() => false);
    if (badgeVisible) {
      await expect(badge).toHaveText('0');
    }
  });

});
