# YOU CAISSE PRO - Deploiement Simple vers Contabo

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deploiement YOU CAISSE PRO sur Contabo" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$serverIP = Read-Host "Entrez l'adresse IP de votre serveur Contabo"

if ([string]::IsNullOrWhiteSpace($serverIP)) {
    Write-Host "Erreur: L'adresse IP est obligatoire" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Serveur: $serverIP" -ForegroundColor Yellow
Write-Host ""
Write-Host "ETAPES A SUIVRE:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Connectez-vous a votre serveur avec PuTTY ou SSH:" -ForegroundColor Yellow
Write-Host "   ssh root@$serverIP" -ForegroundColor White
Write-Host ""
Write-Host "2. Une fois connecte, copiez et collez cette commande:" -ForegroundColor Yellow
Write-Host ""

$installCommand = @"
wget -O /root/install-youcaisse.sh https://raw.githubusercontent.com/yourusername/YOUCAISSEPRO/main/deploy-contabo.sh && chmod +x /root/install-youcaisse.sh && bash /root/install-youcaisse.sh
"@

Write-Host $installCommand -ForegroundColor Cyan
Write-Host ""
Write-Host "OU utilisez cette methode manuelle:" -ForegroundColor Yellow
Write-Host ""

# Generer un JWT secret
$jwtSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))

Write-Host "Copiez les commandes suivantes une par une:" -ForegroundColor Yellow
Write-Host ""
Write-Host "# Mise a jour du systeme" -ForegroundColor Green
Write-Host "apt update && apt upgrade -y" -ForegroundColor White
Write-Host ""
Write-Host "# Installation Node.js 20" -ForegroundColor Green
Write-Host "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -" -ForegroundColor White
Write-Host "apt install -y nodejs" -ForegroundColor White
Write-Host ""
Write-Host "# Installation des autres outils" -ForegroundColor Green
Write-Host "apt install -y git postgresql postgresql-contrib nginx ufw unzip" -ForegroundColor White
Write-Host ""
Write-Host "# Installation PM2" -ForegroundColor Green
Write-Host "npm install -g pm2" -ForegroundColor White
Write-Host ""
Write-Host "# Configuration PostgreSQL" -ForegroundColor Green
Write-Host 'sudo -u postgres psql -c "CREATE DATABASE youcaisse;"' -ForegroundColor White
Write-Host 'sudo -u postgres psql -c "CREATE USER youcaisse WITH ENCRYPTED PASSWORD ' + "'VotreMotDePasse';" + '"' -ForegroundColor White
Write-Host 'sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE youcaisse TO youcaisse;"' -ForegroundColor White
Write-Host 'sudo -u postgres psql -d youcaisse -c "GRANT ALL ON SCHEMA public TO youcaisse;"' -ForegroundColor White
Write-Host ""
Write-Host "# Creation des repertoires" -ForegroundColor Green
Write-Host "mkdir -p /var/www/youcaisse" -ForegroundColor White
Write-Host ""
Write-Host "# Configuration du pare-feu" -ForegroundColor Green
Write-Host "ufw --force enable" -ForegroundColor White
Write-Host "ufw allow 22/tcp" -ForegroundColor White
Write-Host "ufw allow 80/tcp" -ForegroundColor White
Write-Host "ufw allow 443/tcp" -ForegroundColor White
Write-Host "ufw allow 3001/tcp" -ForegroundColor White
Write-Host ""

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Maintenant, uploadez votre code:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1 - Avec WinSCP (RECOMMANDE):" -ForegroundColor Yellow
Write-Host "  1. Telechargez WinSCP: https://winscp.net" -ForegroundColor White
Write-Host "  2. Connectez-vous avec:" -ForegroundColor White
Write-Host "     - Host: $serverIP" -ForegroundColor White
Write-Host "     - User: root" -ForegroundColor White
Write-Host "     - Password: (votre mot de passe)" -ForegroundColor White
Write-Host "  3. Uploadez les dossiers:" -ForegroundColor White
Write-Host "     - backend -> /var/www/youcaisse/backend" -ForegroundColor White
Write-Host "     - frontend -> /var/www/youcaisse/frontend" -ForegroundColor White
Write-Host "     - shared -> /var/www/youcaisse/shared" -ForegroundColor White
Write-Host ""
Write-Host "Option 2 - Avec SCP:" -ForegroundColor Yellow
Write-Host '  scp -r backend frontend shared root@' + $serverIP + ':/var/www/youcaisse/' -ForegroundColor White
Write-Host ""

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Configuration de l'application:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Creer les fichiers .env localement
$backendEnv = @"
PORT=3001
NODE_ENV=production
JWT_SECRET=$jwtSecret
DATABASE_URL=postgresql://youcaisse:VotreMotDePasse@localhost:5432/youcaisse
"@

