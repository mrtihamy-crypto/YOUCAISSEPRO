import express from 'express';
import { CategoryController } from '../controllers/categoryController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../../../shared/types';

const router = express.Router();

router.use(authenticate);

// Admin et Caissier peuvent tout faire
router.post('/', authorize(UserRole.ADMIN, UserRole.CAISSIER), CategoryController.create);
router.put('/:id', authorize(UserRole.ADMIN, UserRole.CAISSIER), CategoryController.update);
router.delete('/:id', authorize(UserRole.ADMIN, UserRole.CAISSIER), CategoryController.delete);

// Tout le monde authentifié peut voir
router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getById);

export default router;
