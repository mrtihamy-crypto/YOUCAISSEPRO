import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';

dotenv.config();

// Détection de l'environnement
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

// Configuration PostgreSQL pour production
let pool: Pool | null = null;
if (isProduction && databaseUrl) {
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
}

// Configuration SQLite pour développement
let db: sqlite3.Database | null = null;
if (!isProduction) {
  const dbPath = process.env.DB_PATH || './database.sqlite';
  db = new sqlite3.Database(dbPath);
  db.run('PRAGMA foreign_keys = ON');
}

// Fonctions universelles
export async function dbRun(sql: string, params: any[] = []): Promise<any> {
  if (isProduction && pool) {
    // PostgreSQL: convertir ? en $1, $2, etc.
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`)
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
      .replace(/TEXT DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT NOW()')
      .replace(/CURRENT_TIMESTAMP/g, 'NOW()');
    
    const result = await pool.query(pgSql, params);
    return { lastID: result.rows[0]?.id, changes: result.rowCount };
  } else if (db) {
    return new Promise((resolve, reject) => {
      db!.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
  throw new Error('No database configured');
}

export async function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  if (isProduction && pool) {
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    const result = await pool.query(pgSql, params);
    return result.rows[0] as T;
  } else if (db) {
    return new Promise((resolve, reject) => {
      db!.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }
  throw new Error('No database configured');
}

export async function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (isProduction && pool) {
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    const result = await pool.query(pgSql, params);
    return result.rows as T[];
  } else if (db) {
    return new Promise((resolve, reject) => {
      db!.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }
  throw new Error('No database configured');
}

export async function initDatabase() {
  if (isProduction && pool) {
    // PostgreSQL - Tables de production
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('ADMIN', 'CAISSIER', 'SERVEUR', 'RECEPTION')),
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        lastLogin TIMESTAMP,
        isActive INTEGER DEFAULT 0,
        createdAt TIMESTAMP DEFAULT NOW(),
        updatedAt TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        loginTime TIMESTAMP DEFAULT NOW(),
        lastActivity TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        ticketNumber TEXT UNIQUE,
        serveurId INTEGER NOT NULL,
        createdById INTEGER NOT NULL,
        paidBy INTEGER,
        status TEXT NOT NULL DEFAULT 'en_attente' CHECK(status IN ('en_attente', 'payee', 'annulee')),
        total REAL NOT NULL DEFAULT 0,
        clientName TEXT,
        notes TEXT,
        paymentMethod TEXT CHECK(paymentMethod IN ('espece', 'carte', 'cheque')),
        discount REAL DEFAULT 0,
        discountType TEXT CHECK(discountType IN ('percentage', 'amount')),
        paidAmount REAL DEFAULT 0,
        roomNumber TEXT,
        sentToReception INTEGER DEFAULT 0,
        receptionPrintedAt TIMESTAMP,
        createdAt TIMESTAMP DEFAULT NOW(),
        updatedAt TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (serveurId) REFERENCES users(id),
        FOREIGN KEY (createdById) REFERENCES users(id),
        FOREIGN KEY (paidBy) REFERENCES users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        orderId INTEGER NOT NULL,
        productId INTEGER,
        productName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        addedById INTEGER NOT NULL,
        addedAt TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL,
        FOREIGN KEY (addedById) REFERENCES users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        type TEXT DEFAULT 'repas' CHECK(type IN ('repas', 'boissons')),
        createdAt TIMESTAMP DEFAULT NOW(),
        updatedAt TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        categoryId INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        image TEXT,
        available INTEGER DEFAULT 1,
        createdAt TIMESTAMP DEFAULT NOW(),
        updatedAt TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS printer_configs (
        id SERIAL PRIMARY KEY,
        destination TEXT NOT NULL CHECK(destination IN ('BAR', 'CUISINE')),
        type TEXT NOT NULL CHECK(type IN ('USB', 'NETWORK')),
        name TEXT NOT NULL,
        usbPort TEXT,
        networkIp TEXT,
        networkPort INTEGER,
        isActive INTEGER DEFAULT 1,
        createdAt TIMESTAMP DEFAULT NOW(),
        updatedAt TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Base de données PostgreSQL initialisée avec succès');
  } else if (db) {
    // SQLite - Tables de développement
    await dbRun('PRAGMA foreign_keys = ON');

  // Table des utilisateurs
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'CAISSIER', 'SERVEUR', 'RECEPTION')),
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      lastLogin TEXT,
      isActive INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des sessions utilisateurs
  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      loginTime TEXT DEFAULT CURRENT_TIMESTAMP,
      lastActivity TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Table des commandes
  await dbRun(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticketNumber TEXT UNIQUE,
      serveurId INTEGER NOT NULL,
      createdById INTEGER NOT NULL,
      paidBy INTEGER,
      status TEXT NOT NULL DEFAULT 'en_attente' CHECK(status IN ('en_attente', 'payee', 'annulee')),
      total REAL NOT NULL DEFAULT 0,
      clientName TEXT,
      notes TEXT,
      paymentMethod TEXT CHECK(paymentMethod IN ('espece', 'carte', 'cheque')),
      discount REAL DEFAULT 0,
      discountType TEXT CHECK(discountType IN ('percentage', 'amount')),
      paidAmount REAL DEFAULT 0,
      roomNumber TEXT,
      sentToReception INTEGER DEFAULT 0,
      receptionPrintedAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (serveurId) REFERENCES users(id),
      FOREIGN KEY (createdById) REFERENCES users(id),
      FOREIGN KEY (paidBy) REFERENCES users(id)
    )
  `);

  // Table des articles de commande
  await dbRun(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      productId INTEGER,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      addedById INTEGER NOT NULL,
      addedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL,
      FOREIGN KEY (addedById) REFERENCES users(id)
    )
  `);

  // Table des catégories
  await dbRun(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      type TEXT DEFAULT 'repas' CHECK(type IN ('repas', 'boissons')),
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des produits
  await dbRun(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryId INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      image TEXT,
      available INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Table de configuration des imprimantes
  await dbRun(`
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

  console.log('✅ Base de données initialisée avec succès');
  }
}

export { db, pool };
