# Script de backup automatique de la base de données
# YOU CAISSE PRO - Backup Database

$backupFolder = "c:\Users\mrtih\Desktop\YOU CAISSE PRO\backups"
$dbPath = "c:\Users\mrtih\Desktop\YOU CAISSE PRO\backend\database.sqlite"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "database_backup_$timestamp.sqlite"

# Créer le dossier de backup s'il n'existe pas
if (!(Test-Path $backupFolder)) {
    New-Item -ItemType Directory -Path $backupFolder | Out-Null
    Write-Host "✅ Dossier de backup créé: $backupFolder" -ForegroundColor Green
}

# Copier la base de données
if (Test-Path $dbPath) {
    Copy-Item $dbPath -Destination "$backupFolder\$backupName"
    Write-Host "✅ Backup créé avec succès: $backupName" -ForegroundColor Green
    
    # Afficher la taille du fichier
    $fileSize = (Get-Item "$backupFolder\$backupName").Length / 1KB
    Write-Host "📦 Taille: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Cyan
    
    # Supprimer les backups de plus de 30 jours
    Get-ChildItem $backupFolder -Filter "database_backup_*.sqlite" | 
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
        Remove-Item -Force
    
    Write-Host "🗑️  Anciens backups supprimés (>30 jours)" -ForegroundColor Yellow
    
    # Afficher le nombre de backups
    $backupCount = (Get-ChildItem $backupFolder -Filter "database_backup_*.sqlite").Count
    Write-Host "📊 Nombre total de backups: $backupCount" -ForegroundColor Cyan
} else {
    Write-Host "❌ Erreur: Base de données introuvable!" -ForegroundColor Red
}
