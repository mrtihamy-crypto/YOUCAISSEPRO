import express from 'express';
import { ServerPrinterController } from '../controllers/serverPrinterController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../../../shared/types';

const router = express.Router();

router.use(authenticate);

// Routes accessibles uniquement aux SERVEUR
router.get('/my-printers', authorize(UserRole.SERVEUR), ServerPrinterController.getMyPrinters);
router.post('/save', authorize(UserRole.SERVEUR), ServerPrinterController.savePrinter);
router.delete('/:id', authorize(UserRole.SERVEUR), ServerPrinterController.deletePrinter);
router.post('/test', authorize(UserRole.SERVEUR), ServerPrinterController.testPrinter);
router.post('/print-ticket', authorize(UserRole.SERVEUR), ServerPrinterController.printTicket);

export default router;
