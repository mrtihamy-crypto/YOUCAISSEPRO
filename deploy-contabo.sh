#!/bin/bash

########################################
# YOU CAISSE PRO - Script d'Installation Automatique
# Pour Contabo VPS Ubuntu 24.04
########################################

set -e  # Arrêt en cas d'erreur

echo "=========================================="
echo "🚀 Installation de YOU CAISSE PRO"
echo "=========================================="
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier si le script est exécuté en root
if [ "$EUID" -ne 0 ]; then 
    print_error "Ce script doit être exécuté en tant que root"
    echo "Utilisez: sudo bash deploy-contabo.sh"
    exit 1
fi

# Demander les informations
echo "=========================================="
echo "📝 Configuration"
echo "=========================================="
echo ""

read -p "Entrez le nom de domaine ou l'IP du serveur (ex: 123.45.67.89): " SERVER_IP
read -p "Entrez un mot de passe pour la base de données: " DB_PASSWORD
read -p "Entrez un secret JWT (laissez vide pour générer): " JWT_SECRET

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    print_info "JWT Secret généré automatiquement"
fi

echo ""
print_info "Configuration:"
print_info "  Serveur: $SERVER_IP"
print_info "  Base de données: PostgreSQL"
print_info "  Port Backend: 3001"
print_info "  Port Frontend: 80"
echo ""

read -p "Confirmer l'installation? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    print_error "Installation annulée"
    exit 1
fi

echo ""
echo "=========================================="
echo "📦 Mise à jour du système"
echo "=========================================="
print_info "Mise à jour des paquets..."
apt update && apt upgrade -y
print_success "Système mis à jour"

echo ""
echo "=========================================="
echo "🔧 Installation des dépendances"
echo "=========================================="

# Installation de Node.js 20
print_info "Installation de Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
print_success "Node.js $(node --version) installé"

# Installation de Git
print_info "Installation de Git..."
apt install -y git
print_success "Git installé"

# Installation de PostgreSQL
print_info "Installation de PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
print_success "PostgreSQL installé"

# Installation de Nginx
print_info "Installation de Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx
print_success "Nginx installé"

# Installation de PM2
print_info "Installation de PM2..."
npm install -g pm2
print_success "PM2 installé"

echo ""
echo "=========================================="
echo "🗄️  Configuration de PostgreSQL"
echo "=========================================="

# Créer la base de données et l'utilisateur
print_info "Création de la base de données..."
sudo -u postgres psql <<EOF
CREATE DATABASE youcaisse;
CREATE USER youcaisse WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE youcaisse TO youcaisse;
\c youcaisse
GRANT ALL ON SCHEMA public TO youcaisse;
EOF
print_success "Base de données créée"

echo ""
echo "=========================================="
echo "📥 Téléchargement de l'application"
echo "=========================================="

# Créer le répertoire d'application
APP_DIR="/var/www/youcaisse"
print_info "Création du répertoire: $APP_DIR"
mkdir -p $APP_DIR
cd $APP_DIR

# Note: L'utilisateur devra uploader son code
print_info "Répertoire créé: $APP_DIR"
print_info "Vous devrez uploader votre code dans ce répertoire"

echo ""
echo "=========================================="
echo "⚙️  Configuration Backend"
echo "=========================================="

# Créer le fichier .env pour le backend
mkdir -p $APP_DIR/backend
cat > $APP_DIR/backend/.env <<EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
DATABASE_URL=postgresql://youcaisse:$DB_PASSWORD@localhost:5432/youcaisse
EOF

print_success "Backend configuré"

echo ""
echo "=========================================="
echo "⚙️  Configuration Frontend"
echo "=========================================="

# Créer le fichier .env pour le frontend
mkdir -p $APP_DIR/frontend
cat > $APP_DIR/frontend/.env <<EOF
VITE_API_URL=http://$SERVER_IP:3001/api
EOF

print_success "Frontend configuré"

echo ""
echo "=========================================="
echo "🔥 Configuration du Pare-feu"
echo "=========================================="

print_info "Configuration UFW..."
apt install -y ufw
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3001/tcp  # Backend API
ufw status
print_success "Pare-feu configuré"

echo ""
echo "=========================================="
echo "🌐 Configuration Nginx"
echo "=========================================="

# Configuration Nginx pour le frontend
cat > /etc/nginx/sites-available/youcaisse <<'EOF'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root /var/www/youcaisse/frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Proxy vers le backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

