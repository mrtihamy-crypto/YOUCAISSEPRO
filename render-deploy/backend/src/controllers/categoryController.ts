import { Response } from 'express';
import { db, dbGet, dbAll, dbRun } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export class CategoryController {
  static async create(req: AuthRequest, res: Response) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Le nom est requis' });
      }

      const result = await dbRun(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [name, description || null]
      );

      res.status(201).json({
        message: 'Catégorie créée',
        categoryId: (result as any).lastID
      });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Cette catégorie existe déjà' });
      }
      console.error('Erreur create category:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async getAll(req: AuthRequest, res: Response) {
    try {
      const categories = await dbAll(`
        SELECT c.*, COUNT(p.id) as productCount 
        FROM categories c
        LEFT JOIN products p ON c.id = p.categoryId
        GROUP BY c.id
        ORDER BY c.name
      `);
      res.json(categories);
    } catch (error) {
      console.error('Erreur getAll categories:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const category = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);

      if (!category) {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
      }

      const products = await dbAll('SELECT * FROM products WHERE categoryId = ?', [id]);
      res.json({ ...category, products });
    } catch (error) {
      console.error('Erreur getById category:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const updates: string[] = [];
      const values: any[] = [];

      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      }

      updates.push('updatedAt = CURRENT_TIMESTAMP');
      values.push(id);

      const result = await dbRun(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);

      if ((result as any).changes === 0) {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
      }

      res.json({ message: 'Catégorie mise à jour' });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Ce nom de catégorie existe déjà' });
      }
      console.error('Erreur update category:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await dbRun('DELETE FROM categories WHERE id = ?', [id]);

      if ((result as any).changes === 0) {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
      }

      res.json({ message: 'Catégorie supprimée' });
    } catch (error) {
      console.error('Erreur delete category:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}
