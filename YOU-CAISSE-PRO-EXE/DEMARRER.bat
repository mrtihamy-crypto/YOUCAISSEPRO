@echo off
title YOU CAISSE PRO
color 0A
cls
echo.
echo ================================================
echo          YOU CAISSE PRO - LANCEMENT
echo ================================================
echo.

REM Tuer les processus existants
taskkill /F /IM YOU-CAISSE-Backend.exe 2>nul
taskkill /F /IM YOU-CAISSE-Frontend.exe 2>nul
timeout /t 2 /nobreak >nul

REM Demarrer le Backend
echo [1/3] Demarrage du Backend...
start "" "%~dp0YOU-CAISSE-Backend.exe"
timeout /t 4 /nobreak >nul

REM Demarrer le Frontend
echo [2/3] Demarrage du Frontend...
start "" "%~dp0YOU-CAISSE-Frontend.exe"
timeout /t 3 /nobreak >nul

REM Ouvrir dans le navigateur
echo [3/3] Ouverture de l'application...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo ================================================
echo      APPLICATION DEMARREE AVEC SUCCES !
echo ================================================
echo.
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo.
echo   Pour arreter: Lancez ARRETER.bat
echo.
pause
