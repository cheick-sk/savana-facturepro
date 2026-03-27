#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# LOCAL DEVELOPMENT SETUP SCRIPT
# Creates .env files for local development
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Setting up local development environment..."

# Create infra/.env
echo "📝 Creating infra/.env..."
cat > "$SCRIPT_DIR/.env" << 'EOF'
# ═══════════════════════════════════════════════════════════════════════════════
# ENVIRONMENT CONFIGURATION - LOCAL DEVELOPMENT
# ═══════════════════════════════════════════════════════════════════════════════

# SECURITY - LOCAL DEVELOPMENT
SECRET_KEY=dev-secret-key-for-local-testing-only-32chars!
JWT_SECRET_KEY=dev-jwt-secret-key-for-local-testing-32ch!
ENCRYPTION_KEY=dev-encryption-key-32-chars!

# DATABASE - FACTUREPRO
POSTGRES_FP_DB=facturepro
POSTGRES_FP_USER=facturepro_user
POSTGRES_FP_PASSWORD=facturepro_local_pass_2024

# DATABASE - SAVANAFLOW
POSTGRES_SF_DB=savanaflow
POSTGRES_SF_USER=savanaflow_user
POSTGRES_SF_PASSWORD=savanaflow_local_pass_2024

# REDIS
REDIS_PASSWORD=redis_local_pass_2024

# SMTP (Mailhog for local dev)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@localhost

# DOMAIN - LOCAL
DOMAIN_AFRICA=localhost
FACTUREPRO_DOMAIN=facturepro.localhost
SAVANAFLOW_DOMAIN=savanaflow.localhost

# ENVIRONMENT
ENVIRONMENT=development
DEBUG=true
IMAGE_TAG=latest

# RATE LIMITING
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# APP
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://facturepro.localhost,http://savanaflow.localhost
EOF

# Create backend .env files
echo "📝 Creating apps/facturepro/backend/.env..."
cat > "$PROJECT_ROOT/apps/facturepro/backend/.env" << 'EOF'
APP_NAME=FacturePro Africa
APP_ENV=development
SECRET_KEY=dev-secret-key-for-local-testing-only-32chars!
DATABASE_URL=postgresql+asyncpg://facturepro_user:facturepro_local_pass_2024@postgres_facturepro:5432/facturepro
REDIS_URL=redis://:redis_local_pass_2024@redis:6379/0
CELERY_BROKER=redis://:redis_local_pass_2024@redis:6379/0
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_FROM=noreply@localhost
ADMIN_EMAIL=admin@facturepro.local
ADMIN_PASSWORD=Admin1234!
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
LOG_LEVEL=DEBUG
ENVIRONMENT=development
EOF

echo "📝 Creating apps/savanaflow/backend/.env..."
cat > "$PROJECT_ROOT/apps/savanaflow/backend/.env" << 'EOF'
APP_NAME=SavanaFlow POS
APP_ENV=development
SECRET_KEY=dev-secret-key-for-local-testing-only-32chars!
DATABASE_URL=postgresql+asyncpg://savanaflow_user:savanaflow_local_pass_2024@postgres_savanaflow:5432/savanaflow
REDIS_URL=redis://:redis_local_pass_2024@redis:6379/1
CELERY_BROKER=redis://:redis_local_pass_2024@redis:6379/1
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_FROM=noreply@localhost
ADMIN_EMAIL=admin@savanaflow.local
ADMIN_PASSWORD=Admin1234!
CORS_ORIGINS=http://localhost:3002,http://savanaflow.localhost
LOG_LEVEL=DEBUG
ENVIRONMENT=development
EOF

echo ""
echo "✅ Local development environment configured!"
echo ""
echo "Next steps:"
echo "  cd infra"
echo "  docker compose up -d"
echo ""
