# ═══════════════════════════════════════════════════════════════════════════════
# SavanaFlow Frontend Dockerfile - Production Ready
# ═══════════════════════════════════════════════════════════════════════════════

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build argument for API URL
ARG VITE_API_URL=http://localhost:8002
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build 2>/dev/null || npx vite build --mode production

# Stage 2: Production
FROM nginx:1.25-alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
