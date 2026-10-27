# E2E Tests - Projet Playwright

Projet de tests End-to-End automatisés avec Playwright et TypeScript.
Conçu pour tester plusieurs applications différentes depuis un seul projet centralisé.

---

## 1. Installation

### Prérequis
- Node.js 18+ installé
- npm 9+

### Étapes

```bash
# 1. Installer les dépendances
npm install

# 2. Installer les navigateurs Playwright
npx playwright install

# 3. Copier le fichier de configuration et remplir les valeurs
cp .env.example .env
```

Ouvrir le fichier `.env` et remplir :

```env
BASE_URL=https://votre-app.com
TEST_EMAIL=votre@email.com
TEST_PASSWORD=votremotdepasse
```

---

## 2. Lancer les tests

```bash
# Lancer TOUS les tests
npm test

# Lancer les tests d'une application spécifique
npm run test:app-template

# Voir le rapport HTML après les tests
npm run test:report
```

---

## 3. Quand tu reçois un nouveau projet

Voici les 4 étapes pour démarrer des tests sur une nouvelle application.

### Étape 1 - Copier le template

```bash
# Copier le dossier app-template et renommer selon l'application
cp -r apps/app-template apps/nom-de-lapp
```

Exemples de noms : `apps/saas-crm`, `apps/boutique-ecommerce`, `apps/vitrine-restaurant`

### Étape 2 - Configurer le .env

```bash
# Dans le nouveau dossier de l'application
cp apps/nom-de-lapp/.env.example apps/nom-de-lapp/.env
```

Remplir les valeurs dans `apps/nom-de-lapp/.env` :

```env
BASE_URL=https://url-de-la-nouvelle-app.com
TEST_EMAIL=compte-de-test@email.com
TEST_PASSWORD=motdepasse-de-test
```

### Étape 3 - Lancer Codegen pour explorer l'app

```bash
npm run codegen -- https://url-de-la-nouvelle-app.com
```

Un navigateur Chrome s'ouvre. Naviguez dans l'application : chaque action que vous effectuez génère automatiquement du code Playwright dans la fenêtre à droite.

### Étape 4 - Nettoyer et organiser le code généré

Copiez le code généré depuis Codegen et organisez-le en Page Objects dans le bon dossier. Voir la section "Workflow complet" ci-dessous pour un exemple concret.

---

## 4. Workflow complet : du scénario au test automatisé

### Scénario reçu du testeur

> "Vérifier que l'utilisateur peut se connecter avec son email et son mot de passe, et qu'il est redirigé vers le tableau de bord."

### Étape 1 - Recevoir le scénario

Le testeur vous transmet le scénario à automatiser (souvent en texte simple ou dans un fichier partagé).

### Étape 2 - Lancer Codegen sur l'app

```bash
npm run codegen -- https://mon-saas.com
```

### Étape 3 - Jouer le scénario dans Chrome

Dans la fenêtre Chrome ouverte par Codegen :
1. Aller sur `/login`
2. Cliquer sur le champ email et taper une adresse
3. Cliquer sur le champ mot de passe et taper un mot de passe
4. Cliquer sur le bouton "Se connecter"

Le code se génère automatiquement dans la fenêtre Codegen.

### Étape 4 - Copier le code brut généré

**AVANT (code brut Codegen) :**

```typescript
await page.goto('/login');
await page.locator('#email').fill('test@test.com');
await page.locator('#password').fill('password');
await page.locator('button[type="submit"]').click();
await expect(page).toHaveURL('/dashboard');
```

### Étape 5 - Organiser en Page Objects

**APRÈS (code nettoyé en Page Object) :**

```typescript
// LoginPage.ts
async login(email: string, password: string) {
  await this.navigate('/login');
  await this.page.locator('#email').fill(email);           // 👉 ADAPTER
  await this.page.locator('#password').fill(password);     // 👉 ADAPTER
  await this.page.locator('button[type="submit"]').click(); // 👉 ADAPTER
}
```

