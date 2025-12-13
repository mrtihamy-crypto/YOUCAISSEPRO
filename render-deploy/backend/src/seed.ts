import bcrypt from 'bcryptjs';
import { db, initDatabase, dbRun } from './config/database';

async function seed() {
  console.log('🌱 Seeding de la base de données...');

  await initDatabase();

  // Créer un utilisateur admin par défaut
  const adminPassword = await bcrypt.hash('admin123', 10);
  const caissierPassword = await bcrypt.hash('caissier123', 10);
  const serveurPassword = await bcrypt.hash('serveur123', 10);
  const receptionPassword = await bcrypt.hash('reception123', 10);

  try {
    // Admin
    await dbRun(
      'INSERT INTO users (username, password, role, nom, prenom) VALUES (?, ?, ?, ?, ?)',
      ['admin', adminPassword, 'ADMIN', 'Admin', 'Système']
    );
    
    // Caissiers
    await dbRun(
      'INSERT INTO users (username, password, role, nom, prenom) VALUES (?, ?, ?, ?, ?)',
      ['lhoucine', caissierPassword, 'CAISSIER', 'LHOUCINE', '']
    );
    await dbRun(
      'INSERT INTO users (username, password, role, nom, prenom) VALUES (?, ?, ?, ?, ?)',
      ['mustapha', caissierPassword, 'CAISSIER', 'MUSTAPHA', '']
    );
    
    // Serveurs
    await dbRun(
      'INSERT INTO users (username, password, role, nom, prenom) VALUES (?, ?, ?, ?, ?)',
      ['bennacer', serveurPassword, 'SERVEUR', 'BENNACER', '']
    );
    await dbRun(
      'INSERT INTO users (username, password, role, nom, prenom) VALUES (?, ?, ?, ?, ?)',
      ['mourad', serveurPassword, 'SERVEUR', 'MOURAD', '']
    );
    await dbRun(
      'INSERT INTO users (username, password, role, nom, prenom) VALUES (?, ?, ?, ?, ?)',
      ['abderrazak', serveurPassword, 'SERVEUR', 'ABDERRAZAK', '']
    );

    // Réception
    await dbRun(
      'INSERT INTO users (username, password, role, nom, prenom) VALUES (?, ?, ?, ?, ?)',
      ['reception', receptionPassword, 'RECEPTION', 'Réception', 'Hôtel']
    );

    console.log('✅ Utilisateurs créés:');
    console.log('   - admin / admin123 (ADMIN)');
    console.log('   - lhoucine / caissier123 (CAISSIER)');
    console.log('   - mustapha / caissier123 (CAISSIER)');
    console.log('   - bennacer / serveur123 (SERVEUR)');
    console.log('   - mourad / serveur123 (SERVEUR)');
    console.log('   - abderrazak / serveur123 (SERVEUR)');
    console.log('   - reception / reception123 (RECEPTION)');

    // Créer des catégories
    const beveragesResult = await dbRun(
      'INSERT INTO categories (name, description, type) VALUES (?, ?, ?)',
      ['Boissons', 'Boissons chaudes et froides', 'boissons']
    );
    const dishesResult = await dbRun(
      'INSERT INTO categories (name, description, type) VALUES (?, ?, ?)',
      ['Plats', 'Plats principaux et entrées', 'repas']
    );
    const dessertsResult = await dbRun(
      'INSERT INTO categories (name, description, type) VALUES (?, ?, ?)',
      ['Desserts', 'Pâtisseries et desserts', 'repas']
    );

    console.log('\n🍽️ Catégories créées');

    // Créer des produits - Boissons
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [beveragesResult.lastID, 'Café Espresso', 'Café espresso italien', 15.00, 100, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [beveragesResult.lastID, 'Cappuccino', 'Café avec mousse de lait', 18.00, 100, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [beveragesResult.lastID, 'Thé à la menthe', 'Thé traditionnel marocain', 10.00, 150, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [beveragesResult.lastID, 'Jus d\'orange', 'Jus fraîchement pressé', 20.00, 80, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [beveragesResult.lastID, 'Coca Cola', 'Boisson gazeuse', 12.00, 200, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [beveragesResult.lastID, 'Eau minérale', 'Eau plate 50cl', 8.00, 300, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop', 1]
    );

    // Créer des produits - Plats
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dishesResult.lastID, 'Tajine poulet', 'Tajine traditionnel au poulet', 65.00, 30, 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dishesResult.lastID, 'Couscous', 'Couscous aux légumes', 70.00, 25, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dishesResult.lastID, 'Pastilla', 'Pastilla au poulet', 55.00, 20, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dishesResult.lastID, 'Harira', 'Soupe traditionnelle', 25.00, 50, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dishesResult.lastID, 'Brochettes', 'Brochettes de viande grillée', 45.00, 35, 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dishesResult.lastID, 'Pizza Margherita', 'Pizza tomate mozzarella', 50.00, 40, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dishesResult.lastID, 'Salade César', 'Salade poulet parmesan', 35.00, 45, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop', 1]
    );

    // Créer des produits - Desserts
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dessertsResult.lastID, 'Cornes de gazelle', 'Pâtisserie aux amandes', 30.00, 40, 'https://images.unsplash.com/photo-1587241321921-91a834d82e57?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dessertsResult.lastID, 'Chebakia', 'Pâtisserie au miel', 25.00, 50, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dessertsResult.lastID, 'Tiramisu', 'Dessert italien au café', 35.00, 30, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dessertsResult.lastID, 'Crème brûlée', 'Crème vanille caramélisée', 32.00, 35, 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400&h=300&fit=crop', 1]
    );
    await dbRun(
      'INSERT INTO products (categoryId, name, description, price, stock, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dessertsResult.lastID, 'Tarte citron', 'Tarte meringuée au citron', 28.00, 25, 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=400&h=300&fit=crop', 1]
    );

    console.log('✅ Produits créés (17 produits)');
    console.log('   - 6 Boissons');
    console.log('   - 7 Plats');
    console.log('   - 5 Desserts');

    console.log('\n✅ Base de données initialisée et prête à l\'emploi!');
    
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      console.log('ℹ️  Les utilisateurs existent déjà');
      process.exit(0);
    } else {
      console.error('❌ Erreur lors du seeding:', error);
      process.exit(1);
    }
  }
}

seed();
