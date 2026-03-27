#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# COMPLETE STARTUP SCRIPT - FacturePro Africa & SavanaFlow
# This script handles the complete startup sequence with proper waiting
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "🚀 FACTUREPRO AFRICA & SAVANAFLOW - COMPLETE STARTUP"
echo "═══════════════════════════════════════════════════════════════════════════════"

cd "$(dirname "$0")"

# ───────────────────────────────────────────────────────────────────────────────
# STEP 1: Stop existing containers
# ───────────────────────────────────────────────────────────────────────────────
echo ""
echo "1️⃣  Stopping existing containers..."
docker compose down --remove-orphans 2>/dev/null || true

# ───────────────────────────────────────────────────────────────────────────────
# STEP 2: Start infrastructure (databases + redis)
# ───────────────────────────────────────────────────────────────────────────────
echo ""
echo "2️⃣  Starting infrastructure (PostgreSQL + Redis)..."
docker compose up -d postgres_facturepro postgres_savanaflow redis mailhog

echo "   ⏳ Waiting 30 seconds for databases to initialize..."
sleep 30

# ───────────────────────────────────────────────────────────────────────────────
# STEP 3: Verify databases are ready
# ───────────────────────────────────────────────────────────────────────────────
echo ""
echo "3️⃣  Verifying database connections..."

# Check FacturePro database
for i in {1..20}; do
    if docker compose exec -T postgres_facturepro pg_isready -U facturepro_user -d facturepro 2>/dev/null; then
        echo "   ✅ FacturePro DB is ready"
        break
    fi
    echo "   Waiting for FacturePro DB... ($i/20)"
    sleep 2
done

# Check SavanaFlow database
for i in {1..20}; do
    if docker compose exec -T postgres_savanaflow pg_isready -U savanaflow_user -d savanaflow 2>/dev/null; then
        echo "   ✅ SavanaFlow DB is ready"
        break
    fi
    echo "   Waiting for SavanaFlow DB... ($i/20)"
    sleep 2
done

# Check Redis
for i in {1..10}; do
    if docker compose exec -T redis redis-cli -a redis_dev_password ping 2>/dev/null | grep -q PONG; then
        echo "   ✅ Redis is ready"
        break
    fi
    echo "   Waiting for Redis... ($i/10)"
    sleep 2
done

# ───────────────────────────────────────────────────────────────────────────────
# STEP 4: Build and start backends
# ───────────────────────────────────────────────────────────────────────────────
echo ""
echo "4️⃣  Building and starting backends..."
docker compose build facturepro_backend savanaflow_backend
docker compose up -d facturepro_backend savanaflow_backend

echo "   ⏳ Waiting 30 seconds for backends to initialize..."
sleep 30

# ───────────────────────────────────────────────────────────────────────────────
# STEP 5: Build and start frontends
# ───────────────────────────────────────────────────────────────────────────────
echo ""
echo "5️⃣  Building and starting frontends..."
docker compose build facturepro_frontend savanaflow_frontend
docker compose up -d facturepro_frontend savanaflow_frontend

echo "   ⏳ Waiting 10 seconds for frontends to start..."
sleep 10

# ───────────────────────────────────────────────────────────────────────────────
# STEP 6: Start workers and nginx
# ───────────────────────────────────────────────────────────────────────────────
echo ""
echo "6️⃣  Starting workers and nginx..."
docker compose up -d facturepro_worker facturepro_beat savanaflow_worker savanaflow_beat nginx

echo "   ⏳ Waiting 10 seconds..."
sleep 10

# ───────────────────────────────────────────────────────────────────────────────
# STEP 7: Final status check
# ───────────────────────────────────────────────────────────────────────────────
echo ""
echo "7️⃣  Final Status Check..."
echo "─────────────────────────────────────────"
docker compose ps

echo ""
echo "8️⃣  Health Check..."
echo "─────────────────────────────────────────"

# Check FacturePro backend
FP_HEALTH=$(curl -s http://localhost:8001/health 2>/dev/null || echo "NOT READY")
echo "   FacturePro Backend:  $FP_HEALTH"

# Check SavanaFlow backend
SF_HEALTH=$(curl -s http://localhost:8002/health 2>/dev/null || echo "NOT READY")
echo "   SavanaFlow Backend:  $SF_HEALTH"

# Check FacturePro frontend
FP_FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null || echo "000")
echo "   FacturePro Frontend: HTTP $FP_FRONTEND"

# Check SavanaFlow frontend
SF_FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null || echo "000")
echo "   SavanaFlow Frontend: HTTP $SF_FRONTEND"

# ───────────────────────────────────────────────────────────────────────────────
# Display access information
# ───────────────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "✅ STARTUP COMPLETE!"
echo ""
echo "🌐 Access URLs:"
echo "   FacturePro Frontend:  http://localhost:3001"
echo "   FacturePro Backend:   http://localhost:8001"
echo "   FacturePro API Docs:  http://localhost:8001/docs"
echo "   SavanaFlow Frontend:  http://localhost:3002"
echo "   SavanaFlow Backend:   http://localhost:8002"
echo "   SavanaFlow API Docs:  http://localhost:8002/docs"
echo "   Mailhog (emails):     http://localhost:8025"
echo ""
echo "👤 Admin Login Credentials:"
echo "   FacturePro:  admin@facturepro.africa / Admin1234!"
echo "   SavanaFlow:  admin@savanaflow.africa / Admin1234!"
echo ""
echo "📝 Troubleshooting:"
echo "   docker compose logs -f facturepro_backend"
echo "   docker compose logs -f savanaflow_backend"
echo "═══════════════════════════════════════════════════════════════════════════════"
