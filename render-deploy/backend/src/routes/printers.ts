import express from 'express';
import { PrinterController } from '../controllers/printerController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../../../shared/types';

const router = express.Router();

router.use(authenticate);

// Les ADMIN, CAISSIER et SERVEUR peuvent gérer les imprimantes
router.get('/', authorize(UserRole.ADMIN, UserRole.CAISSIER, UserRole.SERVEUR), PrinterController.getAll);
router.get('/:id', authorize(UserRole.ADMIN, UserRole.CAISSIER, UserRole.SERVEUR), PrinterController.getById);
router.post('/', authorize(UserRole.ADMIN, UserRole.CAISSIER, UserRole.SERVEUR), PrinterController.create);
router.put('/:id', authorize(UserRole.ADMIN, UserRole.CAISSIER, UserRole.SERVEUR), PrinterController.update);
router.delete('/:id', authorize(UserRole.ADMIN, UserRole.CAISSIER, UserRole.SERVEUR), PrinterController.delete);

// Route pour récupérer l'imprimante d'une destination (accessible à tous)
router.get('/destination/:destination', authorize(UserRole.SERVEUR, UserRole.CAISSIER, UserRole.ADMIN), PrinterController.getByDestination);

// Route pour tester une imprimante
router.post('/:id/test', authorize(UserRole.ADMIN, UserRole.CAISSIER, UserRole.SERVEUR), PrinterController.testPrint);

export default router;
