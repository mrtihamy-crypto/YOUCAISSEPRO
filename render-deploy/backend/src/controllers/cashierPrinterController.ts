import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { dbRun, dbGet, dbAll } from '../config/database';
import net from 'net';

export class CashierPrinterController {
  // Récupérer mes imprimantes
  static async getMyPrinters(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      const printers = await dbAll(
        'SELECT * FROM cashier_printers WHERE caissierId = ? ORDER BY destination',
        [userId]
      );

      res.json(printers);
    } catch (error) {
      console.error('Erreur getMyPrinters:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Sauvegarder une imprimante
  static async savePrinter(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { destination, printerType, printerName, connectionInfo } = req.body;

      if (!destination || !printerType || !printerName || !connectionInfo) {
        return res.status(400).json({ error: 'Données manquantes' });
      }

      if (!['TICKET', 'BAR', 'CUISINE'].includes(destination)) {
        return res.status(400).json({ error: 'Destination invalide' });
      }

      // Vérifier si une imprimante existe déjà pour cette destination
      const existing = await dbGet(
        'SELECT id FROM cashier_printers WHERE caissierId = ? AND destination = ?',
        [userId, destination]
      );

      if (existing) {
        // Mise à jour
        await dbRun(
          `UPDATE cashier_printers 
           SET printerType = ?, printerName = ?, connectionInfo = ?, isActive = 1, updatedAt = CURRENT_TIMESTAMP
           WHERE caissierId = ? AND destination = ?`,
          [printerType, printerName, connectionInfo, userId, destination]
        );
      } else {
        // Création
        await dbRun(
          `INSERT INTO cashier_printers (caissierId, destination, printerType, printerName, connectionInfo, isActive)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [userId, destination, printerType, printerName, connectionInfo]
        );
      }

      const updatedPrinters = await dbAll(
        'SELECT * FROM cashier_printers WHERE caissierId = ? ORDER BY destination',
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
        'SELECT * FROM cashier_printers WHERE id = ? AND caissierId = ?',
        [id, userId]
      );

      if (!printer) {
        return res.status(404).json({ error: 'Imprimante non trouvée' });
      }

      await dbRun('DELETE FROM cashier_printers WHERE id = ?', [id]);

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
        res.json({ 
          success: true, 
          message: 'Configuration USB sauvegardée (test physique requis)' 
        });
      }
    } catch (error: any) {
      console.error('Erreur testPrinter:', error);
      res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
  }

  // Imprimer un ticket client
  static async printTicket(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { orderId } = req.body;

      // Récupérer la customization du caissier
      const customization = await dbGet(
        'SELECT * FROM ticket_customization WHERE caissierId = ?',
        [userId]
      );

      // Récupérer la commande avec détails
      const order = await dbGet(`
        SELECT 
          o.*,
          u.prenom, u.nom,
          u.prenom || ' ' || u.nom as serverName,
          GROUP_CONCAT(
            oi.productName || '|' || oi.quantity || '|' || oi.price || '|' || oi.total || '|' || p.categoryId,
            ';'
          ) as items_data
        FROM orders o
        LEFT JOIN users u ON o.createdBy = u.id
        LEFT JOIN order_items oi ON o.id = oi.orderId
        LEFT JOIN products p ON oi.productId = p.id
        WHERE o.id = ?
        GROUP BY o.id
      `, [orderId]);

      if (!order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      // Parser les items
      const items = order.items_data ? order.items_data.split(';').map((item: string) => {
        const [productName, quantity, price, total, categoryId] = item.split('|');
        return { productName, quantity: parseInt(quantity), price: parseFloat(price), total: parseFloat(total), categoryId: parseInt(categoryId) };
      }) : [];

      // Séparer par catégorie (1-4 = boissons, 5+ = repas)
      const barItems = items.filter((item: any) => item.categoryId >= 1 && item.categoryId <= 4);
      const cuisineItems = items.filter((item: any) => item.categoryId >= 5);

      // Récupérer les imprimantes du caissier
      const printers = await dbAll(
        'SELECT * FROM cashier_printers WHERE caissierId = ? AND isActive = 1',
        [userId]
      );

      const results = {
        printed: [] as any[],
        errors: [] as any[]
      };

      // Fonction pour imprimer
      const printToDestination = async (destination: 'TICKET' | 'BAR' | 'CUISINE', ticketItems: any[]) => {
        const printer = printers.find(p => p.destination === destination);
        if (!printer) {
          if (destination !== 'TICKET') { // TICKET est obligatoire, BAR/CUISINE optionnels
            results.errors.push({
              destination,
              error: `Aucune imprimante ${destination} configurée`
            });
          }
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
                const ticketContent = destination === 'TICKET' 
                  ? generateClientTicketESCPOS(order, items, customization)
                  : generateKitchenTicketESCPOS(order, ticketItems, destination);
                
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

      // Imprimer TICKET client (obligatoire)
      await printToDestination('TICKET', items);

      // Imprimer BAR et CUISINE si configurés
      if (barItems.length > 0) {
        await printToDestination('BAR', barItems);
      }
      if (cuisineItems.length > 0) {
        await printToDestination('CUISINE', cuisineItems);
      }

      res.json({
        message: 'Impression lancée',
        order: {
          id: order.id,
          ticketNumber: order.ticketNumber,
          clientName: order.clientName
        },
        results
      });
    } catch (error) {
      console.error('Erreur printTicket:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Récupérer la personnalisation
  static async getCustomization(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      const customization = await dbGet(
        'SELECT * FROM ticket_customization WHERE caissierId = ?',
        [userId]
      );

      if (!customization) {
        // Retourner les valeurs par défaut
        return res.json({
          companyName: 'YOU VOYAGE COMPANY',
          headerText: '',
          footerText: 'Merci de votre visite!',
          logoUrl: '',
          showDate: 1,
          showTime: 1,
          showServerName: 1,
          fontSize: 'normal',
          paperWidth: 80
        });
      }

      res.json(customization);
    } catch (error) {
      console.error('Erreur getCustomization:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Sauvegarder la personnalisation
  static async saveCustomization(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        companyName,
        headerText,
        footerText,
        logoUrl,
        showDate,
        showTime,
        showServerName,
        fontSize,
        paperWidth
      } = req.body;

      // Vérifier si existe déjà
      const existing = await dbGet(
        'SELECT id FROM ticket_customization WHERE caissierId = ?',
        [userId]
      );

      if (existing) {
        // Mise à jour
        await dbRun(
          `UPDATE ticket_customization 
           SET companyName = ?, headerText = ?, footerText = ?, logoUrl = ?, 
               showDate = ?, showTime = ?, showServerName = ?, fontSize = ?, 
               paperWidth = ?, updatedAt = CURRENT_TIMESTAMP
           WHERE caissierId = ?`,
          [companyName, headerText, footerText, logoUrl, showDate, showTime, 
           showServerName, fontSize, paperWidth, userId]
        );
      } else {
        // Création
        await dbRun(
          `INSERT INTO ticket_customization 
           (caissierId, companyName, headerText, footerText, logoUrl, showDate, 
            showTime, showServerName, fontSize, paperWidth)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, companyName, headerText, footerText, logoUrl, showDate, 
           showTime, showServerName, fontSize, paperWidth]
        );
      }

      const updated = await dbGet(
        'SELECT * FROM ticket_customization WHERE caissierId = ?',
        [userId]
      );

      res.json({ message: 'Personnalisation sauvegardée', customization: updated });
    } catch (error) {
      console.error('Erreur saveCustomization:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}

// Générer ticket client ESC/POS
function generateClientTicketESCPOS(order: any, items: any[], customization?: any): Buffer {
  const commands: number[] = [];
  
  // Initialiser
  commands.push(0x1B, 0x40);
  
  // Taille de police
  const fontSize = customization?.fontSize || 'normal';
  if (fontSize === 'large') {
    commands.push(0x1D, 0x21, 0x11); // Double height et width
  } else if (fontSize === 'small') {
    commands.push(0x1D, 0x21, 0x00); // Normal size
  }
  
  // Centrer + Gras
  commands.push(0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01);
  
  // Nom de l'entreprise personnalisé
  const companyName = customization?.companyName || 'YOU CAISSE PRO';
  commands.push(...Buffer.from(`${companyName}\n`));
  commands.push(...Buffer.from('================\n'));
  commands.push(0x1B, 0x45, 0x00); // Gras OFF
  
  // Texte d'en-tête personnalisé
  if (customization?.headerText) {
    commands.push(...Buffer.from(`${customization.headerText}\n`));
    commands.push(...Buffer.from('----------------\n'));
  }
  
  // Ticket number
  commands.push(0x1B, 0x61, 0x00); // Align left
  commands.push(...Buffer.from(`\nTicket N°: ${order.ticketNumber}\n`));
  commands.push(...Buffer.from(`Client: ${order.clientName}\n`));
  
  // Date (si activé)
  if (customization?.showDate !== 0) {
    commands.push(...Buffer.from(`Date: ${new Date(order.createdAt).toLocaleDateString()}\n`));
  }
  
  // Heure (si activé)
  if (customization?.showTime !== 0) {
    commands.push(...Buffer.from(`Heure: ${new Date(order.createdAt).toLocaleTimeString()}\n`));
  }
  
  if (order.mealTime) {
    commands.push(...Buffer.from(`Heure repas: ${order.mealTime}\n`));
  }
  
  // Nom du serveur (si activé)
  if (customization?.showServerName !== 0 && order.serverName) {
    commands.push(...Buffer.from(`Serveur: ${order.serverName}\n`));
  }
  
  commands.push(...Buffer.from('--------------------------------\n'));
  
  // Articles
  items.forEach(item => {
    const line = `${item.quantity}x ${item.productName}\n`;
    commands.push(...Buffer.from(line));
    const priceLine = `   ${item.total.toFixed(2)} MAD\n`;
    commands.push(...Buffer.from(priceLine));
  });
  
  commands.push(...Buffer.from('--------------------------------\n'));
  
  // Total
  commands.push(0x1B, 0x45, 0x01); // Gras ON
  commands.push(...Buffer.from(`TOTAL: ${order.total.toFixed(2)} MAD\n`));
  commands.push(0x1B, 0x45, 0x00); // Gras OFF
  
  if (order.notes) {
    commands.push(...Buffer.from(`\nNotes: ${order.notes}\n`));
  }
  
  // Footer personnalisé
  commands.push(0x1B, 0x61, 0x01); // Centrer
  const footerText = customization?.footerText || 'Merci de votre visite!';
  commands.push(...Buffer.from(`\n${footerText}\n`));
  
  // Avancer papier et couper
  commands.push(0x1B, 0x64, 0x03);
  commands.push(0x1D, 0x56, 0x00);
  
  return Buffer.from(commands);
}

// Générer ticket cuisine/bar ESC/POS
function generateKitchenTicketESCPOS(order: any, items: any[], destination: string): Buffer {
  const commands: number[] = [];
  
  // Initialiser
  commands.push(0x1B, 0x40);
  
  // Centrer + Gras
  commands.push(0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01);
  commands.push(...Buffer.from(`=== ${destination} ===\n`));
  commands.push(0x1B, 0x45, 0x00);
  
  // Info commande
  commands.push(0x1B, 0x61, 0x00); // Align left
  commands.push(...Buffer.from(`\nTicket: ${order.ticketNumber}\n`));
  commands.push(...Buffer.from(`Client: ${order.clientName}\n`));
  if (order.mealTime) {
    commands.push(0x1B, 0x45, 0x01);
    commands.push(...Buffer.from(`Heure: ${order.mealTime}\n`));
    commands.push(0x1B, 0x45, 0x00);
  }
  commands.push(...Buffer.from('------------------------\n'));
  
  // Articles
  items.forEach(item => {
    commands.push(0x1B, 0x45, 0x01);
    commands.push(...Buffer.from(`${item.quantity}x ${item.productName}\n`));
    commands.push(0x1B, 0x45, 0x00);
  });
  
  if (order.notes) {
    commands.push(...Buffer.from(`\nNotes: ${order.notes}\n`));
  }
  
  // Avancer papier et couper
  commands.push(0x1B, 0x64, 0x03);
  commands.push(0x1D, 0x56, 0x00);
  
  return Buffer.from(commands);
}
