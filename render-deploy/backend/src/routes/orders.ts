import express from 'express';
import { OrderController } from '../controllers/orderController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../../../shared/types';

const router = express.Router();

router.use(authenticate);

// Routes avec chemins spécifiques AVANT les routes avec paramètres
// Chiffre d'affaires journalier
router.get('/stats/daily-sales', authorize(UserRole.CAISSIER, UserRole.ADMIN), OrderController.getDailySales);

// Rapport Z
router.get('/stats/z-report', authorize(UserRole.CAISSIER, UserRole.ADMIN), OrderController.getZReport);

// Recherche par numéro de ticket
router.get('/search/ticket', authorize(UserRole.CAISSIER, UserRole.ADMIN), OrderController.searchByTicket);

// Vider le système (supprimer commandes payées/annulées)
router.delete('/system/clear', authorize(UserRole.CAISSIER, UserRole.ADMIN), OrderController.clearSystem);

// Serveur peut créer des commandes
router.post('/', authorize(UserRole.SERVEUR), OrderController.create);

// Serveur peut ajouter des articles à une commande existante
router.post('/:id/items', authorize(UserRole.SERVEUR), OrderController.addItems);

// Caissier, Admin et Serveur peuvent voir toutes les commandes
router.get('/', authorize(UserRole.CAISSIER, UserRole.ADMIN, UserRole.SERVEUR), OrderController.getAll);
router.get('/:id', authorize(UserRole.CAISSIER, UserRole.ADMIN, UserRole.SERVEUR), OrderController.getById);

// Caissier peut modifier et supprimer
router.put('/:id', authorize(UserRole.CAISSIER, UserRole.ADMIN), OrderController.update);
router.delete('/:id', authorize(UserRole.CAISSIER, UserRole.ADMIN), OrderController.delete);

export default router;