$frontendEnv = "VITE_API_URL=http://${serverIP}:3001/api"

$backendEnvPath = "c:\Users\mrtih\Desktop\YOU CAISSE PRO\backend\.env.production"
$frontendEnvPath = "c:\Users\mrtih\Desktop\YOU CAISSE PRO\frontend\.env.production"

Set-Content -Path $backendEnvPath -Value $backendEnv
Set-Content -Path $frontendEnvPath -Value $frontendEnv

Write-Host "Fichiers de configuration crees:" -ForegroundColor Green
Write-Host "  - backend\.env.production" -ForegroundColor White
Write-Host "  - frontend\.env.production" -ForegroundColor White
Write-Host ""
Write-Host "Copiez ces fichiers vers .env sur le serveur apres l'upload" -ForegroundColor Yellow
Write-Host ""

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deploiement final sur le serveur:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Une fois le code uploade, executez sur le serveur:" -ForegroundColor Yellow
Write-Host ""
Write-Host "cd /var/www/youcaisse/backend" -ForegroundColor White
Write-Host "cp .env.production .env" -ForegroundColor White
Write-Host "npm install --production" -ForegroundColor White
Write-Host "npm run build" -ForegroundColor White
Write-Host ""
Write-Host "cd /var/www/youcaisse/frontend" -ForegroundColor White
Write-Host "cp .env.production .env" -ForegroundColor White
Write-Host "npm install" -ForegroundColor White
Write-Host "npm run build" -ForegroundColor White
Write-Host ""
Write-Host "# Demarrer le backend" -ForegroundColor Green
Write-Host "cd /var/www/youcaisse/backend" -ForegroundColor White
Write-Host "pm2 start dist/index.js --name youcaisse-backend" -ForegroundColor White
Write-Host "pm2 startup" -ForegroundColor White
Write-Host "pm2 save" -ForegroundColor White
Write-Host ""
Write-Host "# Configurer Nginx" -ForegroundColor Green
$nginxConfig = @'
cat > /etc/nginx/sites-available/youcaisse << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        root /var/www/youcaisse/frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
'@

Write-Host $nginxConfig -ForegroundColor White
Write-Host ""
Write-Host "ln -sf /etc/nginx/sites-available/youcaisse /etc/nginx/sites-enabled/" -ForegroundColor White
Write-Host "rm -f /etc/nginx/sites-enabled/default" -ForegroundColor White
Write-Host "nginx -t" -ForegroundColor White
Write-Host "systemctl reload nginx" -ForegroundColor White
Write-Host ""

Write-Host "======================================" -ForegroundColor Green
Write-Host "C'est tout!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Votre application sera accessible sur:" -ForegroundColor Yellow
Write-Host "  http://$serverIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Backend:" -ForegroundColor Yellow
Write-Host "  http://${serverIP}:3001/api" -ForegroundColor Cyan
Write-Host ""

$openGuide = Read-Host "Voulez-vous ouvrir le guide complet? (y/n)"
if ($openGuide -eq "y") {
    notepad "GUIDE_DEPLOIEMENT_CONTABO.md"
}

Write-Host ""
Write-Host "Bon deploiement!" -ForegroundColor Green
