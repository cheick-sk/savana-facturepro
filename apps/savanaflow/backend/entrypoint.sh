#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Backend Entrypoint Script
# Waits for database to be ready, then runs migrations and starts the server
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "🚀 Starting Backend Service..."

# Extract database host and port from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo "Database Host: $DB_HOST"
echo "Database Port: $DB_PORT"

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if nc -z $DB_HOST $DB_PORT 2>/dev/null; then
        echo "✅ Database is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Waiting... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Database is not ready after $max_attempts attempts"
    exit 1
fi

# Additional wait for PostgreSQL to fully initialize
echo "⏳ Waiting additional 5 seconds for PostgreSQL initialization..."
sleep 5

# Run migrations
echo "📦 Running database migrations..."
alembic upgrade head

# Run seeders
echo "🌱 Running database seeders..."
python -m app.seeders

# Start the server
echo "🌟 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
