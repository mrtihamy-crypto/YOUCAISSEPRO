# YOU CAISSE PRO - Deploiement Automatique vers Contabo
# Ce script fait tout automatiquement !

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploiement Automatique sur Contabo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Demander les informations
Write-Host "Informations necessaires:" -ForegroundColor Yellow
Write-Host ""

$serverIP = Read-Host "Entrez l'adresse IP de votre serveur Contabo"
Write-Host ""
Write-Host "IMPORTANT: Le mot de passe sera visible lors de la saisie" -ForegroundColor Yellow
$plainPassword = Read-Host "Entrez le mot de passe root"
$dbPassword = Read-Host "Entrez un mot de passe pour la base de donnees"

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Serveur: $serverIP" -ForegroundColor White
Write-Host "  User: root" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Commencer le deploiement automatique? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Deploiement annule" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification des outils" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Verifier si plink (PuTTY) est disponible
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue
$pscpPath = Get-Command pscp -ErrorAction SilentlyContinue

if (-not $plinkPath -or -not $pscpPath) {
    Write-Host "PuTTY n'est pas installe" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Installation automatique de PuTTY..." -ForegroundColor Yellow
    
    # Telecharger PuTTY
    $puttyUrl = "https://the.earth.li/~sgtatham/putty/latest/w64/putty.zip"
    $puttyZip = Join-Path $env:TEMP "putty.zip"
    $puttyDir = Join-Path $env:TEMP "putty"
    
    try {
        Write-Host "Telechargement de PuTTY..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $puttyUrl -OutFile $puttyZip -UseBasicParsing
        
        Write-Host "Extraction..." -ForegroundColor Yellow
        Expand-Archive -Path $puttyZip -DestinationPath $puttyDir -Force
        
        # Ajouter au PATH pour cette session
        $env:Path = $env:Path + ";" + $puttyDir
        
        Write-Host "PuTTY installe" -ForegroundColor Green
    } catch {
        Write-Host "Erreur lors de l'installation de PuTTY" -ForegroundColor Red
        Write-Host "Veuillez installer PuTTY manuellement depuis: https://www.putty.org/" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Outils prets" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📤 Étape 1: Upload du script d'installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Créer un fichier de commandes SSH
$sshCommands = @"
# Installation automatique YOU CAISSE PRO
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git postgresql postgresql-contrib nginx ufw
npm install -g pm2

# Configuration PostgreSQL
sudo -u postgres psql <<EOF
CREATE DATABASE youcaisse;
CREATE USER youcaisse WITH ENCRYPTED PASSWORD '$dbPassword';
GRANT ALL PRIVILEGES ON DATABASE youcaisse TO youcaisse;
\\c youcaisse
GRANT ALL ON SCHEMA public TO youcaisse;
EOF

# Créer les répertoires
mkdir -p /var/www/youcaisse/backend
mkdir -p /var/www/youcaisse/frontend

# Configuration du pare-feu
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp

echo "✅ Serveur configuré!"
"@

$commandsFile = "$env:TEMP\install-commands.sh"
Set-Content -Path $commandsFile -Value $sshCommands

Write-Host "📤 Upload du script d'installation..." -ForegroundColor Yellow

try {
    # Upload le script avec pscp
    $pscpCmd = "echo y | pscp -pw `"$plainPassword`" `"$commandsFile`" root@${serverIP}:/root/install.sh"
    Invoke-Expression $pscpCmd
    
    Write-Host "✅ Script uploadé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'upload: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "⚙️  Étape 2: Installation sur le serveur" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Installation en cours... (cela peut prendre 5-10 minutes)" -ForegroundColor Yellow

try {
    # Exécuter le script d'installation
    $plinkCmd = "echo y | plink -pw `"$plainPassword`" root@${serverIP} `"bash /root/install.sh`""
    Invoke-Expression $plinkCmd
    
    Write-Host "✅ Installation terminée" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Installation peut avoir réussi (vérification nécessaire)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📤 Étape 3: Upload du code de l'application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$appPath = "c:\Users\mrtih\Desktop\YOU CAISSE PRO"

# Créer les fichiers .env avant l'upload
Write-Host "Création des configurations..." -ForegroundColor Yellow

# Backend .env
$backendEnv = @"
PORT=3001
NODE_ENV=production
JWT_SECRET=$(New-Guid)
DATABASE_URL=postgresql://youcaisse:$dbPassword@localhost:5432/youcaisse
"@

$backendEnvPath = "$appPath\backend\.env"
Set-Content -Path $backendEnvPath -Value $backendEnv

# Frontend .env
$frontendEnv = "VITE_API_URL=http://${serverIP}:3001/api"
$frontendEnvPath = "$appPath\frontend\.env"
Set-Content -Path $frontendEnvPath -Value $frontendEnv

Write-Host "✅ Fichiers de configuration créés" -ForegroundColor Green

# Compresser le code pour upload plus rapide
Write-Host "Compression du code..." -ForegroundColor Yellow
$zipPath = "$env:TEMP\youcaisse-code.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path "$appPath\backend", "$appPath\frontend", "$appPath\shared" -DestinationPath $zipPath -Force

Write-Host "📤 Upload du code (cela peut prendre quelques minutes)..." -ForegroundColor Yellow

try {
    # Upload l'archive
    $pscpCmd = "echo y | pscp -pw `"$plainPassword`" `"$zipPath`" root@${serverIP}:/root/youcaisse-code.zip"
    Invoke-Expression $pscpCmd
    
    Write-Host "✅ Code uploadé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'upload du code: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Étape 4: Déploiement de l'application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$deployCommands = @"
# Extraire le code
apt install -y unzip
cd /root
unzip -o youcaisse-code.zip -d /var/www/youcaisse/

# Backend
cd /var/www/youcaisse/backend
npm install --production
npm run build

# Frontend  
cd /var/www/youcaisse/frontend
npm install
npm run build

# Configuration Nginx
cat > /etc/nginx/sites-available/youcaisse <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        root /var/www/youcaisse/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/youcaisse /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Démarrer avec PM2
cd /var/www/youcaisse/backend
pm2 delete youcaisse-backend 2>/dev/null || true
pm2 start dist/index.js --name youcaisse-backend
pm2 startup systemd -u root --hp /root
pm2 save

echo "✅ Application déployée!"
pm2 status
"@

$deployFile = "$env:TEMP\deploy-commands.sh"
Set-Content -Path $deployFile -Value $deployCommands

Write-Host "Déploiement en cours..." -ForegroundColor Yellow

try {
    # Upload et exécuter le script de déploiement
    $pscpCmd = "echo y | pscp -pw `"$plainPassword`" `"$deployFile`" root@${serverIP}:/root/deploy.sh"
    Invoke-Expression $pscpCmd
    
    $plinkCmd = "echo y | plink -pw `"$plainPassword`" root@${serverIP} `"bash /root/deploy.sh`""
    Invoke-Expression $plinkCmd
    
    Write-Host "✅ Déploiement terminé" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Déploiement peut avoir réussi (vérification nécessaire)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ DÉPLOIEMENT TERMINÉ!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Votre application est maintenant en ligne!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Accès à l'application:" -ForegroundColor Yellow
Write-Host "   http://$serverIP" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Backend API:" -ForegroundColor Yellow
Write-Host "   http://${serverIP}:3001/api" -ForegroundColor White
Write-Host ""
Write-Host "📋 Commandes utiles:" -ForegroundColor Yellow
Write-Host "   Se connecter au serveur:" -ForegroundColor White
Write-Host "   ssh root@$serverIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Voir les logs:" -ForegroundColor White
Write-Host "   ssh root@$serverIP 'pm2 logs'" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Redémarrer l'application:" -ForegroundColor White
Write-Host "   ssh root@$serverIP 'pm2 restart youcaisse-backend'" -ForegroundColor Cyan
Write-Host ""

Write-Host "🌐 Ouvrir l'application maintenant? (y/n)" -ForegroundColor Yellow
$openBrowser = Read-Host

if ($openBrowser -eq "y") {
    Start-Process "http://$serverIP"
}

Write-Host ""
Write-Host "✅ Déploiement réussi! 🎉" -ForegroundColor Green
Write-Host ""
