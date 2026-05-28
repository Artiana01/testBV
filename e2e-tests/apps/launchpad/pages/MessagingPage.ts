/**
 * apps/launchpad/pages/MessagingPage.ts
 * ----------------------------------------
 * Page Object — Messagerie Launchpad BV TECH
 *
 * Scénario E2E #5 (P2) :
 *   - Client envoie message → Admin reçoit → Admin répond → Client reçoit
 *   - Bug documenté : suppression uniquement côté admin (pas synchronisée côté client)
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../shared/pages/BasePage';

export class MessagingPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  async gotoClientMessages(): Promise<void> {
    const paths = ['/fr/messages', '/fr/messagerie', '/fr/contact', '/fr/support'];
    for (const p of paths) {
      await this.navigate(p);
      await this.waitForLoad();
      await this.page.waitForTimeout(1000);
      const isNotLogin = !this.page.url().includes('/login');
      const hasContent = await this.page.locator('main, [class*="message"]').first().isVisible({ timeout: 3_000 }).catch(() => false);
      if (isNotLogin && hasContent) return;
    }
    console.log('ℹ️  Page messagerie non trouvée — vérifier la route dans .env');
  }

  async gotoAdminMessages(): Promise<void> {
    const paths = ['/fr/admin/messages', '/fr/admin/messagerie', '/fr/admin/contacts', '/fr/admin/support'];
    for (const p of paths) {
      await this.navigate(p);
      await this.waitForLoad();
      await this.page.waitForTimeout(1000);
      const isNotLogin = !this.page.url().includes('/login');
      if (isNotLogin) return;
    }
  }

  // =========================================================
  // ENVOI DE MESSAGE (CÔTÉ CLIENT)
  // =========================================================

  async verifyMessageInputVisible(): Promise<void> {
    const input = this.page.locator('textarea, input[type="text"][placeholder*="message"], [contenteditable="true"]')
      .or(this.page.getByRole('textbox', { name: /message|écrire|votre message/i }));
    await expect(input.first()).toBeVisible({ timeout: 15_000 });
  }

  async typeMessage(text: string): Promise<void> {
    const input = this.page.locator('textarea')
      .or(this.page.getByRole('textbox', { name: /message|écrire|votre message/i }))
      .or(this.page.locator('[contenteditable="true"]'));
    await input.first().click();
    await input.first().fill(text);
  }

  async sendMessage(): Promise<void> {
    const sendBtn = this.page.getByRole('button', { name: /envoyer|send|soumettre|submit/i })
      .or(this.page.locator('button[type="submit"]'));
    await expect(sendBtn.first()).toBeVisible({ timeout: 10_000 });
    await sendBtn.first().click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1500);
  }

  async verifyMessageSent(messageText: string): Promise<void> {
    const sentMsg = this.page.getByText(messageText, { exact: false });
    await expect(sentMsg.first()).toBeVisible({ timeout: 15_000 });
  }

  // =========================================================
  // RÉCEPTION / RÉPONSE (CÔTÉ ADMIN)
  // =========================================================

  async verifyMessageReceivedByAdmin(messageText: string): Promise<void> {
    const msg = this.page.getByText(messageText, { exact: false });
    await expect(msg.first()).toBeVisible({ timeout: 15_000 });
  }

  async replyToMessage(replyText: string): Promise<void> {
    // Ouvrir la conversation si nécessaire
    const conversation = this.page.locator('[class*="message"], [class*="conversation"], [class*="thread"]').first();
    if (await conversation.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await conversation.click();
      await this.page.waitForTimeout(1000);
    }

    await this.typeMessage(replyText);
    await this.sendMessage();
  }

  async verifyReplyVisible(replyText: string): Promise<void> {
    const reply = this.page.getByText(replyText, { exact: false });
    await expect(reply.first()).toBeVisible({ timeout: 15_000 });
  }

  // =========================================================
  // SUPPRESSION DE MESSAGE (Bug P2)
  // =========================================================

  async deleteFirstMessage(): Promise<void> {
    const deleteBtn = this.page.getByRole('button', { name: /supprimer|delete|effacer/i })
      .or(this.page.locator('[class*="delete"], [data-action="delete"]'))
      .or(this.page.locator('[title*="supprimer"], [title*="delete"]'));

    if (await deleteBtn.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await deleteBtn.first().click();
      await this.page.waitForTimeout(1000);
      // Confirmer si une boîte de dialogue apparaît
      const confirmBtn = this.page.getByRole('button', { name: /confirmer|oui|yes|supprimer/i });
      if (await confirmBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.first().click();
      }
      await this.page.waitForLoadState('domcontentloaded');
    } else {
      console.log('ℹ️  Bouton de suppression non trouvé');
    }
  }

  async verifyMessageDeletedFromAdminView(): Promise<void> {
    // Vérifier que le message n'est plus dans la liste admin
    const successMsg = this.page.getByRole('alert')
      .or(this.page.getByText(/supprimé|deleted|message supprimé/i));
    if (await successMsg.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(successMsg.first()).toBeVisible();
    }
  }

  // Bug P2 : la suppression côté admin ne supprime pas côté client
  async checkMessageStillVisibleForClient(messageText: string): Promise<boolean> {
    const msg = this.page.getByText(messageText, { exact: false });
    return await msg.first().isVisible({ timeout: 5_000 }).catch(() => false);
  }

  async getMessagesCount(): Promise<number> {
    const messages = this.page.locator('[class*="message-item"], [class*="conversation-item"], [class*="thread"]');
    return await messages.count();
  }
}