ln -sf /etc/nginx/sites-available/youcaisse /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
print_success "Nginx configuré"

echo ""
echo "=========================================="
echo "📝 Création des scripts de déploiement"
echo "=========================================="

# Script de déploiement
cat > $APP_DIR/deploy.sh <<'DEPLOY_SCRIPT'
#!/bin/bash
set -e

echo "🚀 Déploiement de YOU CAISSE PRO..."

cd /var/www/youcaisse

# Backend
echo "📦 Installation backend..."
cd backend
npm install --production
npm run build

# Migrations base de données
echo "🗄️  Migrations base de données..."
npm run migrate || true

# Démarrer avec PM2
echo "🔄 Redémarrage backend..."
pm2 delete youcaisse-backend || true
pm2 start dist/index.js --name youcaisse-backend
pm2 save

# Frontend
echo "📦 Build frontend..."
cd ../frontend
npm install
npm run build

# Redémarrer Nginx
echo "🔄 Redémarrage Nginx..."
systemctl reload nginx

echo "✅ Déploiement terminé!"
pm2 status
DEPLOY_SCRIPT

chmod +x $APP_DIR/deploy.sh
print_success "Script de déploiement créé"

# Script d'upload
cat > ~/upload-code.sh <<'UPLOAD_SCRIPT'
#!/bin/bash

echo "📤 Guide d'upload du code"
echo "=========================="
echo ""
echo "Option 1 - Depuis votre PC Windows avec SCP:"
echo "  1. Ouvrez PowerShell"
echo "  2. Naviguez vers le dossier YOU CAISSE PRO"
echo "  3. Exécutez:"
echo "     scp -r backend frontend root@VOTRE_IP:/var/www/youcaisse/"
echo ""
echo "Option 2 - Avec WinSCP (plus simple):"
echo "  1. Téléchargez WinSCP: https://winscp.net"
echo "  2. Connectez-vous avec:"
echo "     - Protocole: SCP"
echo "     - Host: VOTRE_IP"
echo "     - User: root"
echo "     - Password: votre mot de passe"
echo "  3. Uploadez les dossiers backend et frontend vers /var/www/youcaisse/"
echo ""
echo "Option 3 - Avec Git:"
echo "  1. Créez un repo GitHub privé"
echo "  2. Push votre code"
echo "  3. Sur le serveur: git clone VOTRE_REPO /var/www/youcaisse"
echo ""
echo "Après l'upload, exécutez:"
echo "  cd /var/www/youcaisse"
echo "  bash deploy.sh"
echo ""
UPLOAD_SCRIPT

chmod +x ~/upload-code.sh
print_success "Guide d'upload créé"

# Configuration PM2 au démarrage
print_info "Configuration du démarrage automatique..."
pm2 startup systemd -u root --hp /root
print_success "Démarrage automatique configuré"

echo ""
echo "=========================================="
echo "✅ INSTALLATION TERMINÉE!"
echo "=========================================="
echo ""
print_success "Serveur configuré avec succès!"
echo ""
echo "📋 Informations importantes:"
echo "  - Répertoire app: $APP_DIR"
echo "  - Backend port: 3001"
echo "  - Frontend: http://$SERVER_IP"
echo "  - Base de données: PostgreSQL (youcaisse)"
echo ""
echo "🚀 Prochaines étapes:"
echo ""
echo "1️⃣  Uploadez votre code:"
echo "    bash ~/upload-code.sh  (pour voir le guide)"
echo ""
echo "2️⃣  Déployez l'application:"
echo "    cd $APP_DIR"
echo "    bash deploy.sh"
echo ""
echo "3️⃣  Vérifiez le statut:"
echo "    pm2 status"
echo "    pm2 logs youcaisse-backend"
echo ""
echo "4️⃣  Accédez à l'application:"
echo "    http://$SERVER_IP"
echo ""
echo "📝 Fichiers de configuration:"
echo "  - Backend .env: $APP_DIR/backend/.env"
echo "  - Frontend .env: $APP_DIR/frontend/.env"
echo "  - Nginx config: /etc/nginx/sites-available/youcaisse"
echo ""
echo "🔧 Commandes utiles:"
echo "  - Logs backend: pm2 logs youcaisse-backend"
echo "  - Redémarrer: pm2 restart youcaisse-backend"
echo "  - Status: pm2 status"
echo "  - Nginx logs: tail -f /var/log/nginx/error.log"
echo ""
print_success "Installation terminée avec succès! 🎉"
