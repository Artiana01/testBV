# Automatisation E2E locale

Ce dossier ajoute un cycle autonome : lecture des digests `latest`, comparaison PostgreSQL,
file sérielle, nettoyage BuildNivo, notifications SMTP. Il ne démarre pas les serveurs UI,
ne déploie rien et n'installe aucun cron. Le hub et ses endpoints restent inchangés.

## Images vérifiées dans les Jenkinsfiles locaux

Registre commun : `registry.bluevaloris.com`. Les chemins ci-dessous sont relatifs à
`/media/Volume_57GB/ops/_cicd/`. Une branche indiquée signifie une lecture par
`git show branche:Jenkinsfile`, sans checkout ni modification du dépôt CI/CD.

| appKey | Port interne | Image front (`:latest`) | Source Jenkinsfile front |
| --- | --- | --- | --- |
| buildnivo | 4009 | app-buildnivo-dev | `app-buildnivo-cicd/Jenkinsfile`, `IMAGE_NAME`, ligne 27 |
| bvtech | 4001 | bluevaloris-tech | `bluevaloris-tech-cicd/Jenkinsfile`, `IMAGE_NAME`, ligne 10, branche `develop` |
| bvbusiness | 4002 | bvb-frontend-staging | `bvb-frontend-cicd/Jenkinsfile`, `FRONTEND_IMAGE`, ligne 15 |
| bvinvest | 4003 | bluevaloris-invest-frontend | `bluevaloris-invest-cicd/Jenkinsfile`, `FRONTEND_IMAGE`, ligne 11 |
| emiragate | 4004 | emiragate-frontend-dev | `emiragate-frontend-cicd/Jenkinsfile`, `APP_IMAGE`, ligne 6 |
| bvportage | 4005 | bluevaloris-portage-app-v1-staging | `bluevaloris-portage-app-v1-cicd/Jenkinsfile`, `IMAGE_NAME`, ligne 12, branches `dev` et `staging` |
| bvportageFreelance | 4006 | bluevaloris-portage-app-v1-staging | même frontend et même domaine que bvportage, suite distincte |
| creerailleurs | 4007 | creerailleurs-front-dev | `creerailleurs-cicd`, branche `develop`, `Jenkinsfile`, `IMAGE_NAME`, ligne 6 |
| launchpad | 4008 | bluevaloris-tech-staging | `bluevaloris-tech-cicd`, branche `staging`, `Jenkinsfile`, `IMAGE_NAME`, ligne 7 |

| appKey | Image API surveillée (`:latest`) | Source Jenkinsfile API |
| --- | --- | --- |
| buildnivo | api-buildnivo-dev | `api-buildnivo-cicd`, branche `develop`, `IMAGE_NAME`, ligne 22 |
| bvtech | bv-tech-api | `bv-tech-api-cicd`, branche `develop`, `IMAGE_NAME`, ligne 6 |
| bvbusiness | bvb-back-staging | `bvb-backend-cicd`, branche `staging`, `BACKEND_IMAGE`, ligne 15 |
| bvinvest | bluevaloris-invest-backend | `bluevaloris-invest-cicd`, branche `dev`, `BACKEND_IMAGE`, ligne 12 |
| emiragate | emiragate-api | `emiragate-api-cicd`, branche `develop`, `APP_IMAGE`, ligne 11 |
| bvportage | bluevaloris-portage-api-v1 | `bluevaloris-portage-api-v1-cicd`, branche `dev`, `IMAGE_NAME`, ligne 11 |
| bvportageFreelance | bluevaloris-portage-api-v1 | même API dev que bvportage, suivi indépendant par suite |
| creerailleurs | creerailleurs-api-devprod | `creer-ailleurs-api-cicd`, branche `develop`, `IMAGE_NAME`, ligne 11 |
| launchpad | bv-tech-api-staging | `bv-tech-api-cicd`, branche `staging`, `IMAGE_NAME`, ligne 6 |

