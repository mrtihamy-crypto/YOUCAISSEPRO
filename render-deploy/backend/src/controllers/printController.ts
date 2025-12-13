import { Request, Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { ThermalPrintService } from '../utils/thermalPrintService';

const dbGet = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized'));
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized'));
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export class PrintController {
  // Imprimer une commande sur les bonnes imprimantes (BAR et/ou CUISINE)
  static async printOrder(req: AuthRequest, res: Response) {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: 'ID de commande requis' });
      }

      // Récupérer la commande
      const order = await dbGet(
        'SELECT o.*, u.nom, u.prenom FROM orders o LEFT JOIN users u ON o.serveurId = u.id WHERE o.id = ?',
        [orderId]
      );

      if (!order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      // Récupérer les items avec leurs catégories
      const items = await dbAll(`
        SELECT 
          oi.*, 
          p.name as productName,
          p.categoryId,
          c.type as categoryType
        FROM order_items oi
        LEFT JOIN products p ON oi.productId = p.id
        LEFT JOIN categories c ON p.categoryId = c.id
        WHERE oi.orderId = ?
      `, [orderId]);

      // Séparer les items par destination
      const barItems = items.filter(item => item.categoryType === 'boissons');
      const cuisineItems = items.filter(item => item.categoryType === 'repas');

      const results: any = {
        orderId,
        printed: [],
        errors: []
      };

      // Récupérer les imprimantes actives
      if (barItems.length > 0) {
        const barPrinter = await dbGet(
          'SELECT * FROM printer_configs WHERE destination = ? AND isActive = 1 LIMIT 1',
          ['BAR']
        );

        if (barPrinter) {
          // Impression réelle sur imprimante thermique
          try {
            const success = await ThermalPrintService.printTicket(barPrinter, {
              ticketNumber: order.ticketNumber,
              clientName: order.clientName,
              mealTime: order.mealTime,
              notes: order.notes,
              items: barItems,
              serveur: `${order.prenom} ${order.nom}`,
              destination: 'BAR',
              createdAt: order.createdAt
            });

            if (success) {
              results.printed.push({
                destination: 'BAR',
                printer: barPrinter.name,
                items: barItems.length,
                status: 'success'
              });
            } else {
              results.errors.push({ destination: 'BAR', error: 'Échec impression physique' });
            }
          } catch (error) {
            console.error('Erreur impression BAR:', error);
            results.errors.push({ destination: 'BAR', error: 'Erreur impression thermique' });
          }
        } else {
          results.errors.push({ destination: 'BAR', error: 'Aucune imprimante BAR active' });
        }
      }

      if (cuisineItems.length > 0) {
        const cuisinePrinter = await dbGet(
          'SELECT * FROM printer_configs WHERE destination = ? AND isActive = 1 LIMIT 1',
          ['CUISINE']
        );

        if (cuisinePrinter) {
          // Impression réelle sur imprimante thermique
          try {
            const success = await ThermalPrintService.printTicket(cuisinePrinter, {
              ticketNumber: order.ticketNumber,
              clientName: order.clientName,
              mealTime: order.mealTime,
              notes: order.notes,
              items: cuisineItems,
              serveur: `${order.prenom} ${order.nom}`,
              destination: 'CUISINE',
              createdAt: order.createdAt
            });

            if (success) {
              results.printed.push({
                destination: 'CUISINE',
                printer: cuisinePrinter.name,
                items: cuisineItems.length,
                status: 'success'
              });
            } else {
              results.errors.push({ destination: 'CUISINE', error: 'Échec impression physique' });
            }
          } catch (error) {
            console.error('Erreur impression CUISINE:', error);
            results.errors.push({ destination: 'CUISINE', error: 'Erreur impression thermique' });
          }
        } else {
          results.errors.push({ destination: 'CUISINE', error: 'Aucune imprimante CUISINE active' });
        }
      }

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
      console.error('Erreur printOrder:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Récupérer les détails de tickets séparés pour BAR et CUISINE
  static async getTicketsByDestination(req: AuthRequest, res: Response) {
    try {
      const { orderId } = req.params;

      // Récupérer la commande
      const order = await dbGet(
        `SELECT o.*, u.nom, u.prenom 
         FROM orders o 
         LEFT JOIN users u ON o.serveurId = u.id 
         WHERE o.id = ?`,
        [orderId]
      );

      if (!order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      // Récupérer les items avec leurs catégories
      const items = await dbAll(`
        SELECT 
          oi.*, 
          p.name as productName,
          c.type as categoryType,
          c.name as categoryName
        FROM order_items oi
        LEFT JOIN products p ON oi.productId = p.id
        LEFT JOIN categories c ON p.categoryId = c.id
        WHERE oi.orderId = ?
      `, [orderId]);

      // Séparer par destination
      const barItems = items.filter(item => item.categoryType === 'boissons');
      const cuisineItems = items.filter(item => item.categoryType === 'repas');

      res.json({
        order: {
          id: order.id,
          ticketNumber: order.ticketNumber,
          clientName: order.clientName,
          notes: order.notes,
          serveur: `${order.prenom} ${order.nom}`,
          createdAt: order.createdAt
        },
        tickets: {
          bar: {
            items: barItems,
            total: barItems.reduce((sum, item) => sum + item.total, 0)
          },
          cuisine: {
            items: cuisineItems,
            total: cuisineItems.reduce((sum, item) => sum + item.total, 0)
          }
        }
      });

    } catch (error) {
      console.error('Erreur getTicketsByDestination:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}
