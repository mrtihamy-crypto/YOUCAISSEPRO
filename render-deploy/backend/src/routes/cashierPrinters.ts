import express from 'express';
import { authorize } from '../middleware/auth';
import { UserRole } from '../../../shared/types';
import { CashierPrinterController } from '../controllers/cashierPrinterController';

const router = express.Router();

// Toutes les routes nécessitent le rôle CAISSIER
router.get('/my-printers', authorize(UserRole.CAISSIER), CashierPrinterController.getMyPrinters);
router.post('/save', authorize(UserRole.CAISSIER), CashierPrinterController.savePrinter);
router.delete('/:id', authorize(UserRole.CAISSIER), CashierPrinterController.deletePrinter);
router.post('/test', authorize(UserRole.CAISSIER), CashierPrinterController.testPrinter);
router.post('/print-ticket', authorize(UserRole.CAISSIER), CashierPrinterController.printTicket);

// Routes personnalisation
router.get('/customization', authorize(UserRole.CAISSIER), CashierPrinterController.getCustomization);
router.post('/customization', authorize(UserRole.CAISSIER), CashierPrinterController.saveCustomization);

export default router;
