import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/database';
// import { checkLicense } from './utils/license'; // DÉSACTIVÉ pour les tests
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import orderRoutes from './routes/orders';
import categoryRoutes from './routes/categories';
import productRoutes from './routes/products';
import printerRoutes from './routes/printers';
import printRoutes from './routes/print';
import receptionRoutes from './routes/reception';

dotenv.config();

// ⚠️ VÉRIFICATION DE LA LICENCE - DÉSACTIVÉE POUR LES TESTS
// const licenseCheck = checkLicense();
// console.log('\n' + '═'.repeat(60));
// console.log(licenseCheck.message);
// console.log('═'.repeat(60) + '\n');

// if (!licenseCheck.valid) {
//   console.error('\n❌ ERREUR: Application non licenciée!');
//   console.error('   Contactez le support pour obtenir une licence.');
//   console.error('   Email: support@youcaisse.pro\n');
//   process.exit(1); // Arrêter l'application si pas de licence valide
// }

const app: Express = express();
const port = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialiser la base de données et démarrer le serveur
const startServer = async () => {
  try {
    await initDatabase();

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/orders', receptionRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/categories', categoryRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/printers', printerRoutes);
    app.use('/api/print', printRoutes);

    // Route de test
    app.get('/', (req: Request, res: Response) => {
      res.json({ message: 'YOU CAISSE PRO API - Serveur actif' });
    });

    // Gestion des erreurs 404
    app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Route non trouvée' });
    });

    // Fonction pour obtenir l'adresse IP locale
    const getLocalIP = (): string => {
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // IPv4 et non interne
          if (net.family === 'IPv4' && !net.internal) {
            return net.address;
          }
        }
      }
      return 'localhost';
    };

    app.listen(port, '0.0.0.0', () => {
      const localIP = getLocalIP();
      console.log(`🚀 Serveur démarré sur le port ${port}`);
      console.log(`📍 API disponible sur:`);
      console.log(`   - Local:  http://localhost:${port}`);
      console.log(`   - Réseau: http://${localIP}:${port}`);
      console.log(`\n💡 Pour connecter des tablettes/téléphones:`);
      console.log(`   Utilisez l'adresse réseau dans l'application`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Démarrer le serveur
startServer();