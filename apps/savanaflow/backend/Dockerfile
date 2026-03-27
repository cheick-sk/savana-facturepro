FROM python:3.11-slim

WORKDIR /app

# System deps for reportlab/asyncpg + netcat for db wait
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY apps/savanaflow/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared libraries
COPY shared /app/shared

# Copy the backend application
COPY apps/savanaflow/backend /app/apps/savanaflow/backend

# Set working directory to backend
WORKDIR /app/apps/savanaflow/backend

# Set PYTHONPATH to include shared
ENV PYTHONPATH=/app

# Expose the application port
EXPOSE 8000

# Copy and set up entrypoint script
COPY apps/savanaflow/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Use entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