```typescript
// login.spec.ts
test('Connexion utilisateur valide', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.login(
    process.env.TEST_EMAIL!,
    process.env.TEST_PASSWORD!
  );
  await expect(page).toHaveURL('/dashboard');
});
```

### Étape 6 - Lancer le test

```bash
npm run test:nom-de-lapp
```

---

## 5. Outils Playwright disponibles

### Codegen - Générer du code automatiquement

```bash
# Desktop (résolution standard)
npm run codegen -- https://ton-app.com

# Mobile (iPhone 12)
npm run codegen:mobile -- https://ton-app.com

# Générer directement dans un fichier de test
npx playwright codegen --output=apps/saas/tests/login.spec.ts https://ton-app.com
```

### Debug - Déboguer un test qui échoue

```bash
# Lance les tests en mode debug (navigateur visible, pas à pas)
npm run debug

# Ou avec PWDEBUG directement
PWDEBUG=1 npm test
```

En mode debug, une fenêtre Playwright Inspector s'ouvre. Vous pouvez :
- Avancer pas à pas dans les actions
- Voir les sélecteurs suggérés
- Inspecter les éléments de la page

### Inspector - Inspecter une page manuellement

```bash
PWDEBUG=1 npm test
```

---

## 6. Structure du projet

```
e2e-tests/
├── apps/                          # Un sous-dossier par application testée
│   └── app-template/              # Template à copier pour chaque nouvelle app
│       ├── pages/
│       │   └── LoginPage.ts       # Page Object de la page de connexion
│       ├── tests/
│       │   ├── login.spec.ts      # Tests de connexion/déconnexion
│       │   └── navigation.spec.ts # Tests de navigation dans l'app
│       └── .env.example           # Variables d'environnement de l'app
│
├── shared/                        # Code partagé entre toutes les applications
│   ├── pages/
│   │   └── BasePage.ts            # Classe de base dont héritent tous les Page Objects
│   └── utils/
│       └── helpers.ts             # Fonctions utilitaires (date, email aléatoire...)
│
├── playwright.config.ts           # Configuration centrale de Playwright
├── package.json                   # Scripts npm et dépendances
├── .env.example                   # Template de variables d'environnement
└── README.md                      # Ce fichier
```

### Interaction entre les fichiers

```
playwright.config.ts
    ↓ configure
    ↓ lance les fichiers dans apps/**/*.spec.ts

login.spec.ts
    ↓ importe
    └── LoginPage.ts
            ↓ hérite de
            └── BasePage.ts (shared)

login.spec.ts
    ↓ peut importer
    └── helpers.ts (shared)
```

---

## 7. Ajouter un nouveau test

### Étape 1 - Ouvrir le fichier de test concerné

```
apps/mon-app/tests/login.spec.ts
```

### Étape 2 - Ajouter un bloc `test()`

```typescript
test('Description claire du scénario', async ({ page }) => {
  // 1. Préparer (arrange)
  const loginPage = new LoginPage(page);

  // 2. Agir (act)
  await loginPage.login();

  // 3. Vérifier (assert)
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Bienvenue')).toBeVisible();
});
```

### Étape 3 - Lancer le test pour vérifier

```bash
npm run test:mon-app
```

---

## 8. Bonnes pratiques pour les sélecteurs

Les sélecteurs indiquent à Playwright **quel élément cliquer ou remplir**. Certains sélecteurs sont plus stables que d'autres quand l'interface change.

### Priorité recommandée

| Priorité | Type | Exemple | Stabilité |
|----------|------|---------|-----------|
| 1 | `data-testid` | `getByTestId('login-btn')` | Excellente - ne change que si intentionnel |
| 2 | Rôle ARIA | `getByRole('button', { name: 'Se connecter' })` | Très bonne - basée sur l'accessibilité |
| 3 | Label | `getByLabel('Email')` | Bonne - pour les formulaires |
| 4 | ID | `locator('#email')` | Acceptable - si stable |
| 5 | Classe CSS | `locator('.btn-blue')` | Fragile - change souvent |

