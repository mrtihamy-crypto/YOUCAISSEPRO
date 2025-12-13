const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('\n=== COMMANDES PAYÉES OU ANNULÉES ===');
const paidOrCancelled = db.prepare(`
  SELECT COUNT(*) as total, status 
  FROM orders 
  WHERE status IN ('payee', 'annulee') 
  GROUP BY status
`).all();

if (paidOrCancelled.length === 0) {
  console.log('❌ AUCUNE commande payée ou annulée trouvée');
  console.log('➡️  C\'est pourquoi "Vider le Système" ne fait rien!\n');
} else {
  console.table(paidOrCancelled);
}

console.log('\n=== TOUTES LES COMMANDES ===');
const allOrders = db.prepare(`
  SELECT COUNT(*) as total, status 
  FROM orders 
  GROUP BY status
`).all();
console.table(allOrders);

console.log('\n=== DÉTAILS DES COMMANDES ===');
const details = db.prepare(`
  SELECT id, ticketNumber, clientName, status, total, createdAt 
  FROM orders 
  ORDER BY createdAt DESC 
  LIMIT 10
`).all();
console.table(details);

db.close();
