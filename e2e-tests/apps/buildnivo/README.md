# Tests BuildNivo - avant-projet et devis IA

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
