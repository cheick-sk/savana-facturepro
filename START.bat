@echo off
chcp 65001 >nul
title Démarrage Africa SaaS

echo ╔══════════════════════════════════════════════╗
echo ║         Démarrage Africa SaaS Monorepo        ║
echo ╚══════════════════════════════════════════════╝
echo.

REM Vérifier que Docker est lancé
docker info >nul 2>&1
if errorlevel 1 (
    echo [✗] Docker n'est pas lancé !
    echo     Ouvre Docker Desktop et réessaie.
    pause
    exit /b 1
)

echo [✓] Docker est disponible
echo.

REM Copier les .env si absents
for %%A in (facturepro schoolflow savanaflow) do (
    if not exist "apps\%%A\backend\.env" (
        copy "apps\%%A\backend\.env.example" "apps\%%A\backend\.env" >nul
        echo [✓] .env créé pour %%A
    )
)

echo.
echo [→] Démarrage des conteneurs...
cd infra
docker compose up -d
if errorlevel 1 (
    echo [✗] Erreur au démarrage. Vérifie que Docker Desktop est bien lancé.
    cd ..
    pause
    exit /b 1
)
cd ..

echo [✓] Conteneurs démarrés
echo.
echo [→] Attente que les bases de données soient prêtes (20 secondes)...
timeout /t 20 /nobreak >nul

echo.
echo [→] Lancement des migrations...
cd infra
docker compose exec facturepro_backend alembic upgrade head 2>nul
docker compose exec schoolflow_backend alembic upgrade head 2>nul
docker compose exec savanaflow_backend alembic upgrade head 2>nul
cd ..

echo.
echo ══════════════════════════════════════════════
echo   [✓] TOUT EST PRÊT !
echo ══════════════════════════════════════════════
echo.
echo   SavanaFlow POS   →  http://localhost:3003
echo   FacturePro       →  http://localhost:3001
echo   SchoolFlow       →  http://localhost:3002
echo   Mailhog (emails) →  http://localhost:8025
echo.
echo   API SavanaFlow   →  http://localhost:8003/docs
echo   API FacturePro   →  http://localhost:8001/docs
echo   API SchoolFlow   →  http://localhost:8002/docs
echo.
echo   Identifiants :
echo   admin@savanaflow.africa  /  Admin1234!
echo   admin@facturepro.africa  /  Admin1234!
echo   admin@schoolflow.africa  /  Admin1234!
echo.

set /p open="Ouvrir SavanaFlow dans le navigateur ? (o/n) : "
if /i "%open%"=="o" start http://localhost:3003

pause
