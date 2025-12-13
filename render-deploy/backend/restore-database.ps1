# Script de restauration de la base de données
# YOU CAISSE PRO - Restore Database

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupFile
)

$backupFolder = "c:\Users\mrtih\Desktop\YOU CAISSE PRO\backups"
$dbPath = "c:\Users\mrtih\Desktop\YOU CAISSE PRO\backend\database.sqlite"

Write-Host "🔄 YOU CAISSE PRO - Restauration de la base de données" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

if (!$BackupFile) {
    # Afficher la liste des backups disponibles
    Write-Host "`n📋 Backups disponibles:" -ForegroundColor Yellow
    $backups = Get-ChildItem $backupFolder -Filter "database_backup_*.sqlite" | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Host "❌ Aucun backup trouvé!" -ForegroundColor Red
        exit
    }
    
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $backup = $backups[$i]
        $size = [math]::Round($backup.Length / 1KB, 2)
        Write-Host "  [$($i+1)] $($backup.Name) - $size KB - $($backup.LastWriteTime)" -ForegroundColor White
    }
    
    Write-Host "`n❓ Entrez le numéro du backup à restaurer (ou 0 pour annuler): " -NoNewline -ForegroundColor Cyan
    $choice = Read-Host
    
    if ($choice -eq "0" -or $choice -eq "") {
        Write-Host "❌ Restauration annulée" -ForegroundColor Red
        exit
    }
    
    $index = [int]$choice - 1
    if ($index -lt 0 -or $index -ge $backups.Count) {
        Write-Host "❌ Choix invalide!" -ForegroundColor Red
        exit
    }
    
    $BackupFile = $backups[$index].FullName
}

# Vérifier que le fichier de backup existe
if (!(Test-Path $BackupFile)) {
    Write-Host "❌ Fichier de backup introuvable: $BackupFile" -ForegroundColor Red
    exit
}

# Créer une sauvegarde de sécurité avant restauration
if (Test-Path $dbPath) {
    $securityBackup = "$backupFolder\database_before_restore_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').sqlite"
    Copy-Item $dbPath -Destination $securityBackup
    Write-Host "✅ Backup de sécurité créé: $securityBackup" -ForegroundColor Green
}

# Restaurer le backup
Copy-Item $BackupFile -Destination $dbPath -Force
Write-Host "✅ Base de données restaurée avec succès!" -ForegroundColor Green
Write-Host "📁 Fichier: $BackupFile" -ForegroundColor Cyan
Write-Host "`n⚠️  N'oubliez pas de redémarrer le serveur backend!" -ForegroundColor Yellow
