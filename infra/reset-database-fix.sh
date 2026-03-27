#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# RESET DATABASE - Fix Password Authentication Error
# This script removes old PostgreSQL volumes and recreates databases with correct credentials
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "🔧 FIXING POSTGRESQL PASSWORD AUTHENTICATION ERROR"
echo "═══════════════════════════════════════════════════════════════════════════════"

cd "$(dirname "$0")"

echo ""
echo "1️⃣  Stopping all containers..."
docker compose down --remove-orphans 2>/dev/null || true

echo ""
echo "2️⃣  Removing old PostgreSQL volumes (this fixes the password mismatch)..."
docker volume rm infra_pg_facturepro 2>/dev/null || true
docker volume rm infra_pg_savanaflow 2>/dev/null || true
docker volume rm infra_redis_data 2>/dev/null || true

# Also try removing by full name pattern
docker volume ls -q | grep -E "(pg_facturepro|pg_savanaflow|redis_data)" | xargs -r docker volume rm 2>/dev/null || true

echo ""
echo "3️⃣  Cleaning up any orphaned containers..."
docker container prune -f 2>/dev/null || true

echo ""
echo "4️⃣  Rebuilding and starting containers with fresh databases..."
docker compose up -d --build

echo ""
echo "5️⃣  Waiting for PostgreSQL to be ready (30 seconds)..."
sleep 30

echo ""
echo "6️⃣  Checking container status..."
docker compose ps

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "✅ DATABASE RESET COMPLETE!"
echo ""
echo "📋 New credentials:"
echo "   FacturePro:  facturepro_user / facturepro_dev_password"
echo "   SavanaFlow:  savanaflow_user / savanaflow_dev_password"
echo ""
echo "🌐 Access URLs:"
echo "   FacturePro Frontend:  http://localhost:3001"
echo "   FacturePro Backend:   http://localhost:8001"
echo "   SavanaFlow Frontend:  http://localhost:3002"
echo "   SavanaFlow Backend:   http://localhost:8002"
echo ""
echo "👤 Admin Login Credentials:"
echo "   FacturePro:  admin@facturepro.africa / Admin1234!"
echo "   SavanaFlow:  admin@savanaflow.africa / Admin1234!"
echo "═══════════════════════════════════════════════════════════════════════════════"
