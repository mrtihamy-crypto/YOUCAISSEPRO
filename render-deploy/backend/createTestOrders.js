const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('📝 Création de commandes de test...\n');

// Insérer des commandes payées
const insert = db.prepare(`
  INSERT INTO orders (ticketNumber, serveurId, status, total, clientName, notes, paymentMethod, paidAmount, createdAt)
  VALUES (?, 2, 'payee', ?, ?, ?, 'espece', ?, CURRENT_TIMESTAMP)
`);

const testOrders = [
  { ticket: '20251205-TEST1', total: 50, client: 'Chambre 10', notes: 'Chambre 10 - Petit déjeuner', paid: 50 },
  { ticket: '20251205-TEST2', total: 75, client: 'Passage 5', notes: 'Passage 5 - Déjeuner', paid: 75 },
  { ticket: '20251205-TEST3', total: 120, client: 'Chambre 25', notes: 'Chambre 25 - Dîner', paid: 120 },
];

testOrders.forEach(order => {
  insert.run(order.ticket, order.total, order.client, order.notes, order.paid);
  console.log(`✅ Commande créée: ${order.ticket} - ${order.client} - ${order.total}€`);
});

// Ajouter une commande en attente (ne doit PAS être supprimée)
const pendingInsert = db.prepare(`
  INSERT INTO orders (ticketNumber, serveurId, status, total, clientName, notes, createdAt)
  VALUES ('20251205-ENCOURS', 2, 'en_attente', 45, 'Chambre 30', 'Chambre 30 - En cours', CURRENT_TIMESTAMP)
`);
pendingInsert.run();
console.log(`✅ Commande en attente créée (NE DOIT PAS être supprimée)\n`);

// Afficher le résultat
const allOrders = db.prepare(`
  SELECT id, ticketNumber, clientName, status, total
  FROM orders 
  ORDER BY createdAt DESC
`).all();

console.log('📊 TOUTES LES COMMANDES:');
console.table(allOrders);

const stats = db.prepare(`
  SELECT status, COUNT(*) as count, SUM(total) as total
  FROM orders
  GROUP BY status
`).all();

console.log('\n📈 STATISTIQUES:');
console.table(stats);

console.log('\n🎯 Maintenant vous pouvez tester "Vider le Système"');
console.log('   → Les 3 commandes PAYÉES doivent être supprimées');
console.log('   → La commande EN_ATTENTE doit rester\n');

db.close();
