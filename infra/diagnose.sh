#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# DIAGNOSTIC SCRIPT - Check Docker containers and fix common issues
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "🔍 DIAGNOSTIC DOCKER - FacturePro Africa & SavanaFlow"
echo "═══════════════════════════════════════════════════════════════════════════════"

cd "$(dirname "$0")"

echo ""
echo "1️⃣  Container Status:"
echo "─────────────────────────────────────────"
docker compose ps

echo ""
echo "2️⃣  Checking backend health..."
echo "─────────────────────────────────────────"

# Check FacturePro backend
echo "FacturePro Backend (port 8001):"
curl -s http://localhost:8001/health 2>/dev/null && echo " ✅ OK" || echo " ❌ NOT RESPONDING"

# Check SavanaFlow backend
echo "SavanaFlow Backend (port 8002):"
curl -s http://localhost:8002/health 2>/dev/null && echo " ✅ OK" || echo " ❌ NOT RESPONDING"

echo ""
echo "3️⃣  PostgreSQL Status:"
echo "─────────────────────────────────────────"
docker compose exec -T postgres_facturepro pg_isready -U facturepro_user -d facturepro 2>/dev/null && echo "FacturePro DB: ✅ OK" || echo "FacturePro DB: ❌ NOT READY"
docker compose exec -T postgres_savanaflow pg_isready -U savanaflow_user -d savanaflow 2>/dev/null && echo "SavanaFlow DB: ✅ OK" || echo "SavanaFlow DB: ❌ NOT READY"

echo ""
echo "4️⃣  Redis Status:"
echo "─────────────────────────────────────────"
docker compose exec -T redis redis-cli -a redis_dev_password ping 2>/dev/null | grep -q PONG && echo "Redis: ✅ OK" || echo "Redis: ❌ NOT READY"

echo ""
echo "5️⃣  Recent Backend Logs (last 30 lines):"
echo "─────────────────────────────────────────"
echo "=== FACTUREPRO BACKEND ==="
docker compose logs --tail=30 facturepro_backend 2>/dev/null || echo "Cannot get logs"

echo ""
echo "=== SAVANAFLOW BACKEND ==="
docker compose logs --tail=30 savanaflow_backend 2>/dev/null || echo "Cannot get logs"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "📋 TROUBLESHOOTING:"
echo ""
echo "If backends are not responding:"
echo "  1. Check if migrations failed: docker compose logs facturepro_backend"
echo "  2. Restart containers: docker compose restart facturepro_backend savanaflow_backend"
echo "  3. Full reset: ./reset-database-fix.sh"
echo ""
echo "If databases are not ready:"
echo "  1. Wait 30 seconds for PostgreSQL to initialize"
echo "  2. Check logs: docker compose logs postgres_facturepro"
echo "═══════════════════════════════════════════════════════════════════════════════"