Les configurations Playwright confirment les domaines cibles. Le suffixe `staging` de l'image
Portage est conservé : le Jenkinsfile de la branche `dev` le définit aussi, avec le credential
`envPortageFrontDev`. Les deux suites ciblent `dev.bluevalorisportage.com` et surveillent donc
l'API `dev`, sans suffixe `staging`. Launchpad cible `staging.bluevaloristech.com`, avec
l'API Tech staging ; l'image `launch-pad-api-prod` d'un autre dépôt concerne la production.
Les neuf projets ont une image API distincte identifiée. Invest construit ses deux images
dans le même pipeline, contrairement aux autres projets qui ont un dépôt CI/CD backend séparé.

Le digest détecte une publication du tag dans le registre ; il ne confirme pas que le serveur
a déjà terminé son redéploiement. Aucun accès Jenkins n'est utilisé pendant un cycle.

## Configuration

Node.js 22.16+ ou 24 recommandé (`fetch`, `AbortSignal.any`, tests Node sans isolation).
Depuis la racine du checkout :

```bash
npm --prefix e2e-tests ci --ignore-scripts
node e2e-tests/automation/run-cycle.js --dry-run --mock --apps buildnivo,bvtech,bvbusiness
```

L'installation ignore le `postinstall` existant qui téléchargerait les navigateurs Playwright.
Pour une exécution réelle, Chromium et ses dépendances doivent déjà être installés.
Configurer `e2e-tests/.env` à partir de `e2e-tests/.env.example` ou injecter les variables
depuis le gestionnaire de secrets. L'environnement du processus est prioritaire sur ce fichier.
Ne jamais versionner un `.env`, afficher ses valeurs ou passer un secret en argument de commande.

| Variable | Usage |
| --- | --- |
| `DATABASE_URL` | Base d'historisation existante, commune aux app-servers et au cycle |
| `REGISTRY_AUTH` | En-tête `Authorization` complet : schéma Basic avec encodage base64 du couple utilisateur/mot de passe, ou Bearer avec un jeton valide ; vide pour un registre public |
| `SMTP_HOST`, `SMTP_PORT` | Hôte et port SMTP |
| `SMTP_USER`, `SMTP_PASSWORD` | Authentification SMTP, omise si le relais n'en demande pas |
| `SMTP_FROM` | Expéditeur |
| `SMTP_SECURE` | `true` sur 465 ; `false` pour STARTTLS sur 587 |
| `MAIL_ALERT_TO` | Destinataires des alertes, séparés par des virgules |
| `MAIL_SUMMARY_TO` | Destinataires du récapitulatif, séparés par des virgules |
| `AUTOMATION_RUN_TIMEOUT_MS` | Délai maximal d'une suite ; défaut quatre heures, plage autorisée une seconde à un jour |

Les Jenkinsfiles utilisent `docker.withRegistry(..., 'docker-registry-creds')` pour une
authentification utilisateur/mot de passe gérée par Jenkins. Le cycle ne lit ni ce credential,
ni la configuration Docker : seul `REGISTRY_AUTH` est transmis au registre, sous HTTPS,
sans suivre de redirection. L'encodage Basic ne chiffre pas le secret.

Dans **`e2e-tests/apps/creerailleurs/.env` réel non committé**, mettre manuellement
`BASE_URL=https://dev.creerailleurs.com`. Le `.env.example` et le fallback de la configuration
Playwright utilisent déjà cette URL ; le `.env` existant peut encore surcharger cette valeur.
Les libellés d'URL du hub n'ont pas été modifiés.

## Simulation et exécution

```bash
node e2e-tests/automation/run-cycle.js --dry-run --mock --apps buildnivo,bvtech,bvbusiness
node e2e-tests/automation/run-cycle.js --dry-run --apps buildnivo,bvtech,bvbusiness
```

La première commande est entièrement hors ligne : seule l'API BuildNivo a changé,
empreinte inchangée pour BV Tech, premier passage pour BV Business. Elle affiche la file,
le nettoyage prévu et les notifications prévues. `--mock` est refusé sans `--dry-run`.

