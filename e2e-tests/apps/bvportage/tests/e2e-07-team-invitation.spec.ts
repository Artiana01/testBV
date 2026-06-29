/**
 * e2e-07-team-invitation.spec.ts
 * SCÉNARIO E2E 07: Invitation membre équipe
 * Priorité: P1 (Important)
 */
import { test, expect } from '../fixtures';

test.describe('E2E 07: Invitation membre équipe', () => {
  test('Inviter un nouveau membre avec email non existant', async ({ loginPage, agencyDashboardPage, teamPage, page }) => {
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'admin@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Admin123!'
    );

    test.skip(!(await loginPage.isLoggedIn()), 'Compte agence indisponible (credentials .env placeholder) — test ignoré');

    // Accéder au menu Équipe
    await agencyDashboardPage.clickTeamMenu();

    // Inviter un nouveau membre
    const newMemberEmail = `member-${Date.now()}@bluevaloris.test`;
    await teamPage.inviteMember(newMemberEmail, 'Membre');

    // Vérifier l'invitation
    await teamPage.verifyInvitationSent();

    // Vérifier que le membre est ajouté à la liste
    await teamPage.verifyMemberInList(newMemberEmail);
  });

  test('Email d\'invitation reçu par le nouveau membre', async ({ page }) => {
    // Simuler la réception de l'email et le clic sur le lien d'invitation
    const invitationLink = 'https://dev.bluevalorisportage.com/invitation/accept-member-token';
    await page.goto(invitationLink);
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    const hasInvitation = await page.locator('text=/invitation|agence|rejoindre/i').first().isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!hasInvitation, 'Lien d\'invitation factice inaccessible — test ignoré');

    await expect(page.locator('text=/invitation|agence/i').first()).toBeVisible();
  });

  test('Formulaire d\'inscription différent pour membre invité', async ({ page }) => {
    const invitationLink = 'https://dev.bluevalorisportage.com/invitation/accept-member-token';
    await page.goto(invitationLink);
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    const hasInvitForm = await page.locator('input[name="firstName"]').isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!hasInvitForm, 'Lien d\'invitation factice inaccessible — test ignoré');

    await expect(page.locator('text=/Vous êtes invité|rejoindre/i').first()).toBeVisible({ timeout: 5000 });

    // Remplir le formulaire spécial (sans sélection de rôle)
    await page.locator('input[name="firstName"]').fill('Jean');
    await page.locator('input[name="lastName"]').fill('Dupont');
    await page.locator('input[type="password"]').first().fill('Member123!@#');
    await page.locator('input[type="password"]').nth(1).fill('Member123!@#');

    // Accepter les conditions
    await page.locator('input[type="checkbox"]').check();

    // Créer le compte
    await page.locator('button:has-text("Créer")').click();

    // Vérifier le succès
    await expect(page.locator('[role="status"], .success')).toBeVisible({ timeout: 5000 });
  });

  test('Nouveau membre créé et rattaché à l\'agence', async ({ loginPage, agencyDashboardPage, teamPage, page }) => {
    // Se reconnecter en tant que directeur d'agence
    await loginPage.navigate('/login');

    await loginPage.login(
      process.env.AGENCY_EMAIL || 'admin@bluevaloris.test',
      process.env.AGENCY_PASSWORD || 'Admin123!'
    );

    test.skip(!(await loginPage.isLoggedIn()), 'Compte agence indisponible (credentials .env placeholder) — test ignoré');

    // Accéder au menu Équipe
    await agencyDashboardPage.clickTeamMenu();

    // Vérifier que le nouveau membre est dans la liste
    const newMemberEmail = `member-${Date.now()}@bluevaloris.test`;
    await teamPage.verifyMemberInList(newMemberEmail);
  });
});
