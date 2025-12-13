const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

try {
  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS printer_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      destination TEXT NOT NULL CHECK(destination IN ('BAR', 'CUISINE')),
      type TEXT NOT NULL CHECK(type IN ('USB', 'NETWORK')),
      name TEXT NOT NULL,
      usbPort TEXT,
      networkIp TEXT,
      networkPort INTEGER,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add BAR printer
  db.prepare(`
    INSERT OR REPLACE INTO printer_configs 
    (id, name, destination, type, usbPort, isActive, createdAt)
    VALUES (1, 'Thermique BAR', 'BAR', 'USB', 'COM3', 1, datetime('now'))
  `).run();

  // Add CUISINE printer  
  db.prepare(`
    INSERT OR REPLACE INTO printer_configs 
    (id, name, destination, type, usbPort, isActive, createdAt)
    VALUES (2, 'Thermique CUISINE', 'CUISINE', 'USB', 'COM4', 1, datetime('now'))
  `).run();

  const printers = db.prepare('SELECT * FROM printer_configs').all();
  console.log('✅ Printers configured:', printers.length);
  printers.forEach(p => console.log(`  - ${p.name} (${p.destination})`));
  
  db.close();
} catch (error) {
  console.error('❌ Error setting up printers:', error.message);
  process.exit(1);
}
