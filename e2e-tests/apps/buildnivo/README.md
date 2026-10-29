# Tests BuildNivo

La recette complète se lance depuis `e2e-tests` :

```powershell
npm run test:buildnivo
npm run test:buildnivo:report
```

Les modules s'ouvrent depuis le registre **Chantiers**, puis par les liens de
l'interface. Ce parcours charge le contexte et les droits du chantier ; sur dev,
un accès direct à certains modules peut afficher « Aucun projet rattaché ».
`ModulePage` sélectionne explicitement **Résidence Itaosy**. `openModuleAs` le
privilégie si le profil y est rattaché et conserve sinon le chantier autorisé du profil.
`revisit` remet le formulaire à zéro par navigation dans l'interface. Les tests de
refus d'accès conservent leurs accès directs aux routes interdites.

Les sessions expirées sont renouvelées avec le rôle demandé. Les erreurs de
passerelle 502/503/504 à la navigation sont retentées une fois ; une panne persistante
fait échouer le scénario avec son statut HTTP. Les assertions métier restent actives.
Les fichiers partagés dans `fixtures.ts` sont un JPEG décodable et un PDF d'une page.
Les profils navigateur, fichiers temporaires et caches des workers sont placés dans `e2e-tests/.tmp-buildnivo/`
(ignoré par Git), sur le disque du dépôt plutôt que sur le disque système.

Les tests qui créent des chantiers importent `test` depuis `../test`. Cette fixture
enregistre les identifiants renvoyés à la création et les supprime à la fin du test,
y compris après un échec ou un renommage. Une suppression refusée fait échouer le
nettoyage. Les tests Finances créent leur propre chantier temporaire ; ils ne dépendent
plus des données laissées par une exécution précédente. Le parcours Reprise conserve
son chantier pendant ses étapes liées, puis le supprime dans `afterAll`.

Pour les anciens chantiers accumulés : `npm run cleanup:buildnivo`. Pour un inventaire
seul sous PowerShell : `$env:DRY_RUN='1'; npm run cleanup:buildnivo` (remettre ensuite
`$env:DRY_RUN='0'`). Seuls les noms E2E reconnus sont ciblés ; les chantiers de démo
sont conservés. Si le compte Salarié dépend encore d'un ancien chantier E2E, son compte
existant est rattaché à Résidence Itaosy en Ouvrier avant la suppression.

Les contrôles d'audit vérifient une session authentifiée, le refus HTTP 403 de
`/api/activity-logs` et le refus final de la console (redirection ou message explicite).
La garde cliente peut afficher brièvement son titre avant de rediriger : ces contrôles
ne mesurent pas l'absence de ce flash d'interface.

## Avant-projet et devis IA

Les suites sont disponibles dans le lanceur BuildNivo (`npm run start:buildnivo`),
dans la suite complète (`npm run test:buildnivo`) et séparément :

```powershell
npm run test:buildnivo:avant-projet
npm run test:buildnivo:devis-ia
```

Elles utilisent le compte Direction configuré dans `.env` et un projet en étude,
accessible dans le registre **Projets**, avec la référence `GUIDE-DEVIS-IA` sur dev.
Pour cibler un autre dossier, ajouter dans `apps/buildnivo/.env` :

```dotenv
BUILDNIVO_AVANT_PROJET_REFERENCE=GUIDE-DEVIS-IA
```

Le dossier doit être actif, non converti en chantier et avoir un chiffrage modifiable.
Un dossier absent fait échouer les tests avec sa référence ; les tests ne créent pas
de projet permanent. Ils sélectionnent explicitement le dossier avant d'ouvrir ses onglets.

`e2e-34` couvre la synthèse, les prérequis du passage en chantier, les critères
de phase, la faisabilité, le chiffrage et les documents. Aucune phase n'est changée
et aucune conversion en chantier n'est déclenchée.

`e2e-35` couvre le formulaire, le blocage sans fichier, la sélection et le retrait
d'un PDF, le refus d'un exécutable et l'abandon des modifications du formulaire.
Le fichier PDF de sélection reste en mémoire et n'est pas envoyé au serveur.

Le scénario `DEVIA-05` simule l'API `quote-extractions` dans le navigateur pour
vérifier les états en cours/échec, les citations du document, l'avertissement sur
les totaux, le blocage sans ligne et sans acceptation explicite d'un doublon,
puis le contenu de la confirmation après correction. Les mutations de ce scénario
sont interceptées. Il ne mesure pas la qualité du modèle IA ni le traitement réel
du document par le serveur.
