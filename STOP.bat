@echo off
chcp 65001 >nul
echo [→] Arrêt des services...
cd infra
docker compose down
cd ..
echo [✓] Services arrêtés.
pause
