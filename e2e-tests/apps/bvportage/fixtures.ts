/**
 * fixtures.ts
 * Fixtures personnalisées pour les tests BV Portage
 */
import { test as base, Page } from '@playwright/test';
import { SignupPage } from './pages/SignupPage';
import { LoginPage } from './pages/LoginPage';
import { OtpPage } from './pages/OtpPage';
import { AgencyDashboardPage } from './pages/AgencyDashboardPage';
import { PackPage } from './pages/PackPage';
import { ClientPage } from './pages/ClientPage';
import { MissionPage } from './pages/MissionPage';
import { TeamPage } from './pages/TeamPage';
import { ContractPage } from './pages/ContractPage';
import { KycPage } from './pages/KycPage';
import { InvoicePage } from './pages/InvoicePage';
import { PaymentPage } from './pages/PaymentPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

type BVPortageFixtures = {
  signupPage: SignupPage;
  loginPage: LoginPage;
  otpPage: OtpPage;
  agencyDashboardPage: AgencyDashboardPage;
  packPage: PackPage;
  clientPage: ClientPage;
  missionPage: MissionPage;
  teamPage: TeamPage;
  contractPage: ContractPage;
  kycPage: KycPage;
  invoicePage: InvoicePage;
  paymentPage: PaymentPage;
  adminDashboardPage: AdminDashboardPage;
};

export const test = base.extend<BVPortageFixtures>({
  // ── signupPage : instancié SANS navigation automatique ──────────────────
  // La navigation se fait dans le test pour éviter les doubles navigations.
  signupPage: async ({ page }, use) => {
    const signupPage = new SignupPage(page);
    await use(signupPage);
  },

  // ── loginPage : instancié SANS navigation automatique ───────────────────
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  otpPage: async ({ page }, use) => {
    const otpPage = new OtpPage(page);
    await use(otpPage);
  },

  agencyDashboardPage: async ({ page }, use) => {
    const agencyDashboardPage = new AgencyDashboardPage(page);
    await use(agencyDashboardPage);
  },

  packPage: async ({ page }, use) => {
    const packPage = new PackPage(page);
    await use(packPage);
  },

  clientPage: async ({ page }, use) => {
    const clientPage = new ClientPage(page);
    await use(clientPage);
  },

  missionPage: async ({ page }, use) => {
    const missionPage = new MissionPage(page);
    await use(missionPage);
  },

  teamPage: async ({ page }, use) => {
    const teamPage = new TeamPage(page);
    await use(teamPage);
  },

  contractPage: async ({ page }, use) => {
    const contractPage = new ContractPage(page);
    await use(contractPage);
  },

  kycPage: async ({ page }, use) => {
    const kycPage = new KycPage(page);
    await use(kycPage);
  },

  invoicePage: async ({ page }, use) => {
    const invoicePage = new InvoicePage(page);
    await use(invoicePage);
  },

  paymentPage: async ({ page }, use) => {
    const paymentPage = new PaymentPage(page);
    await use(paymentPage);
  },

  adminDashboardPage: async ({ page }, use) => {
    const adminDashboardPage = new AdminDashboardPage(page);
    await use(adminDashboardPage);
  },
});

export { expect } from '@playwright/test';
