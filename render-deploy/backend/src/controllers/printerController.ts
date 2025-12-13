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

const dbRun = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized'));
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export class PrinterController {
  // Récupérer toutes les configurations d'imprimantes
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const printers = await dbAll('SELECT * FROM printer_configs ORDER BY destination, createdAt DESC');
      res.json(printers);
    } catch (error) {
      console.error('Erreur getAll printers:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Récupérer une configuration par ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const printer = await dbGet('SELECT * FROM printer_configs WHERE id = ?', [id]);
      
      if (!printer) {
        return res.status(404).json({ error: 'Imprimante non trouvée' });
      }
      
      res.json(printer);
    } catch (error) {
      console.error('Erreur getById printer:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Créer une nouvelle configuration d'imprimante
  static async create(req: AuthRequest, res: Response) {
    try {
      const { destination, type, name, usbPort, networkIp, networkPort, isActive } = req.body;

      if (!destination || !type || !name) {
        return res.status(400).json({ error: 'Destination, type et nom requis' });
      }

      if (type === 'USB' && !usbPort) {
        return res.status(400).json({ error: 'Port USB requis pour une imprimante USB' });
      }

      if (type === 'NETWORK' && (!networkIp || !networkPort)) {
        return res.status(400).json({ error: 'IP et port réseau requis pour une imprimante réseau' });
      }

      const result = await dbRun(
        `INSERT INTO printer_configs (destination, type, name, usbPort, networkIp, networkPort, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [destination, type, name, usbPort || null, networkIp || null, networkPort || null, isActive ? 1 : 0]
      );

      const printer = await dbGet('SELECT * FROM printer_configs WHERE id = ?', [result.lastID]);
      res.status(201).json(printer);
    } catch (error) {
      console.error('Erreur create printer:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Mettre à jour une configuration d'imprimante
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { destination, type, name, usbPort, networkIp, networkPort, isActive } = req.body;

      const printer = await dbGet('SELECT * FROM printer_configs WHERE id = ?', [id]);
      if (!printer) {
        return res.status(404).json({ error: 'Imprimante non trouvée' });
      }

      if (type === 'USB' && !usbPort) {
        return res.status(400).json({ error: 'Port USB requis pour une imprimante USB' });
      }

      if (type === 'NETWORK' && (!networkIp || !networkPort)) {
        return res.status(400).json({ error: 'IP et port réseau requis pour une imprimante réseau' });
      }

      await dbRun(
        `UPDATE printer_configs 
         SET destination = ?, type = ?, name = ?, usbPort = ?, networkIp = ?, networkPort = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [destination, type, name, usbPort || null, networkIp || null, networkPort || null, isActive ? 1 : 0, id]
      );

      const updatedPrinter = await dbGet('SELECT * FROM printer_configs WHERE id = ?', [id]);
      res.json(updatedPrinter);
    } catch (error) {
      console.error('Erreur update printer:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Supprimer une configuration d'imprimante
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const printer = await dbGet('SELECT * FROM printer_configs WHERE id = ?', [id]);
      if (!printer) {
        return res.status(404).json({ error: 'Imprimante non trouvée' });
      }

      await dbRun('DELETE FROM printer_configs WHERE id = ?', [id]);
      res.json({ message: 'Imprimante supprimée avec succès' });
    } catch (error) {
      console.error('Erreur delete printer:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Récupérer l'imprimante active pour une destination (BAR ou CUISINE)
  static async getByDestination(req: AuthRequest, res: Response) {
    try {
      const { destination } = req.params;

      if (!['BAR', 'CUISINE'].includes(destination)) {
        return res.status(400).json({ error: 'Destination invalide (BAR ou CUISINE)' });
      }

      const printer = await dbGet(
        'SELECT * FROM printer_configs WHERE destination = ? AND isActive = 1 ORDER BY createdAt DESC LIMIT 1',
        [destination]
      );

      if (!printer) {
        return res.status(404).json({ error: `Aucune imprimante active pour ${destination}` });
      }

      res.json(printer);
    } catch (error) {
      console.error('Erreur getByDestination printer:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Tester une imprimante
  static async testPrint(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const printer = await dbGet(
        'SELECT * FROM printer_configs WHERE id = ?',
        [id]
      );

      if (!printer) {
        return res.status(404).json({ error: 'Imprimante non trouvée' });
      }

      // Test d'impression
      const success = await ThermalPrintService.testPrint(printer);

      if (success) {
        res.json({ 
          success: true, 
          message: `Test d'impression envoyé vers ${printer.name}` 
        });
      } else {
        res.status(500).json({ 
          error: `Échec du test d'impression sur ${printer.name}`,
          details: 'Vérifiez que l\'imprimante est connectée et allumée'
        });
      }
    } catch (error) {
      console.error('Erreur testPrint printer:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}
