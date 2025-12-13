import { Response } from 'express';
import { db, dbGet, dbAll, dbRun } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export class ProductController {
  static async create(req: AuthRequest, res: Response) {
    try {
      const { categoryId, name, description, price, stock, image } = req.body;

      if (!categoryId || !name || price === undefined) {
        return res.status(400).json({ error: 'Catégorie, nom et prix requis' });
      }

      const result = await dbRun(
        'INSERT INTO products (categoryId, name, description, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)',
        [categoryId, name, description || null, price, stock || 0, image || null]
      );

      res.status(201).json({
        message: 'Produit créé',
        productId: (result as any).lastID
      });
    } catch (error) {
      console.error('Erreur create product:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { categoryId, available } = req.query;
      let query = `
        SELECT p.*, c.name as categoryName 
        FROM products p
        JOIN categories c ON p.categoryId = c.id
      `;
      const conditions: string[] = [];
      const values: any[] = [];

      if (categoryId) {
        conditions.push('p.categoryId = ?');
        values.push(categoryId);
      }

      if (available !== undefined) {
        conditions.push('p.available = ?');
        values.push(available === 'true' ? 1 : 0);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY c.name, p.name';

      const products = await dbAll(query, values);
      res.json(products);
    } catch (error) {
      console.error('Erreur getAll products:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const product = await dbGet(`
        SELECT p.*, c.name as categoryName 
        FROM products p
        JOIN categories c ON p.categoryId = c.id
        WHERE p.id = ?
      `, [id]);

      if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      res.json(product);
    } catch (error) {
      console.error('Erreur getById product:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { categoryId, name, description, price, stock, image, available } = req.body;

      const updates: string[] = [];
      const values: any[] = [];

      if (categoryId !== undefined) {
        updates.push('categoryId = ?');
        values.push(categoryId);
      }
      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (price !== undefined) {
        updates.push('price = ?');
        values.push(price);
      }
      if (stock !== undefined) {
        updates.push('stock = ?');
        values.push(stock);
      }
      if (image !== undefined) {
        updates.push('image = ?');
        values.push(image);
      }
      if (available !== undefined) {
        updates.push('available = ?');
        values.push(available ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      }

      updates.push('updatedAt = CURRENT_TIMESTAMP');
      values.push(id);

      const result = await dbRun(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);

      if ((result as any).changes === 0) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      res.json({ message: 'Produit mis à jour' });
    } catch (error) {
      console.error('Erreur update product:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await dbRun('DELETE FROM products WHERE id = ?', [id]);

      if ((result as any).changes === 0) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      res.json({ message: 'Produit supprimé' });
    } catch (error) {
      console.error('Erreur delete product:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async getByCategoryGrouped(req: AuthRequest, res: Response) {
    try {
      const categories = await dbAll(`
        SELECT * FROM categories ORDER BY name
      `);

      const result = [];
      for (const category of categories) {
        const products = await dbAll(
          'SELECT * FROM products WHERE categoryId = ? AND available = 1 ORDER BY name',
          [(category as any).id]
        );
        result.push({
          ...category,
          products
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Erreur getByCategoryGrouped:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}
