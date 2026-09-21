/**
 * apps/buildnivo/roles.ts
 * ------------------------
 * Référentiel des 13 comptes de démonstration BuildNivo (un par rôle métier
 * du cahier de recette). Utilisé par global-setup.ts (connexion + sauvegarde
 * de session) et par les tests qui ont besoin de basculer de rôle.
 *
 * Chaque `session` correspond au fichier auth/<session>.json généré au
 * global-setup — à utiliser comme storageState dans playwright.buildnivo.config.ts.
 */

export interface BuildNivoRole {
  key: string;          // identifiant court (slug)
  label: string;        // nom du rôle tel qu'affiché dans le cahier de recette
  login: string;        // email ou nom d'utilisateur
  password: string;
  session: string;      // nom du fichier auth/<session>.json
}

export function getRoles(): BuildNivoRole[] {
  return [
    {
      key: 'direction',
      label: 'Direction',
      login: process.env.DIRECTION_EMAIL ?? 'harenakely@test.test',
      password: process.env.DIRECTION_PASSWORD ?? 'Harena@123!!',
      session: 'direction.json',
    },
    {
      key: 'conducteur',
      label: 'Conducteur de travaux',
      // NB: l'email fourni initialement ("condicuteur.test") contenait une coquille —
      // le compte réel sur le chantier de démo est raivosoa@conduteur.test.
      login: process.env.CONDUCTEUR_EMAIL ?? 'raivosoa@conduteur.test',
      password: process.env.CONDUCTEUR_PASSWORD ?? 'Raivo123!!',
      session: 'conducteur.json',
    },
    {
      key: 'chef-chantier',
      label: 'Chef de chantier',
      login: process.env.CHEF_CHANTIER_EMAIL ?? 'rinasoa@chantier.test',
      password: process.env.CHEF_CHANTIER_PASSWORD ?? 'Rinasoa123!!',
      session: 'chef-chantier.json',
    },
    {
      key: 'salarie',
      label: 'Salarié ouvrier',
      login: process.env.SALARIE_EMAIL ?? 'aime@salarie.test',
      password: process.env.SALARIE_PASSWORD ?? 'Aime123!!!',
      session: 'salarie.json',
    },
    {
      key: 'sous-traitant',
      label: 'Sous-traitant',
      login: process.env.SOUS_TRAITANT_EMAIL ?? 'heri@entreprise.test',
      password: process.env.SOUS_TRAITANT_PASSWORD ?? 'Heri@123!!!',
      session: 'sous-traitant.json',
    },
    {
      key: 'sous-traitant-2',
      label: 'Sous-traitant (plomberie)',
      login: process.env.SOUS_TRAITANT2_EMAIL ?? 'rene@plomberie.test',
      password: process.env.SOUS_TRAITANT2_PASSWORD ?? 'Rene123!!!',
      session: 'sous-traitant-2.json',
    },
    {
      key: 'ouvrier-sous-traitant',
      label: 'Ouvrier sous-traitant',
      login: process.env.OUVRIER_SOUS_TRAITANT_LOGIN ?? 'Henri',
      password: process.env.OUVRIER_SOUS_TRAITANT_PASSWORD ?? 'Henri123!!',
      session: 'ouvrier-sous-traitant.json',
    },
    {
      key: 'maitre-ouvrage',
      label: "Maître d'ouvrage",
      login: process.env.MAITRE_OUVRAGE_EMAIL ?? 'richard@ouvrage.test',
      password: process.env.MAITRE_OUVRAGE_PASSWORD ?? 'Richard123!!',
      session: 'maitre-ouvrage.json',
    },
    {
      key: 'maitre-ouvrage-execution',
      label: "Maître d'ouvrage d'exécution",
      login: process.env.MAITRE_OUVRAGE_EXEC_EMAIL ?? 'zo@maitreex.test',
      password: process.env.MAITRE_OUVRAGE_EXEC_PASSWORD ?? 'Zo@123!!!!',
      session: 'maitre-ouvrage-execution.json',
    },
    {
      key: 'bureau-etude',
      label: "Bureau d'étude",
      login: process.env.BUREAU_ETUDE_EMAIL ?? 'claire@test.mg',
      password: process.env.BUREAU_ETUDE_PASSWORD ?? 'Claire123!!!',
      session: 'bureau-etude.json',
    },
    {
      key: 'controleur-technique',
      label: 'Contrôleur technique',
      login: process.env.CONTROLEUR_TECH_EMAIL ?? 'faniry@controleur.test',
      password: process.env.CONTROLEUR_TECH_PASSWORD ?? 'Faniry123!!',
      session: 'controleur-technique.json',
    },
    {
      key: 'coordinateur-sps',
      label: 'Coordinateur SPS',
      login: process.env.COORDINATEUR_SPS_EMAIL ?? 'nivo@coordinateur.test',
      password: process.env.COORDINATEUR_SPS_PASSWORD ?? 'Nivo123!!!!',
      session: 'coordinateur-sps.json',
    },
    {
      key: 'intervenant-simple',
      label: 'Intervenant sans droit particulier',
      // NB: l'email fourni initialement ("feneva@...") contenait une coquille —
      // le compte réel sur le chantier de démo est faneva@simple.test (rôle "Paysagiste").
      login: process.env.INTERVENANT_SIMPLE_EMAIL ?? 'faneva@simple.test',
      password: process.env.INTERVENANT_SIMPLE_PASSWORD ?? 'Faneva123!!',
      session: 'intervenant-simple.json',
    },
    {
      key: 'controle-financier',
      label: 'Contrôle financier',
      login: process.env.CONTROLE_FINANCIER_EMAIL ?? 'alexis@test.test',
      password: process.env.CONTROLE_FINANCIER_PASSWORD ?? 'Alexis123!!',
      session: 'controle-financier.json',
    },
    {
      key: 'architecte',
      label: 'Architecte',
      login: process.env.ARCHITECTE_EMAIL ?? 'alice@architecte.test',
      password: process.env.ARCHITECTE_PASSWORD ?? 'Alice123!!',
      session: 'architecte.json',
    },
    {
      key: 'tenant-owner',
      label: 'Propriétaire (tenant owner)',
      login: process.env.TENANT_OWNER_EMAIL ?? 'johnim@entreprise.test',
      password: process.env.TENANT_OWNER_PASSWORD ?? 'John123!!!',
      session: 'tenant-owner.json',
    },
  ];
}

export function getRole(key: string): BuildNivoRole {
  const role = getRoles().find(r => r.key === key);
  if (!role) throw new Error(`Rôle BuildNivo inconnu : ${key}`);
  return role;
}
