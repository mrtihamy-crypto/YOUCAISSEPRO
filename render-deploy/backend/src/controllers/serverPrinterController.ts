import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { dbAll, dbGet, dbRun } from '../config/database';
import * as net from 'net';

export class ServerPrinterController {
  // Récupérer les imprimantes du serveur connecté
  static async getMyPrinters(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      
      const printers = await dbAll(
        `SELECT * FROM server_printers WHERE serveurId = ? ORDER BY destination`,
        [userId]
      );
      
      res.json(printers);
    } catch (error) {
      console.error('Erreur getMyPrinters:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Créer ou mettre à jour une imprimante
  static async savePrinter(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { destination, printerType, printerName, connectionInfo } = req.body;

      if (!destination || !['BAR', 'CUISINE'].includes(destination)) {
        return res.status(400).json({ error: 'Destination invalide (BAR ou CUISINE)' });
      }

      if (!printerType || !['USB', 'NETWORK', 'WIFI'].includes(printerType)) {
        return res.status(400).json({ error: 'Type imprimante invalide (USB, NETWORK ou WIFI)' });
      }

      if (!printerName || !connectionInfo) {
        return res.status(400).json({ error: 'Nom et informations de connexion requis' });
      }

      // Vérifier si une imprimante existe déjà pour cette destination
      const existing = await dbGet(
        'SELECT * FROM server_printers WHERE serveurId = ? AND destination = ?',
        [userId, destination]
      );

      if (existing) {
        // Mise à jour
        await dbRun(
          `UPDATE server_printers 
           SET printerType = ?, printerName = ?, connectionInfo = ?, isActive = 1, updatedAt = CURRENT_TIMESTAMP
           WHERE serveurId = ? AND destination = ?`,
          [printerType, printerName, connectionInfo, userId, destination]
        );
      } else {
        // Création
        await dbRun(
          `INSERT INTO server_printers (serveurId, destination, printerType, printerName, connectionInfo, isActive)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [userId, destination, printerType, printerName, connectionInfo]
        );
      }

      const updatedPrinters = await dbAll(
        'SELECT * FROM server_printers WHERE serveurId = ? ORDER BY destination',
        [userId]
      );

      res.json({ message: 'Imprimante sauvegardée', printers: updatedPrinters });
    } catch (error) {
      console.error('Erreur savePrinter:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Supprimer une imprimante
  static async deletePrinter(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const printer = await dbGet(
        'SELECT * FROM server_printers WHERE id = ? AND serveurId = ?',
        [id, userId]
      );

      if (!printer) {
        return res.status(404).json({ error: 'Imprimante non trouvée' });
      }

      await dbRun('DELETE FROM server_printers WHERE id = ?', [id]);

      res.json({ message: 'Imprimante supprimée' });
    } catch (error) {
      console.error('Erreur deletePrinter:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Tester une imprimante
  static async testPrinter(req: AuthRequest, res: Response) {
    try {
      const { printerType, connectionInfo } = req.body;

      if (printerType === 'NETWORK' || printerType === 'WIFI') {
        const config = JSON.parse(connectionInfo);
        const { ipAddress, port } = config;

        return new Promise<void>((resolve, reject) => {
          const client = new net.Socket();
          client.setTimeout(5000);

          client.on('error', (err) => {
            client.destroy();
            reject(new Error(`Connexion échouée: ${err.message}`));
          });

          client.on('timeout', () => {
            client.destroy();
            reject(new Error('Timeout - imprimante inaccessible'));
          });

          client.connect(port, ipAddress, () => {
            // Commandes ESC/POS pour test
            const commands = Buffer.from([
              0x1B, 0x40,              // Initialiser
              0x1B, 0x61, 0x01,        // Centrer
              0x1B, 0x45, 0x01,        // Gras ON
              ...Buffer.from('TEST IMPRIMANTE\n'),
              0x1B, 0x45, 0x00,        // Gras OFF
              ...Buffer.from('\n'),
              ...Buffer.from('Connexion réussie!\n'),
              ...Buffer.from(new Date().toLocaleString() + '\n'),
              0x1B, 0x64, 0x03,        // Avancer papier
              0x1D, 0x56, 0x00         // Couper
            ]);

            client.write(commands, () => {
              client.end();
              res.json({ success: true, message: 'Test d\'impression envoyé' });
              resolve();
            });
          });
        }).catch(error => {
          res.status(500).json({ error: error.message });
        });
      } else if (printerType === 'USB') {
        // Pour USB, on retourne juste un message de succès
        // L'implémentation réelle nécessite des drivers spécifiques
        res.json({ 
          success: true, 
          message: 'Configuration USB sauvegardée. Test d\'impression disponible après configuration.' 
        });
      } else {
        res.status(400).json({ error: 'Type imprimante non supporté' });
      }
    } catch (error: any) {
      console.error('Erreur testPrinter:', error);
      res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
  }

  // Imprimer un ticket de commande
  static async printTicket(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: 'ID commande requis' });
      }

      // Récupérer la commande
      const order = await dbGet(
        `SELECT o.*, u.prenom, u.nom 
         FROM orders o 
         LEFT JOIN users u ON o.serveurId = u.id 
         WHERE o.id = ? AND o.serveurId = ?`,
        [orderId, userId]
      );

      if (!order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      // Récupérer les items avec catégories
      const items = await dbAll(
        `SELECT oi.*, p.name as productName, c.type as categoryType
         FROM order_items oi
         LEFT JOIN products p ON oi.productId = p.id
         LEFT JOIN categories c ON p.categoryId = c.id
         WHERE oi.orderId = ?`,
        [orderId]
      );

      // Séparer par destination
      const barItems = items.filter(item => item.categoryType === 'boissons');
      const cuisineItems = items.filter(item => item.categoryType === 'repas');

      // Récupérer les imprimantes du serveur
      const printers = await dbAll(
        'SELECT * FROM server_printers WHERE serveurId = ? AND isActive = 1',
        [userId]
      );

      const results = {
        printed: [] as any[],
        errors: [] as any[]
      };

      // Fonction pour imprimer un ticket
      const printToDestination = async (destination: 'BAR' | 'CUISINE', ticketItems: any[]) => {
        if (ticketItems.length === 0) return;

        const printer = printers.find(p => p.destination === destination);
        if (!printer) {
          results.errors.push({
            destination,
            error: `Aucune imprimante ${destination} configurée`
          });
          return;
        }

        try {
          const config = JSON.parse(printer.connectionInfo);

          if (printer.printerType === 'NETWORK' || printer.printerType === 'WIFI') {
            await new Promise<void>((resolve, reject) => {
              const client = new net.Socket();
              client.setTimeout(5000);

              client.on('error', reject);
              client.on('timeout', () => reject(new Error('Timeout')));

              client.connect(config.port, config.ipAddress, () => {
                const ticketContent = generateTicketESCPOS(order, ticketItems, destination);
                client.write(ticketContent, () => {
                  client.end();
                  results.printed.push({
                    destination,
                    printer: printer.printerName,
                    items: ticketItems.length
                  });
                  resolve();
                });
              });
            });
          }
        } catch (error: any) {
          results.errors.push({
            destination,
            error: error.message
          });
        }
      };

      // Imprimer BAR et CUISINE
      await Promise.all([
        printToDestination('BAR', barItems),
        printToDestination('CUISINE', cuisineItems)
      ]);

      res.json({
        message: 'Impression lancée',
        order: {
          id: order.id,
          ticketNumber: order.ticketNumber,
          clientName: order.clientName,
          serveur: `${order.prenom} ${order.nom}`
        },
        results
      });
    } catch (error) {
      console.error('Erreur printTicket:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}

// Fonction pour générer le contenu ESC/POS
function generateTicketESCPOS(order: any, items: any[], destination: string): Buffer {
  const commands: number[] = [];

  // Initialiser
  commands.push(0x1B, 0x40);

  // Centrer et titre
  commands.push(0x1B, 0x61, 0x01); // Centrer
  commands.push(0x1B, 0x45, 0x01); // Gras ON
  commands.push(0x1B, 0x21, 0x30); // Double taille
  commands.push(...Buffer.from(`${destination}\n`));
  commands.push(0x1B, 0x21, 0x00); // Taille normale
  commands.push(0x1B, 0x45, 0x00); // Gras OFF

  // Ligne de séparation
  commands.push(...Buffer.from('================================\n'));

  // Informations commande (aligné à gauche)
  commands.push(0x1B, 0x61, 0x00); // Aligner gauche
  commands.push(...Buffer.from(`Ticket: ${order.ticketNumber}\n`));
  commands.push(...Buffer.from(`Client: ${order.clientName}\n`));
  if (order.mealTime) {
    commands.push(...Buffer.from(`Heure repas: ${order.mealTime}\n`));
  }
  commands.push(...Buffer.from(`Serveur: ${order.prenom} ${order.nom}\n`));
  commands.push(...Buffer.from(`${new Date().toLocaleString()}\n`));
  commands.push(...Buffer.from('--------------------------------\n'));

  // Articles
  items.forEach(item => {
    commands.push(0x1B, 0x45, 0x01); // Gras
    commands.push(...Buffer.from(`${item.quantity}x ${item.productName}\n`));
    commands.push(0x1B, 0x45, 0x00); // Normal
    if (order.notes) {
      commands.push(...Buffer.from(`   Note: ${order.notes}\n`));
    }
  });

  // Pied de ticket
  commands.push(...Buffer.from('================================\n'));
  commands.push(0x1B, 0x61, 0x01); // Centrer
  commands.push(...Buffer.from('Merci!\n'));

  // Avancer et couper
  commands.push(0x1B, 0x64, 0x03); // 3 lignes
  commands.push(0x1D, 0x56, 0x00); // Couper

  return Buffer.from(commands);
}

export default ServerPrinterController;
