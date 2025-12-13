# Script de backup automatique quotidien
# YOU CAISSE PRO - Daily Auto Backup

Write-Host "⏰ Configuration du backup automatique quotidien" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

$scriptPath = "c:\Users\mrtih\Desktop\YOU CAISSE PRO\backend\backup-database.ps1"
$taskName = "YOU_CAISSE_PRO_Daily_Backup"

# Vérifier si la tâche existe déjà
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  La tâche planifiée existe déjà" -ForegroundColor Yellow
    Write-Host "❓ Voulez-vous la remplacer? (O/N): " -NoNewline -ForegroundColor Cyan
    $response = Read-Host
    
    if ($response -ne "O" -and $response -ne "o") {
        Write-Host "❌ Configuration annulée" -ForegroundColor Red
        exit
    }
    
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "🗑️  Ancienne tâche supprimée" -ForegroundColor Yellow
}

# Créer une action pour exécuter le script
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""

# Créer un déclencheur pour exécution quotidienne à 2h du matin
$trigger = New-ScheduledTaskTrigger -Daily -At "02:00"

# Créer un déclencheur supplémentaire au démarrage du système
$triggerStartup = New-ScheduledTaskTrigger -AtStartup

# Paramètres de la tâche
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Enregistrer la tâche planifiée
try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger,$triggerStartup -Principal $principal -Settings $settings -Description "Backup automatique quotidien de la base de données YOU CAISSE PRO" -ErrorAction Stop
    
    Write-Host "`n✅ Backup automatique configuré avec succès!" -ForegroundColor Green
    Write-Host "⏰ Le backup s'exécutera:" -ForegroundColor Cyan
    Write-Host "   - Tous les jours à 2h00 du matin" -ForegroundColor White
    Write-Host "   - À chaque démarrage du système" -ForegroundColor White
    Write-Host "`n📁 Les backups seront stockés dans:" -ForegroundColor Cyan
    Write-Host "   c:\Users\mrtih\Desktop\YOU CAISSE PRO\backups" -ForegroundColor White
    Write-Host "`n💡 Pour désactiver le backup automatique, exécutez:" -ForegroundColor Yellow
    Write-Host "   Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false" -ForegroundColor Gray
} catch {
    Write-Host "`n❌ Erreur lors de la création de la tâche planifiée" -ForegroundColor Red
    Write-Host "   Assurez-vous d'exécuter PowerShell en tant qu'administrateur" -ForegroundColor Yellow
    Write-Host "   Erreur: $_" -ForegroundColor Red
}
