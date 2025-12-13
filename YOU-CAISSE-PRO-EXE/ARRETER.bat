@echo off
title Arreter YOU CAISSE PRO
color 0C
echo.
echo ================================================
echo        ARRET DE YOU CAISSE PRO
echo ================================================
echo.
taskkill /F /IM YOU-CAISSE-Backend.exe 2>nul
taskkill /F /IM YOU-CAISSE-Frontend.exe 2>nul
timeout /t 2 /nobreak >nul
echo.
echo   Application arretee avec succes !
echo.
pause
