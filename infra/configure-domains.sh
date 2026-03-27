#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN CONFIGURATION SCRIPT - FACTUREPRO AFRICA & SAVANAFLOW
# Usage: ./configure-domains.sh facturepro.yourdomain.com savanaflow.yourdomain.com
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FACTUREPRO AFRICA & SAVANAFLOW - Domain Configuration${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${YELLOW}Usage: $0 <facturepro-domain> <savanaflow-domain> [email]${NC}"
    echo ""
    echo "Example:"
    echo "  $0 facturepro.example.com savanaflow.example.com admin@example.com"
    echo ""
    echo "This script will:"
    echo "  1. Update nginx configuration with your domains"
    echo "  2. Update .env file with domain settings"
    echo "  3. Generate SSL certificates with Let's Encrypt"
    exit 1
fi

FACTUREPRO_DOMAIN=$1
SAVANAFLOW_DOMAIN=$2
SSL_EMAIL=${3:-admin@${FACTUREPRO_DOMAIN#*.}}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}Configuring domains:${NC}"
echo -e "  FacturePro: ${YELLOW}${FACTUREPRO_DOMAIN}${NC}"
echo -e "  SavanaFlow: ${YELLOW}${SAVANAFLOW_DOMAIN}${NC}"
echo -e "  SSL Email:  ${YELLOW}${SSL_EMAIL}${NC}"
echo ""

# Validate domains
echo -e "${BLUE}Validating domains...${NC}"
for domain in "$FACTUREPRO_DOMAIN" "$SAVANAFLOW_DOMAIN"; do
    if ! [[ "$domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$ ]]; then
        echo -e "${RED}Error: Invalid domain format: $domain${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ Domains validated${NC}"

# Update nginx configuration
echo -e "${BLUE}Updating nginx configuration...${NC}"
NGINX_CONF="$SCRIPT_DIR/nginx/nginx.conf"

# Replace placeholder domains in nginx.conf
sed -i "s/facturepro\.yourdomain\.africa/${FACTUREPRO_DOMAIN}/g" "$NGINX_CONF"
sed -i "s/savanaflow\.yourdomain\.africa/${SAVANAFLOW_DOMAIN}/g" "$NGINX_CONF"

# Update SSL certificate paths
sed -i "s|/etc/letsencrypt/live/facturepro\.yourdomain\.africa|/etc/letsencrypt/live/${FACTUREPRO_DOMAIN}|g" "$NGINX_CONF"
sed -i "s|/etc/letsencrypt/live/savanaflow\.yourdomain\.africa|/etc/letsencrypt/live/${SAVANAFLOW_DOMAIN}|g" "$NGINX_CONF"

echo -e "${GREEN}✓ Nginx configuration updated${NC}"

# Update .env file
echo -e "${BLUE}Updating environment configuration...${NC}"
ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"

if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo -e "${GREEN}✓ Created .env from .env.example${NC}"
fi

if [ -f "$ENV_FILE" ]; then
    # Update domain settings
    sed -i "s/^DOMAIN_AFRICA=.*/DOMAIN_AFRICA=${FACTUREPRO_DOMAIN#*.}/" "$ENV_FILE"
    sed -i "s/^FACTUREPRO_DOMAIN=.*/FACTUREPRO_DOMAIN=${FACTUREPRO_DOMAIN}/" "$ENV_FILE"
    sed -i "s/^SAVANAFLOW_DOMAIN=.*/SAVANAFLOW_DOMAIN=${SAVANAFLOW_DOMAIN}/" "$ENV_FILE"
    sed -i "s/^SSL_EMAIL=.*/SSL_EMAIL=${SSL_EMAIL}/" "$ENV_FILE"

    echo -e "${GREEN}✓ Environment file updated${NC}"
else
    echo -e "${YELLOW}⚠ No .env file found. Please create one from .env.example${NC}"
fi

# Update docker-compose environment variables
echo -e "${BLUE}Updating docker-compose configuration...${NC}"
sed -i "s/facturepro\.yourdomain\.africa/${FACTUREPRO_DOMAIN}/g" "$SCRIPT_DIR/docker-compose.yml"
sed -i "s/savanaflow\.yourdomain\.africa/${SAVANAFLOW_DOMAIN}/g" "$SCRIPT_DIR/docker-compose.yml"
echo -e "${GREEN}✓ Docker-compose updated${NC}"

# Generate secrets if not set
echo -e "${BLUE}Checking secrets...${NC}"
if grep -q "your-super-secret-key-change-this" "$ENV_FILE" 2>/dev/null; then
    echo -e "${YELLOW}Generating new secrets...${NC}"

    # Generate SECRET_KEY
    SECRET_KEY=$(openssl rand -hex 32)
    sed -i "s|^SECRET_KEY=.*|SECRET_KEY=${SECRET_KEY}|" "$ENV_FILE"

    # Generate JWT_SECRET_KEY
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s|^JWT_SECRET_KEY=.*|JWT_SECRET_KEY=${JWT_SECRET}|" "$ENV_FILE"

    # Generate ENCRYPTION_KEY
    ENCRYPTION_KEY=$(openssl rand -hex 16)
    sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${ENCRYPTION_KEY}|" "$ENV_FILE"

    # Generate passwords
    FP_PASSWORD=$(openssl rand -base64 24)
    sed -i "s|^POSTGRES_FP_PASSWORD=.*|POSTGRES_FP_PASSWORD=${FP_PASSWORD}|" "$ENV_FILE"

    SF_PASSWORD=$(openssl rand -base64 24)
    sed -i "s|^POSTGRES_SF_PASSWORD=.*|POSTGRES_SF_PASSWORD=${SF_PASSWORD}|" "$ENV_FILE"

    REDIS_PASSWORD=$(openssl rand -base64 24)
    sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASSWORD}|" "$ENV_FILE"

    echo -e "${GREEN}✓ Secrets generated and saved${NC}"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Configuration Complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Ensure your domains point to this server's IP address:"
echo "   - ${FACTUREPRO_DOMAIN}"
echo "   - ${SAVANAFLOW_DOMAIN}"
echo ""
echo "2. Get SSL certificates:"
echo "   cd $SCRIPT_DIR"
echo "   docker-compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d ${FACTUREPRO_DOMAIN}"
echo "   docker-compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d ${SAVANAFLOW_DOMAIN}"
echo ""
echo "3. Start the services:"
echo "   cd $SCRIPT_DIR"
echo "   docker-compose up -d"
echo ""
echo "4. Check logs:"
echo "   docker-compose logs -f"
echo ""