La seconde lit réellement le registre et PostgreSQL, prend le verrou si la DB est disponible,
initialise ou migre le schéma de suivi sous verrou, y compris en dry-run réel, sans modifier
les digests connus. Elle n'appelle pas les API des app-servers, ne lance ni suite ni nettoyage
et n'envoie aucun mail. Aucune empreinte n'est consommée par une simulation.
Sans DB, aucune suite n'est lancée. Une erreur registre est isolée par image : les autres
images du projet et les autres projets restent vérifiés. Si une autre image a changé,
le projet reste à tester ; sinon son état est indéterminé et il n'est pas lancé.

Après validation locale, démarrer les neuf serveurs existants dans un autre terminal :

```bash
npm --prefix e2e-tests start
node e2e-tests/automation/run-cycle.js
```

`--apps appKey,appKey` limite la sélection ; son absence sélectionne les neuf apps.
Avant chaque lancement réel, les neuf `/status` doivent être accessibles et inactifs.
Une suite active ou un statut inaccessible interrompt la file sans attendre indéfiniment.
Les lancements manuels depuis l'UI doivent être évités pendant un cycle : les endpoints
existants ne fournissent pas de réservation atomique commune à l'UI et à l'automatisation.

## Persistance, séquentialité et erreurs

`apps.js` décrit les ports et un tableau `images` de couples `{ role, image }` par projet,
avec un rôle unique par image. Un projet peut n'avoir qu'une entrée `front`.
`deploy-watch.js` réutilise **le pool singleton
de `database/db.js`**, sans créer de nouvelle connexion applicative ou de second pool.
Le cycle réserve un client de ce pool pour garder le verrou PostgreSQL consultatif
de session pendant toute la file et le récapitulatif. `pg_try_advisory_lock` est non bloquant :
un second cycle logue explicitement le tour ignoré, sans mail ni lancement. Les processus
doivent partager la même base PostgreSQL. Une perte du client annule les lancements suivants.

La table est décrite dans `database/schema.sql` et créée de façon idempotente par
`deploy-watch.js` après acquisition du verrou. La migration est faite **en place**, dans une
transaction : ajout de `role` avec la valeur `front` pour les anciennes lignes, remplacement
de l'ancienne clé primaire `app_key` par `(app_key, role)`, puis retrait du défaut de `role`.
Les neuf digests front, noms d'images et dates existants sont conservés. Une deuxième
ouverture accepte le schéma déjà migré. Une erreur annule toute la transaction.
Le rôle PostgreSQL doit pouvoir créer et modifier cette table. La migration s'applique aussi
en dry-run réel, comme la création de table existante ; `--dry-run --mock` reste sans DB.
Les nouvelles lignes API seront créées lors de leur première vérification hors dry-run.

| Colonne | Sens |
| --- | --- |
| `app_key text not null` | Suite concernée ; les deux suites Portage restent indépendantes |
| `role text not null` | `front` ou `api` ; clé primaire composite `(app_key, role)` |
| `image_name text not null` | Image exacte, sans registre ni tag |
| `last_digest text` | Dernier digest dont le run est terminé ; NULL tant qu'aucun run n'est acquitté |
| `checked_at timestamptz not null` | Date de la dernière lecture réussie du registre et de la comparaison en DB |

Premier passage, changement de nom ou de digest d'au moins une image : suite à tester.
Tous les digests lus avant le lancement sont acquittés ensemble dans une seule requête après
un run terminé, même échoué, pour éviter une répétition à chaque cron sur la même version.
Un déploiement survenu pendant le run reste donc détectable au cycle suivant.
Si une image n'a pas pu être vérifiée, aucun digest du projet n'est acquitté : le récapitulatif
et les logs signalent l'état incomplet pour permettre une reprise avec toutes les images.
Une suite non lancée, interrompue, inconnue ou un nettoyage échoué laisse le digest à reprendre.
Un changement de nom d'image remet `last_digest` à NULL. Une erreur registre laisse la ligne intacte.