### Exemples concrets

```typescript
// ✅ Privilégier - sélecteurs sémantiques et stables
page.getByRole('button', { name: 'Se connecter' })
page.getByLabel('Email')
page.getByTestId('login-button')
page.getByPlaceholder('votre@email.com')
page.getByText('Bienvenue sur le tableau de bord')

// ⚠️ Acceptable - sélecteurs par ID
page.locator('#email')
page.locator('#submit-btn')

// ❌ Fragile - à éviter si possible
page.locator('.btn-primary-blue-v2')
page.locator('div > span:nth-child(3)')
page.locator('[class*="button"]')
```

### Astuce - Utiliser Codegen pour trouver le meilleur sélecteur

```bash
npm run codegen -- https://votre-app.com
```

Codegen suggère automatiquement le sélecteur le plus approprié quand vous cliquez sur un élément.

---

## 9. Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `BASE_URL` | URL de base de l'application | `https://mon-app.com` |
| `TEST_EMAIL` | Email du compte de test | `test@monapp.com` |
| `TEST_PASSWORD` | Mot de passe du compte de test | `MotDePasse123!` |

> **Sécurité** : Ne committez jamais le fichier `.env` dans Git. Il est déjà inclus dans `.gitignore`.

---

## 10. Résolution de problèmes courants

### "Les sélecteurs ne trouvent pas les éléments"

1. Lancer Codegen pour inspecter la page : `npm run codegen -- https://mon-app.com`
2. Lancer en mode debug pour voir ce qui se passe : `npm run debug`
3. Vérifier que la page est bien chargée avant d'interagir : `await page.waitForLoadState('networkidle')`

### "Le test échoue à cause d'un timeout"

Augmenter le timeout dans `playwright.config.ts` :
```typescript
timeout: 60_000, // 60 secondes au lieu de 30
```

Ou pour un test spécifique :
```typescript
test('Test lent', async ({ page }) => {
  test.setTimeout(60_000); // 60 secondes pour ce test uniquement
  // ...
});
```

### "Les identifiants ne sont pas chargés"

Vérifier que le fichier `.env` existe bien :
```bash
ls -la .env
ls -la apps/mon-app/.env
```

Si le fichier n'existe pas :
```bash
cp .env.example .env
# Remplir les valeurs dans .env
```

---

## 11. Gestion de l'historique des tests

Pour maintenir le projet propre et éviter l'accumulation de données inutiles, utilisez les outils de nettoyage.

### Afficher les statistiques

```bash
npm run stats
```

Affiche la taille totale des rapports et résultats, ainsi que l'ancienneté des fichiers.

### Nettoyer l'historique - Mode Interactif

```bash
npm run clean
```

Menu interactif avec options pour nettoyer :
- Tous les rapports HTML
- Tous les résultats de tests  
- Tout nettoyer
- Nettoyage personnalisé

### Nettoyer l'historique - Mode Automatisé

```bash
# Nettoie TOUT (rapports + résultats)
npm run clean:all

# Nettoie uniquement les rapports
npm run clean:reports

# Nettoie uniquement les résultats  
npm run clean:results
```

### Cas d'usage recommandés

**Avant une session de test importante :**
```bash
npm run clean:all && npm run test:bvtech
```

**En CI/CD (pipeline automatisé) :**
```bash
npm run clean:all
npm run test:bvtech
# Autres étapes de pipeline...
```

**Consultation de rapport** :
```bash
npm run clean:reports
npm run test:bvtech
npm run test:report
```

Pour plus de détails, consultez le guide complet : [HISTORY_CLEANUP.md](./HISTORY_CLEANUP.md)

---
