#!/bin/bash
# Script to reset Docker database and restart containers
# This is useful when migrations are in an inconsistent state

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$PROJECT_ROOT/infra"

echo "=== Resetting Docker Database ==="
echo "This will:"
echo "  1. Stop all containers"
echo "  2. Remove database volumes (DATA WILL BE LOST)"
echo "  3. Rebuild and restart containers"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

cd "$INFRA_DIR"

echo "Stopping containers and removing volumes..."
docker compose down -v

echo "Rebuilding and starting containers..."
docker compose up -d --build

echo ""
echo "=== Waiting for services to be healthy ==="
sleep 10

# Check container status
docker compose ps

echo ""
echo "=== Checking backend logs ==="
docker compose logs backend --tail=50

echo ""
echo "=== Done ==="
echo "If migrations ran successfully, your application should be running."