`app-runner.js` ouvre `/events` **avant** `POST /run` et attend la fin du run, avec vérification
de `/status`. Les compteurs et noms des tests échoués sont extraits des événements existants
avec les parseurs de `history.js`. Aucun endpoint supplémentaire n'est nécessaire et aucune
lecture d'un ancien run n'est utilisée pour décider du résultat courant.
Une perte de flux ou un dépassement de délai produit un résultat indéterminé : le cycle
ne tue pas la suite distante ; si son arrêt ne peut pas être confirmé, la file est interrompue.

`cycle.js` enchaîne les apps avec des `await`. Après BuildNivo uniquement, il démarre un
sous-processus asynchrone pour la configuration **existante**
`playwright.buildnivo.cleanup.config.ts`, puis attend sa fermeture avant l'app suivante,
que les tests aient réussi ou échoué. Un nettoyage échoué interrompt la file ; aucun nettoyage
n'est associé aux huit autres apps. La sortie du sous-processus est ignorée pour éviter
la reproduction de données sensibles dans les logs de l'automatisation.

`mailer.js` envoie une alerte dès l'échec constaté, avant le nettoyage, puis **un récapitulatif
par cycle complet** : apps inchangées, simulées, différées, indéterminées, testées et compteurs.
Ce choix permet d'associer chaque mail à une détection sans ajouter de planificateur quotidien.
Un cycle ignoré par le verrou n'envoie rien. Un destinataire absent ou vide produit un
avertissement mentionnant le nom de variable ; un défaut SMTP ne bloque jamais la file.
Les logs ne contiennent ni credentials, ni réponses brutes, ni dumps de tests. Les valeurs
sensibles connues par leurs variables d'environnement sont masquées dans les corps des mails.

## Tests de l'automatisation

```bash
node --test --test-isolation=none e2e-tests/automation/automation.test.js
```

Les tests injectent registre, client PostgreSQL, transport SMTP et API SSE simulés ; aucun
serveur ni service réel n'est requis. Ils vérifient la comparaison, le verrou, l'ordre sériel,
les résultats SSE, la rupture de flux, le nettoyage attendu, les destinataires et le dry-run.

Il n'existe pas de `tsconfig.json` à la racine de `e2e-tests`. Les configurations présentes
dans le dépôt se vérifient avec :

```bash
cd e2e-tests
npx --no-install tsc --noEmit -p apps/bvportage-freelance/tsconfig.json
cd ../e2e-platform
npx --no-install tsc --noEmit
```

Si le système de fichiers refuse d'exécuter le shim `tsc`, appeler le même compilateur
avec `node e2e-tests/node_modules/typescript/bin/tsc --noEmit -p CHEMIN_TSCONFIG`
depuis la racine du dépôt. Les nouveaux scripts sont JavaScript CommonJS, sans nouveau projet TS.

Validation de cette mission : les 16 tests Node et le dry-run sur les neuf apps passent.
Les cas multi-image couvrent le changement API seul, le changement front seul, le premier
digest API, le renommage d'image, les erreurs isolées par rôle, l'acquittement complet et
l'absence d'acquittement partiel. Le client PostgreSQL est simulé : la migration sur la base
réelle et la validation dans le conteneur restent à effectuer avant le push.
La vérification TS de Portage Freelance échoue sur une configuration existante
(`TS5070`, résolution `classic` avec `resolveJsonModule`). Celle d'`e2e-platform` échoue
sur les dépendances/types absents dans ce checkout (`@playwright/test`, types Node,
puis erreurs de typage associées). Ces fichiers n'ont pas été modifiés.

## Cron après validation uniquement

Exemple toutes les trente minutes, à adapter aux chemins absolus du checkout validé,
du binaire Node et d'un fichier de logs accessible :

```cron
*/30 * * * * cd /chemin/absolu/du/checkout && /chemin/absolu/vers/node e2e-tests/automation/run-cycle.js >> /chemin/absolu/vers/automation.log 2>&1
```

Les variables proviennent du `.env` ignoré ou d'un environnement de service protégé,
jamais de la ligne cron. Aucun cron n'a été installé par cette mission.
