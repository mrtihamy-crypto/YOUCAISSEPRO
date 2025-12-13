const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('🔄 Migration en cours...');

// Ajouter la colonne mealTime à orders
db.run('ALTER TABLE orders ADD COLUMN mealTime TEXT', (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('❌ Erreur mealTime:', err.message);
  } else {
    console.log('✅ Colonne mealTime ajoutée à orders');
  }
});

// Créer la table server_printers
db.run(`
  CREATE TABLE IF NOT EXISTS server_printers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serveurId INTEGER NOT NULL,
    destination TEXT NOT NULL CHECK(destination IN ('BAR', 'CUISINE')),
    printerType TEXT NOT NULL CHECK(printerType IN ('USB', 'NETWORK', 'WIFI')),
    printerName TEXT NOT NULL,
    connectionInfo TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (serveurId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(serveurId, destination)
  )
`, (err) => {
  if (err) {
    console.error('❌ Erreur server_printers:', err.message);
  } else {
    console.log('✅ Table server_printers créée');
  }
  
  db.close(() => {
    console.log('\n✨ Migration terminée!');
  });
});
