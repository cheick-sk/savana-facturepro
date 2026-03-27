#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# COMPLETE RESET - Fix all issues and restart fresh
# This script removes old volumes and recreates everything from scratch
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "🔧 COMPLETE DATABASE RESET"
echo "═══════════════════════════════════════════════════════════════════════════════"

cd "$(dirname "$0")"

echo ""
echo "1️⃣  Stopping all containers..."
docker compose down --remove-orphans 2>/dev/null || true

echo ""
echo "2️⃣  Removing ALL volumes (this will delete all data)..."
echo "   This fixes the password mismatch issue"
docker volume prune -f 2>/dev/null || true

# Remove specific volumes
for vol in pg_facturepro pg_savanaflow redis_data facturepro_uploads savanaflow_uploads; do
    docker volume rm "infra_${vol}" 2>/dev/null || true
    docker volume rm "${vol}" 2>/dev/null || true
done

echo ""
echo "3️⃣  Cleaning orphaned containers and images..."
docker container prune -f 2>/dev/null || true
docker image prune -f 2>/dev/null || true

echo ""
echo "4️⃣  Building fresh images..."
docker compose build --no-cache

echo ""
echo "5️⃣  Starting databases first..."
docker compose up -d postgres_facturepro postgres_savanaflow redis

echo ""
echo "6️⃣  Waiting for PostgreSQL to be ready (60 seconds)..."
echo "   This ensures databases are fully initialized before backends start"
sleep 60

# Verify databases are ready
echo ""
echo "7️⃣  Verifying database connections..."
for i in {1..30}; do
    if docker compose exec -T postgres_facturepro pg_isready -U facturepro_user -d facturepro 2>/dev/null; then
        echo "   FacturePro DB: ✅ Ready"
        break
    fi
    echo "   Waiting for FacturePro DB... ($i/30)"
    sleep 2
done

for i in {1..30}; do
    if docker compose exec -T postgres_savanaflow pg_isready -U savanaflow_user -d savanaflow 2>/dev/null; then
        echo "   SavanaFlow DB: ✅ Ready"
        break
    fi
    echo "   Waiting for SavanaFlow DB... ($i/30)"
    sleep 2
done

echo ""
echo "8️⃣  Starting all services..."
docker compose up -d

echo ""
echo "9️⃣  Waiting for backends to start (30 seconds)..."
sleep 30

echo ""
echo "🔟 Final status check..."
docker compose ps

echo ""
echo "Testing backend health endpoints..."
sleep 5
echo "FacturePro: $(curl -s http://localhost:8001/health 2>/dev/null || echo 'NOT READY')"
echo "SavanaFlow: $(curl -s http://localhost:8002/health 2>/dev/null || echo 'NOT READY')"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "✅ RESET COMPLETE!"
echo ""
echo "📋 New credentials:"
echo "   FacturePro:  facturepro_user / facturepro_dev_password"
echo "   SavanaFlow:  savanaflow_user / savanaflow_dev_password"
echo ""
echo "🌐 Access URLs:"
echo "   FacturePro Frontend:  http://localhost:3001"
echo "   FacturePro Backend:   http://localhost:8001"
echo "   FacturePro Docs:      http://localhost:8001/docs"
echo "   SavanaFlow Frontend:  http://localhost:3002"
echo "   SavanaFlow Backend:   http://localhost:8002"
echo "   SavanaFlow Docs:      http://localhost:8002/docs"
echo "   Mailhog (emails):     http://localhost:8025"
echo ""
echo "👤 Admin Login Credentials:"
echo "   FacturePro:  admin@facturepro.africa / Admin1234!"
echo "   SavanaFlow:  admin@savanaflow.africa / Admin1234!"
echo ""
echo "📝 If backends are still not responding, check logs:"
echo "   docker compose logs -f facturepro_backend"
echo "   docker compose logs -f savanaflow_backend"
echo "═══════════════════════════════════════════════════════════════════════════════"
