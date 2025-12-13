import express from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../../../shared/types';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// Route de déconnexion accessible à tous
router.post('/logout', UserController.logout);

// Routes admin uniquement
router.use(authorize(UserRole.ADMIN));

router.get('/stats/dashboard', UserController.getStats);
router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.put('/:id', UserController.update);
router.put('/:id/reset-password', UserController.resetPassword);
router.delete('/:id', UserController.delete);

export default router;
