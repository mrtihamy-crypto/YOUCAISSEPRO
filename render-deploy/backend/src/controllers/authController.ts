import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, dbGet, dbRun } from '../config/database';
import { User, UserRole } from '../../../shared/types';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username et password requis' });
      }

      const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]) as User | undefined;

      if (!user) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      // Mettre à jour lastLogin et isActive
      await dbRun(
        'UPDATE users SET lastLogin = CURRENT_TIMESTAMP, isActive = 1 WHERE id = ?',
        [user.id]
      );

      // Créer une session
      await dbRun(
        'INSERT INTO user_sessions (userId) VALUES (?)',
        [user.id]
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          nom: user.nom,
          prenom: user.prenom
        }
      });
    } catch (error) {
      console.error('Erreur login:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { username, password, role, nom, prenom } = req.body;

      if (!username || !password || !role || !nom || !prenom) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
      }

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await dbRun(
        'INSERT INTO users (username, password, role, nom, prenom) VALUES (?, ?, ?, ?, ?)',
        [username, hashedPassword, role, nom, prenom]
      );

      res.status(201).json({
        message: 'Utilisateur créé',
        userId: (result as any).lastID
      });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Username déjà utilisé' });
      }
      console.error('Erreur register:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}
