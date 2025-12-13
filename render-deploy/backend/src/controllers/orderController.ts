import { Response } from 'express';
import { db, dbGet, dbAll, dbRun } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { Order, OrderItem } from '../../../shared/types';

export class OrderController {
  static async create(req: AuthRequest, res: Response) {
    try {
      const { items, clientName, mealTime, notes } = req.body;
      const serveurId = req.user!.id;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Articles requis' });
      }

      if (!mealTime) {
        return res.status(400).json({ error: 'Heure du service requise' });
      }

      const total = items.reduce((sum: number, item: any) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Générer numéro de ticket unique (format: YYYYMMDD-XXXXX)
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(10000 + Math.random() * 90000);
      const ticketNumber = `${dateStr}-${random}`;

      const result = await dbRun(
        "INSERT INTO orders (ticketNumber, serveurId, createdById, total, clientName, mealTime, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'en_attente')",
        [ticketNumber, serveurId, serveurId, total, clientName || null, mealTime, notes || null]
      );

      const orderId = (result as any).lastID;

      for (const item of items) {
        const itemTotal = item.price * item.quantity;
        
        await dbRun(
          'INSERT INTO order_items (orderId, productId, productName, quantity, price, total, addedById) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [orderId, item.productId || null, item.productName, item.quantity, item.price, itemTotal, serveurId]
        );

        // Mettre à jour le stock si productId existe
        if (item.productId) {
          await dbRun(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [item.quantity, item.productId]
          );
        }
      }

      res.status(201).json({
        message: 'Commande créée',
        orderId,
        total,
        ticketNumber
      });
    } catch (error) {
      console.error('Erreur create order:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async getAll(req: AuthRequest, res: Response) {
    try {
      const orders = await dbAll(`
        SELECT o.*, 
               u1.nom as createdByNom, u1.prenom as createdByPrenom,
               u2.nom as paidByNom, u2.prenom as paidByPrenom,
               u1.username as serveurName,
               u1.prenom || ' ' || u1.nom as createdByName
        FROM orders o
        JOIN users u1 ON o.createdById = u1.id
        LEFT JOIN users u2 ON o.paidBy = u2.id
        ORDER BY o.createdAt DESC
      `);

      // Récupérer les items pour chaque commande avec categoryType
      const ordersWithItems = await Promise.all(
        orders.map(async (order: any) => {
          const items = await dbAll(`
            SELECT oi.*, 
                   p.name as productName,
                   c.type as categoryType
            FROM order_items oi
            LEFT JOIN products p ON oi.productId = p.id
            LEFT JOIN categories c ON p.categoryId = c.id
            WHERE oi.orderId = ?
          `, [order.id]);
          
          // Assigner une catégorie par défaut si manquante basée sur le nom du produit
          const itemsWithDefaults = items.map((item: any) => {
            if (!item.categoryType) {
              // Palabras clés pour détecter les boissons
              const boissonsKeywords = ['café', 'café', 'thé', 'jus', 'eau', 'bière', 'vin', 'alcool', 'boisson', 'soda', 'smoothie', 'cocktail'];
              const productName = (item.productName || '').toLowerCase();
              const isBeverage = boissonsKeywords.some(keyword => productName.includes(keyword));
              item.categoryType = isBeverage ? 'boissons' : 'repas';
            }
            return item;
          });
          
          return { ...order, items: itemsWithDefaults };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      console.error('Erreur getAll orders:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const order = await dbGet(`
        SELECT o.*, 
               u1.nom as createdByNom, u1.prenom as createdByPrenom,
               u2.nom as paidByNom, u2.prenom as paidByPrenom,
               u1.username as serveurName
        FROM orders o
        JOIN users u1 ON o.createdById = u1.id
        LEFT JOIN users u2 ON o.paidBy = u2.id
        WHERE o.id = ?
      `, [id]);

      if (!order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      const items = await dbAll(`
        SELECT oi.*, u.nom as addedByNom, u.prenom as addedByPrenom
        FROM order_items oi
        JOIN users u ON oi.addedById = u.id
        WHERE oi.orderId = ?
      `, [id]);

      // Formater les items avec les noms complets
      const formattedItems = items.map((item: any) => ({
        ...item,
        addedByName: item.addedByNom 
          ? (item.addedByPrenom ? `${item.addedByPrenom} ${item.addedByNom}` : item.addedByNom)
          : undefined
      }));

      res.json({ ...order, items: formattedItems });
    } catch (error) {
      console.error('Erreur getById order:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async addItems(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Articles requis' });
      }

      // Vérifier que la commande existe et est en attente
      const order = await dbGet('SELECT * FROM orders WHERE id = ? AND status = ?', [id, 'en_attente']);
      
      if (!order) {
        return res.status(404).json({ error: 'Commande non trouvée ou déjà payée' });
      }

      // Calculer le total des nouveaux articles
      const additionalTotal = items.reduce((sum: number, item: any) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Ajouter les articles
      const addedById = req.user!.id;
      for (const item of items) {
        const itemTotal = item.price * item.quantity;
        await dbRun(
          'INSERT INTO order_items (orderId, productId, productName, quantity, price, total, addedById) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, item.productId || null, item.productName, item.quantity, item.price, itemTotal, addedById]
        );

        // Mettre à jour le stock si productId existe
        if (item.productId) {
          await dbRun(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [item.quantity, item.productId]
          );
        }
      }

      // Mettre à jour le total de la commande
      const newTotal = (order as any).total + additionalTotal;
      await dbRun(
        'UPDATE orders SET total = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [newTotal, id]
      );

      res.json({
        message: 'Articles ajoutés',
        orderId: id,
        additionalTotal,
        newTotal
      });
    } catch (error) {
      console.error('Erreur addItems:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { items, status, paymentMethod, discount, discountType, paidAmount } = req.body;

      // Vérifier si la commande est déjà payée (sauf si c'est pour la marquer comme payée)
      const order = await dbGet('SELECT status FROM orders WHERE id = ?', [id]) as any;
      
      if (!order) {
        return res.status(404).json({ error: 'Commande introuvable' });
      }

      // Bloquer toute modification si la commande est déjà payée
      if (order.status === 'payee' && !(status === 'payee')) {
        return res.status(403).json({ error: 'Ticket payé non modifiable' });
      }

      // Bloquer la modification des articles pour les commandes payées
      if (items && Array.isArray(items) && order.status === 'payee') {
        return res.status(403).json({ error: 'Impossible de modifier un ticket payé' });
      }

      if (status) {
        let updateQuery = 'UPDATE orders SET status = ?, updatedAt = CURRENT_TIMESTAMP';
        let params: any[] = [status];

        // Si c'est un paiement, enregistrer les infos de paiement et le caissier
        if (status === 'payee' && paymentMethod) {
          updateQuery += ', paymentMethod = ?, discount = ?, discountType = ?, paidAmount = ?, paidBy = ?';
          params.push(paymentMethod, discount || 0, discountType || null, paidAmount || 0, req.user!.id);
        }

        updateQuery += ' WHERE id = ?';
        params.push(id);

        await dbRun(updateQuery, params);
      }

      if (items && Array.isArray(items)) {
        // Supprimer les anciens articles
        await dbRun('DELETE FROM order_items WHERE orderId = ?', [id]);

        // Recalculer le total
        const total = items.reduce((sum: number, item: any) => {
          return sum + (item.price * item.quantity);
        }, 0);

        // Mettre à jour le total
        await dbRun('UPDATE orders SET total = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [total, id]);

        // Insérer les nouveaux articles
        for (const item of items) {
          const itemTotal = item.price * item.quantity;
          await dbRun(
            'INSERT INTO order_items (orderId, productName, quantity, price, total) VALUES (?, ?, ?, ?, ?)',
            [id, item.productName, item.quantity, item.price, itemTotal]
          );
        }
      }

      res.json({ message: 'Commande mise à jour' });
    } catch (error) {
      console.error('Erreur update order:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Vérifier si la commande est payée
      const order = await dbGet('SELECT status FROM orders WHERE id = ?', [id]) as any;
      
      if (!order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      // Bloquer la suppression des commandes payées
      if (order.status === 'payee') {
        return res.status(403).json({ error: 'Impossible de supprimer un ticket payé' });
      }

      const result = await dbRun('DELETE FROM orders WHERE id = ?', [id]);

      if ((result as any).changes === 0) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      res.json({ message: 'Commande supprimée' });
    } catch (error) {
      console.error('Erreur delete order:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async getDailySales(req: AuthRequest, res: Response) {
    try {
      const { date } = req.query;
      
      let query = `
        SELECT 
          DATE(createdAt) as date,
          SUM(total) as totalSales,
          COUNT(*) as orderCount
        FROM orders
        WHERE status = 'payee'
      `;

      if (date) {
        query += ` AND DATE(createdAt) = ?`;
        const result = await dbGet(query + ' GROUP BY DATE(createdAt)', [date]);
        return res.json(result || { date, totalSales: 0, orderCount: 0 });
      }

      query += ` AND DATE(createdAt) = DATE('now') GROUP BY DATE(createdAt)`;
      const result = await dbGet(query);
      
      res.json(result || { date: new Date().toISOString().split('T')[0], totalSales: 0, orderCount: 0 });
    } catch (error) {
      console.error('Erreur getDailySales:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async getZReport(req: AuthRequest, res: Response) {
    try {
      const { date } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];

      // Récupérer toutes les commandes payées du jour
      const orders = await dbAll(`
        SELECT o.*, u.nom, u.prenom
        FROM orders o
        JOIN users u ON o.serveurId = u.id
        WHERE o.status = 'payee' AND DATE(o.createdAt) = ?
        ORDER BY o.createdAt
      `, [targetDate]);

      // Récupérer tous les articles vendus avec leur catégorie
      const items = await dbAll(`
        SELECT oi.*, o.createdAt, o.paymentMethod, p.categoryId, c.type as categoryType
        FROM order_items oi
        JOIN orders o ON oi.orderId = o.id
        LEFT JOIN products p ON oi.productId = p.id
        LEFT JOIN categories c ON p.categoryId = c.id
        WHERE o.status = 'payee' AND DATE(o.createdAt) = ?
        ORDER BY oi.productName
      `, [targetDate]);

      // Grouper par mode de paiement
      const paymentSummary = await dbAll(`
        SELECT 
          paymentMethod,
          COUNT(*) as count,
          SUM(total - discount) as total,
          SUM(paidAmount) as paidAmount
        FROM orders
        WHERE status = 'payee' AND DATE(createdAt) = ?
        GROUP BY paymentMethod
      `, [targetDate]);

      // Grouper les articles par nom
      const itemsSummary: any = {};
      const drinksDetails: any = {}; // Détails des boissons
      
      items.forEach((item: any) => {
        // Grouper tous les articles
        if (!itemsSummary[item.productName]) {
          itemsSummary[item.productName] = {
            name: item.productName,
            quantity: 0,
            total: 0,
            price: item.price,
            categoryType: item.categoryType || 'repas'
          };
        }
        itemsSummary[item.productName].quantity += item.quantity;
        itemsSummary[item.productName].total += item.total;

        // Si c'est une boisson, ajouter aux détails boissons
        if (item.categoryType === 'boissons') {
          if (!drinksDetails[item.productName]) {
            drinksDetails[item.productName] = {
              name: item.productName,
              quantity: 0,
              total: 0,
              price: item.price
            };
          }
          drinksDetails[item.productName].quantity += item.quantity;
          drinksDetails[item.productName].total += item.total;
        }
      });

      const totalSales = orders.reduce((sum, order: any) => {
        const finalTotal = order.total - (order.discount || 0);
        return sum + finalTotal;
      }, 0);

      const totalDiscount = orders.reduce((sum, order: any) => sum + (order.discount || 0), 0);

      res.json({
        date: targetDate,
        orders: orders.length,
        totalSales,
        totalDiscount,
        paymentSummary,
        itemsSummary: Object.values(itemsSummary),
        drinksDetails: Object.values(drinksDetails), // Section boissons détaillée
        ordersList: orders
      });
    } catch (error) {
      console.error('Erreur getZReport:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async searchByTicket(req: AuthRequest, res: Response) {
    try {
      const { ticketNumber } = req.query;

      if (!ticketNumber) {
        return res.status(400).json({ error: 'Numéro de ticket requis' });
      }

      const order = await dbGet(`
        SELECT o.*, u.nom, u.prenom, u.username as serveurName
        FROM orders o
        JOIN users u ON o.serveurId = u.id
        WHERE o.ticketNumber = ?
      `, [ticketNumber]);

      if (!order) {
        return res.status(404).json({ error: 'Ticket non trouvé' });
      }

      const items = await dbAll(
        'SELECT * FROM order_items WHERE orderId = ?',
        [(order as any).id]
      );

      res.json({ ...order, items });
    } catch (error) {
      console.error('Erreur searchByTicket:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async clearSystem(req: AuthRequest, res: Response) {
    try {
      // Supprimer d'abord les order_items des commandes payées et annulées
      await dbRun(`
        DELETE FROM order_items 
        WHERE orderId IN (
          SELECT id FROM orders WHERE status IN ('payee', 'annulee')
        )
      `);
      
      // Ensuite supprimer les commandes payées et annulées
      const result = await dbRun("DELETE FROM orders WHERE status IN ('payee', 'annulee')");
      
      res.json({ 
        message: 'Système vidé avec succès',
        note: 'Les commandes en attente ont été conservées',
        deleted: (result as any).changes || 0
      });
    } catch (error) {
      console.error('Erreur clearSystem:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}
