/**
 * Script temporaire : crée la DB e2e_history et teste le schéma.
 * node database/setup-local.js
 */
const { Client } = require('pg');

const CONN = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Artiana2507',
  database: 'postgres',
};

async function main() {
  // 1. Créer la DB si elle n'existe pas
  const admin = new Client(CONN);
  await admin.connect();
  const { rows } = await admin.query("SELECT datname FROM pg_database WHERE datname='e2e_history'");
  if (rows.length === 0) {
    await admin.query('CREATE DATABASE e2e_history');
    console.log('✅ Base e2e_history créée.');
  } else {
    console.log('ℹ️  Base e2e_history existe déjà.');
  }
  await admin.end();

  // 2. Tester la connexion à e2e_history et initialiser le schéma
  process.env.DATABASE_URL = 'postgresql://postgres:Artiana2507@localhost:5432/e2e_history';
  const { connect } = require('./db');
  const ok = await connect();
  if (ok) {
    console.log('✅ Schéma initialisé dans e2e_history.');
    console.log('');
    console.log('DATABASE_URL à ajouter dans .env :');
    console.log('DATABASE_URL=postgresql://postgres:Artiana2507@localhost:5432/e2e_history');
  } else {
    console.error('❌ Échec de la connexion à e2e_history.');
  }
  process.exit(0);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
