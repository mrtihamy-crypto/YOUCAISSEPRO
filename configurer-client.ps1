#!/usr/bin/env powershell

########################################
# YOU CAISSE PRO - Configuration Client
# Script pour configurer les appareils clients
########################################

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📱 Configuration Client YOU CAISSE PRO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Demander l'IP du serveur
$serverIP = Read-Host "Entrez l'adresse IP du serveur Contabo"

if ([string]::IsNullOrWhiteSpace($serverIP)) {
    Write-Host "❌ Erreur: L'adresse IP est obligatoire" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Configuration pour le serveur: $serverIP" -ForegroundColor Yellow
Write-Host ""

# Confirmation
$confirm = Read-Host "Continuer? (y/n)"
if ($confirm -ne "y") {
    Write-Host "❌ Configuration annulée" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "⚙️  Configuration du Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Modifier le fichier .env du frontend
$frontendEnvPath = "c:\Users\mrtih\Desktop\YOU CAISSE PRO\frontend\.env"

if (Test-Path $frontendEnvPath) {
    Write-Host "✅ Fichier .env trouvé" -ForegroundColor Green
    
    # Backup de l'ancien fichier
    $backupPath = "$frontendEnvPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $frontendEnvPath $backupPath
    Write-Host "💾 Backup créé: $backupPath" -ForegroundColor Yellow
    
    # Nouvelle configuration
    $newConfig = "VITE_API_URL=http://${serverIP}:3001/api"
    Set-Content -Path $frontendEnvPath -Value $newConfig
    
    Write-Host "✅ Configuration mise à jour" -ForegroundColor Green
    Write-Host "   API URL: http://${serverIP}:3001/api" -ForegroundColor White
} else {
    Write-Host "⚠️  Fichier .env non trouvé, création..." -ForegroundColor Yellow
    
    $newConfig = "VITE_API_URL=http://${serverIP}:3001/api"
    New-Item -Path $frontendEnvPath -ItemType File -Force | Out-Null
    Set-Content -Path $frontendEnvPath -Value $newConfig
    
    Write-Host "✅ Fichier .env créé" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 Test de connexion" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Test de connexion au serveur..." -ForegroundColor Yellow

try {
    $testUrl = "http://${serverIP}:3001/api"
    $response = Invoke-WebRequest -Uri $testUrl -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Serveur accessible!" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor White
} catch {
    Write-Host "⚠️  Serveur non accessible pour le moment" -ForegroundColor Yellow
    Write-Host "   Cela peut être normal si le serveur n'est pas encore démarré" -ForegroundColor White
    Write-Host "   URL testée: http://${serverIP}:3001/api" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Configuration terminée!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Prochaines étapes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Démarrer l'application:" -ForegroundColor Cyan
Write-Host "   .\DEMARRER-RAPIDE.ps1" -ForegroundColor White
Write-Host ""
Write-Host "2️⃣  Ouvrir dans le navigateur:" -ForegroundColor Cyan
Write-Host "   http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "3️⃣  L'application se connectera automatiquement à:" -ForegroundColor Cyan
Write-Host "   http://${serverIP}:3001/api" -ForegroundColor White
Write-Host ""
Write-Host "📱 Pour configurer d'autres appareils:" -ForegroundColor Yellow
Write-Host "   - Copiez ce dossier sur chaque appareil" -ForegroundColor White
Write-Host "   - Exécutez ce script sur chaque appareil" -ForegroundColor White
Write-Host "   - Tous les appareils partageront les mêmes données!" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Accès réseau direct:" -ForegroundColor Yellow
Write-Host "   http://${serverIP}" -ForegroundColor White
Write-Host "   (Une fois le serveur déployé avec Nginx)" -ForegroundColor White
Write-Host ""

Write-Host "✅ Configuration réussie! 🎉" -ForegroundColor Green
Write-Host ""
