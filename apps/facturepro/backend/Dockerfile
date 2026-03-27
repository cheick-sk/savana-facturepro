# ═══════════════════════════════════════════════════════════════════════════════
# FacturePro Backend Dockerfile - Production Ready
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY apps/facturepro/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared libraries
COPY shared /app/shared

# Copy the backend application
COPY apps/facturepro/backend /app/apps/facturepro/backend

# Set working directory to backend
WORKDIR /app/apps/facturepro/backend

# Set PYTHONPATH to include shared
ENV PYTHONPATH=/app

# Expose the application port
EXPOSE 8000

# Copy entrypoint script
COPY apps/facturepro/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Use entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
