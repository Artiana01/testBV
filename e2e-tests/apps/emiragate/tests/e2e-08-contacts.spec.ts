/**
 * SC-08 : Gestion des contacts (IMPORTANT)
 *
 * Préconditions : admin connecté (storageState admin)
 * Couvre : tableau affiché, recherche fonctionnelle
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ContactsPage } from '../pages/ContactsPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

test.describe('SC-08 — Gestion des contacts (IMPORTANT)', () => {

  test('08.1 — La page contacts est accessible', async ({ page }) => {
    test.setTimeout(60_000);
    const contacts = new ContactsPage(page);
    await contacts.goto();
    await contacts.verifyContactsPageLoaded();
  });

  test('08.2 — Le tableau des contacts est affiché', async ({ page }) => {
    test.setTimeout(60_000);
    const contacts = new ContactsPage(page);
    await contacts.goto();
    await contacts.verifyContactTableVisible();
  });

  test('08.3 — La recherche dans les contacts fonctionne', async ({ page }) => {
    test.setTimeout(60_000);
    const contacts = new ContactsPage(page);
    await contacts.goto();
    await contacts.verifySearchFunctional();
  });

});
