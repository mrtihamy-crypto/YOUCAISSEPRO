import express from 'express';
import { ProductController } from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../../../shared/types';

const router = express.Router();

router.use(authenticate);

// Admin et Caissier peuvent tout faire
router.post('/', authorize(UserRole.ADMIN, UserRole.CAISSIER), ProductController.create);
router.put('/:id', authorize(UserRole.ADMIN, UserRole.CAISSIER), ProductController.update);
router.delete('/:id', authorize(UserRole.ADMIN, UserRole.CAISSIER), ProductController.delete);

// Tout le monde authentifié peut voir
router.get('/', ProductController.getAll);
router.get('/grouped', ProductController.getByCategoryGrouped);
router.get('/:id', ProductController.getById);

export default router;
