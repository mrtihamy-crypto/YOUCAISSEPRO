import { db, initDatabase } from './config/database';

const migrateDatabase = async () => {
  try {
    console.log('🔄 Migration de la base de données en cours...');
    
    await initDatabase();

    if (!db) {
      throw new Error('Database not initialized');
    }

    // Vérifier si les colonnes existent déjà
    const checkColumn = (tableName: string, columnName: string): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        db!.all(`PRAGMA table_info(${tableName})`, (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.some(row => row.name === columnName));
        });
      });
    };

    const userIdExists = await checkColumn('printer_configs', 'userId');
    const isSharedExists = await checkColumn('printer_configs', 'isShared');

    if (!userIdExists) {
      console.log('➕ Ajout de la colonne userId...');
      await new Promise<void>((resolve, reject) => {
        db!.run('ALTER TABLE printer_configs ADD COLUMN userId INTEGER', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Colonne userId ajoutée');
    } else {
      console.log('ℹ️  Colonne userId existe déjà');
    }

    if (!isSharedExists) {
      console.log('➕ Ajout de la colonne isShared...');
      await new Promise<void>((resolve, reject) => {
        db!.run('ALTER TABLE printer_configs ADD COLUMN isShared INTEGER DEFAULT 0', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Colonne isShared ajoutée');
    } else {
      console.log('ℹ️  Colonne isShared existe déjà');
    }

    // Mettre à jour les imprimantes existantes pour être partagées par défaut (compatibilité)
    console.log('🔄 Mise à jour des imprimantes existantes...');
    await new Promise<void>((resolve, reject) => {
      db!.run('UPDATE printer_configs SET isShared = 1 WHERE userId IS NULL', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Migration terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
};

migrateDatabase();
