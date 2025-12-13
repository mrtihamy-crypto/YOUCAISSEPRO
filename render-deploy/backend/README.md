# YOU CAISSE PRO - Backend API

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copier `.env.example` vers `.env`:
```bash
cp .env.example .env
```

2. Modifier les variables d'environnement si nécessaire

## Démarrage

### Mode développement
```bash
npm run dev
```

### Initialiser avec des données de test
```bash
npm run seed
```

### Build production
```bash
npm run build
npm start
```

## API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription (Admin uniquement)

### Utilisateurs (Admin uniquement)
- `GET /api/users` - Liste des utilisateurs
- `GET /api/users/:id` - Détails d'un utilisateur
- `PUT /api/users/:id` - Modifier un utilisateur
- `DELETE /api/users/:id` - Supprimer un utilisateur

### Commandes
- `POST /api/orders` - Créer une commande (Serveur)
- `GET /api/orders` - Liste des commandes (Caissier, Admin)
- `GET /api/orders/:id` - Détails d'une commande
- `PUT /api/orders/:id` - Modifier une commande (Caissier, Admin)
- `DELETE /api/orders/:id` - Supprimer une commande (Caissier, Admin)
- `GET /api/orders/stats/daily-sales` - CA journalier (Caissier, Admin)

## Utilisateurs de test

Après `npm run seed`:
- **admin** / admin123 (ADMIN)
- **caissier1** / caissier123 (CAISSIER)
- **serveur1** / serveur123 (SERVEUR)
