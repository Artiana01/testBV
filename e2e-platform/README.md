# E2E Platform

Multi-application Playwright test suite. Supports e-commerce, SaaS, and vitrine apps in a single project.

---

## Quick start

```bash
cd e2e-platform
cp .env.example .env        # fill in your URLs & credentials
npm install
npx playwright install
npm test                    # run all tests
```

---

## Run specific tests

```bash
# By app type
npm run test:ecommerce
npm run test:saas
npm run test:vitrine

# By environment
npm run test:staging
npm run test:prod

# By browser project
npm run test:chromium
npm run test:mobile

# Interactive UI mode
npx playwright test --ui
```

---

## Project structure

```
e2e-platform/
├── apps/               # One config file per application
│   ├── index.ts        # App registry
│   ├── shop1.ts
│   ├── saas1.ts
│   └── vitrine1.ts
├── config/
│   ├── environments.ts # URL resolution per env
│   └── types.ts        # Shared TypeScript types
├── pages/              # Page Object Model
│   ├── common/         # BasePage, NavigationPage
│   ├── ecommerce/      # ProductPage, CartPage, CheckoutPage
│   ├── saas/           # LoginPage, DashboardPage
│   └── vitrine/        # HomePage
├── fixtures/
│   ├── base.fixture.ts # Page Object injection
│   └── auth.fixture.ts # Pre-authenticated session
├── utils/
│   ├── helpers.ts      # waitForRequest, retry, uniqueEmail…
│   └── selectors.ts    # Centralised data-testid constants
├── tests/
│   ├── ecommerce/      # cart.spec.ts, checkout.spec.ts
│   ├── saas/           # login.spec.ts, dashboard.spec.ts
│   └── vitrine/        # homepage.spec.ts, navigation.spec.ts
├── .github/workflows/
│   └── e2e-tests.yml   # GitHub Actions CI/CD
├── playwright.config.ts
├── package.json
└── .env.example
```

---

## Adding a new application

1. **Add URLs** in `config/environments.ts` under a new key (e.g. `shop2`).
2. **Create** `apps/shop2.ts` using an existing app as template.
3. **Register** it in `apps/index.ts`.
4. **Add tests** under `tests/ecommerce/` (or create a new folder for a new type).
5. **Add a project** in `playwright.config.ts` pointing to the new `baseURL`.
6. **Add secrets** in GitHub → Settings → Secrets.

---

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `TEST_ENV` | Target environment (`dev`/`staging`/`prod`) | `dev` |
| `BASE_URL_SHOP1` | Override shop1 base URL | from `environments.ts` |
| `BASE_URL_SAAS1` | Override saas1 base URL | from `environments.ts` |
| `BASE_URL_VITRINE1` | Override vitrine1 base URL | from `environments.ts` |
| `SHOP1_USER_EMAIL` | Test user email for shop1 | `test@shop1.com` |
| `SHOP1_USER_PASSWORD` | Test user password for shop1 | `password123` |
| `SAAS1_USER_EMAIL` | Test user email for saas1 | `admin@saas1.com` |
| `SAAS1_USER_PASSWORD` | Test user password for saas1 | `admin123` |

---

## Test tags

| Tag | Scope |
|---|---|
| `@ecommerce` | All e-commerce tests |
| `@saas` | All SaaS tests |
| `@vitrine` | All vitrine/showcase tests |
| `@shop1` | shop1 only |
| `@saas1` | saas1 only |

```bash
npx playwright test --grep @saas
```

---

## Selectors strategy

- Prefer `data-testid` attributes (see `utils/selectors.ts`) - they survive CSS/text refactors.
- Fall back to ARIA roles (`getByRole`) for semantic elements.
- Avoid CSS class selectors; avoid XPath.

---

## Reports

After a test run, open the HTML report:

```bash
npm run report
```

Artifacts in CI are uploaded as `report-ecommerce`, `report-saas`, `report-vitrine`, and merged into `e2e-report-merged`.

---

## CI/CD - GitHub Secrets to configure

| Secret | Description |
|---|---|
| `BASE_URL_SHOP1` | Staging/prod URL for shop1 |
| `BASE_URL_SAAS1` | Staging/prod URL for saas1 |
| `BASE_URL_VITRINE1` | Staging/prod URL for vitrine1 |
| `SHOP1_USER_EMAIL` | Test account email |
| `SHOP1_USER_PASSWORD` | Test account password |
| `SAAS1_USER_EMAIL` | Test account email |
| `SAAS1_USER_PASSWORD` | Test account password |
