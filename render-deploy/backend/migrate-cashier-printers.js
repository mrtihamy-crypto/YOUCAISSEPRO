const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Migration: Ajout table cashier_printers...\n');

db.serialize(() => {
  // Créer la table cashier_printers
  db.run(`
    CREATE TABLE IF NOT EXISTS cashier_printers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caissierId INTEGER NOT NULL,
      destination TEXT NOT NULL CHECK(destination IN ('TICKET', 'BAR', 'CUISINE')),
      printerType TEXT NOT NULL CHECK(printerType IN ('USB', 'NETWORK', 'WIFI')),
      printerName TEXT NOT NULL,
      connectionInfo TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (caissierId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(caissierId, destination)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erreur création table cashier_printers:', err.message);
    } else {
      console.log('✅ Table cashier_printers créée avec succès');
    }
  });

  // Vérifier la structure
  db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='cashier_printers'", (err, rows) => {
    if (err) {
      console.error('❌ Erreur vérification:', err.message);
    } else if (rows.length > 0) {
      console.log('\n📋 Structure de la table cashier_printers:');
      console.log(rows[0].sql);
      console.log('\n✅ Migration terminée avec succès!');
    }
    db.close();
  });
});
