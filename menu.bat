@echo off
chcp 65001 >nul
title Africa SaaS Monorepo

:menu
cls
echo ╔══════════════════════════════════════════════╗
echo ║       Africa SaaS Monorepo — Windows         ║
echo ╚══════════════════════════════════════════════╝
echo.
echo  [1] Démarrer tous les services
echo  [2] Arrêter tous les services
echo  [3] Lancer les migrations
echo  [4] Voir les logs (tous)
echo  [5] Voir les logs SavanaFlow POS
echo  [6] Voir les logs FacturePro
echo  [7] Voir les logs SchoolFlow
echo  [8] Reconstruire les images Docker
echo  [9] Etat des conteneurs
echo  [10] Tout supprimer (volumes inclus)
echo  [0] Quitter
echo.
set /p choix="Choix : "

if "%choix%"=="1" goto up
if "%choix%"=="2" goto down
if "%choix%"=="3" goto migrate
if "%choix%"=="4" goto logs_all
if "%choix%"=="5" goto logs_savana
if "%choix%"=="6" goto logs_facture
if "%choix%"=="7" goto logs_school
if "%choix%"=="8" goto build
if "%choix%"=="9" goto ps
if "%choix%"=="10" goto clean
if "%choix%"=="0" exit
goto menu

:up
echo.
echo [→] Démarrage de tous les services...
cd infra
docker compose up -d
cd ..
echo.
echo [✓] Services démarrés !
echo.
echo     FacturePro  → http://localhost:3001
echo     SchoolFlow  → http://localhost:3002
echo     SavanaFlow  → http://localhost:3003
echo     Mailhog     → http://localhost:8025
echo     API docs    → http://localhost:8003/docs
echo.
pause
goto menu

:down
echo.
echo [→] Arrêt des services...
cd infra
docker compose down
cd ..
echo [✓] Services arrêtés.
pause
goto menu

:migrate
echo.
echo [→] Attente que PostgreSQL soit prêt (15 secondes)...
timeout /t 15 /nobreak >nul
echo [→] Migration FacturePro...
cd infra
docker compose exec facturepro_backend alembic upgrade head
echo [→] Migration SchoolFlow...
docker compose exec schoolflow_backend alembic upgrade head
echo [→] Migration SavanaFlow...
docker compose exec savanaflow_backend alembic upgrade head
cd ..
echo [✓] Migrations terminées !
pause
goto menu

:logs_all
cd infra
docker compose logs -f
cd ..
goto menu

:logs_savana
cd infra
docker compose logs -f savanaflow_backend savanaflow_frontend
cd ..
goto menu

:logs_facture
cd infra
docker compose logs -f facturepro_backend facturepro_frontend
cd ..
goto menu

:logs_school
cd infra
docker compose logs -f schoolflow_backend schoolflow_frontend
cd ..
goto menu

:build
echo.
echo [→] Reconstruction des images (peut prendre plusieurs minutes)...
cd infra
docker compose build
cd ..
echo [✓] Build terminé.
pause
goto menu

:ps
echo.
cd infra
docker compose ps
cd ..
pause
goto menu

:clean
echo.
echo [!] ATTENTION : Ceci supprime tous les conteneurs ET les données !
set /p confirm="Confirmer ? (oui/non) : "
if /i "%confirm%"=="oui" (
    cd infra
    docker compose down -v --remove-orphans
    cd ..
    echo [✓] Tout supprimé.
) else (
    echo [x] Annulé.
)
pause
goto menu
