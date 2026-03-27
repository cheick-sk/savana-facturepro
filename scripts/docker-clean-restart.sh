#!/bin/bash
# Script de nettoyage complet Docker
# Exécutez ce script pour supprimer tous les conteneurs et redémarrer proprement

set -e

echo "=== NETTOYAGE COMPLET DOCKER ==="

# 1. Arrêter tous les conteneurs du projet
echo "1. Arrêt des conteneurs docker-compose..."
cd /home/z/my-project/infra
docker compose down --remove-orphans 2>/dev/null || true

# 2. Supprimer tous les conteneurs liés au projet
echo "2. Suppression des conteneurs existants..."
docker rm -f postgres_facturepro postgres_savanaflow redis_africa 2>/dev/null || true
docker rm -f facturepro_backend facturepro_worker facturepro_beat facturepro_frontend 2>/dev/null || true
docker rm -f savanaflow_backend savanaflow_worker savanaflow_beat savanaflow_frontend 2>/dev/null || true
docker rm -f nginx_proxy mailhog certbot 2>/dev/null || true

# 3. Supprimer les réseaux orphelins
echo "3. Suppression des réseaux orphelins..."
docker network prune -f

# 4. Vérifier les ports utilisés
echo "4. Vérification des ports..."
echo "Ports 5432, 5433, 15432, 15433:"
docker ps -a --format "table {{.Names}}\t{{.Ports}}" | grep -E "5432|5433|15432|15433" || echo "Aucun conteneur n'utilise ces ports"

# 5. Tirer les derniers changements
echo "5. Mise à jour du code..."
cd /home/z/my-project
git pull

# 6. Recréer le fichier .env si nécessaire
echo "6. Vérification du fichier .env..."
if [ ! -f /home/z/my-project/infra/.env ]; then
    cat > /home/z/my-project/infra/.env << 'ENVEOF'
ENVIRONMENT=development
IMAGE_TAG=latest
SECRET_KEY=dev-secret-key-change-in-production
POSTGRES_FP_DB=facturepro
POSTGRES_FP_USER=facturepro_user
POSTGRES_FP_PASSWORD=facturepro_dev_password
POSTGRES_SF_DB=savanaflow
POSTGRES_SF_USER=savanaflow_user
POSTGRES_SF_PASSWORD=savanaflow_dev_password
REDIS_PASSWORD=redis_dev_password
FACTUREPRO_DOMAIN=facturepro.localhost
SAVANAFLOW_DOMAIN=savanaflow.localhost
SMTP_HOST=mailhog
SMTP_PORT=1025
ENVEOF
    echo "Fichier .env créé"
fi

# 7. Démarrer les services
echo "7. Démarrage des services..."
cd /home/z/my-project/infra
docker compose up -d --build

# 8. Afficher le statut
echo ""
echo "=== STATUT DES CONTENEURS ==="
docker compose ps

echo ""
echo "=== LOGS BACKEND FACTUREPRO ==="
docker compose logs facturepro_backend --tail=30

echo ""
echo "=== TERMINÉ ==="
echo "Les services devraient être accessibles sur:"
echo "  - FacturePro Frontend: http://localhost:3001"
echo "  - FacturePro Backend:  http://localhost:8001"
echo "  - SavanaFlow Frontend: http://localhost:3002"
echo "  - SavanaFlow Backend:  http://localhost:8002"
echo "  - Mailhog Web:         http://localhost:8025"
