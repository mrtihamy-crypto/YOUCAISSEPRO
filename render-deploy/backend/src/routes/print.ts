import { Router, Request, Response } from 'express';
import { dbGet, dbAll } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { UserRole } from '../../../shared/types';
// Lazy load ThermalPrintService to avoid import errors at startup
let ThermalPrintService: any = null;
const getThermalPrintService = () => {
  if (!ThermalPrintService) {
    try {
      ThermalPrintService = require('../utils/thermalPrintService').ThermalPrintService;
    } catch (e) {
      console.error('Failed to load ThermalPrintService:', e);
    }
  }
  return ThermalPrintService;
};

const router = Router();

// Route pour imprimer une commande
router.post('/order', authenticate, authorize(UserRole.SERVEUR, UserRole.CAISSIER), async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId est requis' });
    }

    // Récupérer la commande avec ses articles
    const order = await dbGet(`
      SELECT o.*, 
             u1.nom as createdByNom, u1.prenom as createdByPrenom,
             u2.nom as paidByNom, u2.prenom as paidByPrenom,
             u1.username as serveurName
      FROM orders o
      JOIN users u1 ON o.createdById = u1.id
      LEFT JOIN users u2 ON o.paidBy = u2.id
      WHERE o.id = ?
    `, [orderId]);
    
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const items = await dbAll(`
      SELECT oi.*, 
             c.type as categoryType
      FROM order_items oi
      LEFT JOIN products p ON oi.productId = p.id
      LEFT JOIN categories c ON p.categoryId = c.id
      WHERE oi.orderId = ?
    `, [orderId]);

    // Assigner une catégorie par défaut si manquante basée sur le nom du produit
    const itemsWithDefaults = items.map((item: any) => {
      if (!item.categoryType) {
        const boissonsKeywords = ['café', 'thé', 'jus', 'eau', 'bière', 'vin', 'alcool', 'boisson', 'soda', 'smoothie', 'cocktail'];
        const productName = (item.productName || '').toLowerCase();
        const isBeverage = boissonsKeywords.some(keyword => productName.includes(keyword));
        item.categoryType = isBeverage ? 'boissons' : 'repas';
      }
      return item;
    });

    // Chercher les imprimantes configurées pour chaque destination
    const destinations = new Set(itemsWithDefaults.map((item: any) => item.categoryType).filter((d: string) => d));
    
    let printResults: any = {
      printed: [],
      failed: []
    };

    // Imprimer sur les imprimantes correspondantes
    if (destinations.size > 0) {
      for (const destination of destinations) {
        try {
          // Récupérer les items pour cette destination
          const destinationItems = itemsWithDefaults.filter((item: any) => item.categoryType === destination);
          
          // Chercher une imprimante configurée pour cette destination
          const printerDestination = destination === 'boissons' ? 'BAR' : 'CUISINE';
          
          let printer;
          try {
            printer = await dbGet(`
              SELECT * FROM printer_configs 
              WHERE destination = ? AND isActive = 1 
              LIMIT 1
            `, [printerDestination]);
          } catch (dbError) {
            console.error('Database error fetching printer:', dbError);
            printer = null;
          }

          if (printer) {
            try {
              // Formater les données pour l'impression
              const ticketData = {
                ticketNumber: order.ticketNumber,
                clientName: order.clientName || 'Sans nom',
                mealTime: order.mealTime,
                notes: order.notes,
                items: destinationItems.map((item: any) => ({
                  quantity: item.quantity,
                  productName: item.productName,
                  price: item.price,
                  total: item.total
                })),
                serveur: order.serveurName || 'Serveur',
                destination: printerDestination,
                createdAt: order.createdAt
              };

              // Essayer d'imprimer
              const PrintService = getThermalPrintService();
              let printSuccess = false;
              if (PrintService) {
                printSuccess = await PrintService.printTicket(printer, ticketData);
              } else {
                console.log('ThermalPrintService not available, skipping printing');
              }
              
              if (printSuccess) {
                printResults.printed.push({
                  destination: printerDestination,
                  items: destinationItems.length,
                  printer: printer.name
                });
              } else {
                printResults.failed.push({
                  destination: printerDestination,
                  error: 'Erreur d\'impression'
                });
              }
            } catch (printError) {
              console.error(`Erreur impression:`, printError);
              printResults.failed.push({
                destination: printerDestination,
                error: 'Erreur d\'impression'
              });
            }
          } else {
            printResults.failed.push({
              destination: printerDestination,
              error: 'Aucune imprimante configurée'
            });
          }
        } catch (destError) {
          console.error(`Erreur traitement destination:`, destError);
        }
      }
    }

    // Retourner le résultat
    res.json({ 
      success: true, 
      message: 'Commande envoyée à l\'affichage et impression',
      results: printResults,
      order: { ...order, items: itemsWithDefaults }
    });
  } catch (error) {
    console.error('Erreur print/order endpoint:', error);
    res.status(500).json({ error: 'Erreur lors de l\'impression: ' + (error instanceof Error ? error.message : 'unknown error') });
  }
});

// Route pour récupérer les tickets séparés par destination
router.get('/order/:id/tickets', authenticate, authorize(UserRole.SERVEUR, UserRole.CAISSIER), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Récupérer la commande
    const order = await dbGet(`
      SELECT o.*, 
             u1.nom as createdByNom, u1.prenom as createdByPrenom,
             u1.username as serveurName
      FROM orders o
      JOIN users u1 ON o.createdById = u1.id
      WHERE o.id = ?
    `, [id]);
    
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Récupérer les articles groupés par destination
    const items = await dbAll(`
      SELECT oi.*, 
             c.type as categoryType,
             p.name as productName
      FROM order_items oi
      LEFT JOIN products p ON oi.productId = p.id
      LEFT JOIN categories c ON p.categoryId = c.id
      WHERE oi.orderId = ?
      ORDER BY c.type, oi.productName
    `, [id]);

    // Grouper par destination (BAR/CUISINE)
    const ticketsByDestination: any = {};
    
    for (const item of items) {
      const destination = item.categoryType || 'BAR'; // Par défaut BAR
      if (!ticketsByDestination[destination]) {
        ticketsByDestination[destination] = {
          destination,
          items: [],
          order
        };
      }
      ticketsByDestination[destination].items.push(item);
    }

    res.json(Object.values(ticketsByDestination));
  } catch (error) {
    console.error('Erreur récupération tickets:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des tickets' });
  }
});

// Route de test d'impression
router.post('/test', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: 'Test d\'impression' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du test' });
  }
});

export default router;
