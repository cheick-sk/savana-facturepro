"""FacturePro Africa — main FastAPI application.

Production-ready SaaS invoicing platform for Africa with:
- Multi-tenant architecture
- Public API with API keys
- Webhook notifications
- Rate limiting
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse, Response

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import engine
from app.core.metrics import (
    PrometheusMiddleware,
    metrics_endpoint,
    set_app_info,
)
from app.core.monitoring import init_sentry
from app.models import *  # noqa: F401,F403 — ensure models registered

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [facturepro] %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize Sentry for error tracking (if configured)
init_sentry()


def custom_openapi():
    """Generate enhanced OpenAPI schema with API key authentication."""
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="FacturePro Africa API",
        version="2.0.0",
        description="""
## FacturePro Africa - API Publique

Bienvenue sur l'API FacturePro Africa, la solution de facturation professionnelle pour l'Afrique.

### 🌍 Couverture Africaine

Notre API supporte les moyens de paiement locaux dans plus de 30 pays africains :
- **Mobile Money**: Orange Money, MTN Mobile Money, M-Pesa, Wave, Moov Money
- **Cartes bancaires**: Visa, Mastercard
- **Virements bancaires**: Intégration banques locales

### 🔐 Authentification

L'API utilise deux méthodes d'authentification :

1. **Bearer Token** - Pour les utilisateurs connectés via l'interface web
   ```
   Authorization: Bearer <jwt_token>
   ```

2. **API Key** - Pour les intégrations tierces (header `X-API-Key`)
   ```
   X-API-Key: fp_your_api_key_here
   ```

### 📊 Rate Limiting

Les limites de requêtes dépendent de votre plan d'abonnement :

| Plan | Requêtes/heure |
|------|----------------|
| Starter | 1,000 |
| Pro | 5,000 |
| Business | 20,000 |
| Enterprise | Illimité |

Les headers de réponse incluent :
- `X-RateLimit-Limit`: Limite totale
- `X-RateLimit-Remaining`: Requêtes restantes
- `X-RateLimit-Reset`: Timestamp de réinitialisation

### 🔔 Webhooks

Configurez des webhooks pour recevoir des notifications en temps réel :

Événements disponibles :
- `invoice.created` - Nouvelle facture créée
- `invoice.sent` - Facture envoyée au client
- `invoice.paid` - Facture entièrement payée
- `invoice.overdue` - Facture en retard
- `payment.received` - Paiement reçu
- `customer.created` - Nouveau client créé

### 📝 Scopes d'API

Les API keys peuvent être limitées à des scopes spécifiques :

| Scope | Description |
|-------|-------------|
| `read:invoices` | Lire les factures |
| `write:invoices` | Créer/modifier les factures |
| `read:customers` | Lire les clients |
| `write:customers` | Créer/modifier les clients |
| `read:products` | Lire les produits |
| `write:products` | Créer/modifier les produits |
| `read:payments` | Lire les paiements |
| `write:payments` | Enregistrer des paiements |
| `*` | Accès complet |

### 🛠️ SDKs Disponibles

- **Python**: `pip install facturepro-africa`
- **JavaScript/Node.js**: `npm install @facturepro/africa-sdk`

### 📚 Resources

- **Documentation complète**: https://docs.saasafrica.com
- **Support technique**: support@saasafrica.com
- **Status API**: https://status.saasafrica.com
- **GitHub**: https://github.com/saasafrica/facturepro-sdk

### 🌐 Environnements

- **Production**: `https://api.saasafrica.com`
- **Sandbox**: `https://sandbox-api.saasafrica.com`
        """,
        routes=app.routes,
    )
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT token from login endpoint",
        },
        "apiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "API key for third-party integrations (prefix: fp_)",
        }
    }
    
    # Add servers
    openapi_schema["servers"] = [
        {
            "url": "https://api.saasafrica.com",
            "description": "Production server",
        },
        {
            "url": "https://sandbox-api.saasafrica.com",
            "description": "Sandbox server for testing",
        },
        {
            "url": "http://localhost:8000",
            "description": "Local development server",
        },
    ]
    
    # Add contact info
    openapi_schema["info"]["contact"] = {
        "name": "FacturePro Africa Support",
        "email": "support@saasafrica.com",
        "url": "https://saasafrica.com/support",
    }
    
    # Add license
    openapi_schema["info"]["license"] = {
        "name": "Apache 2.0",
        "url": "https://www.apache.org/licenses/LICENSE-2.0",
    }
    
    # Add tags with descriptions
    openapi_schema["tags"] = [
        {"name": "Auth", "description": "Authentication endpoints"},
        {"name": "Users", "description": "User management"},
        {"name": "Customers", "description": "Customer management"},
        {"name": "Products", "description": "Product catalog"},
        {"name": "Invoices", "description": "Invoice management"},
        {"name": "Quotes", "description": "Quote/Devis management"},
        {"name": "Payments", "description": "Payment processing"},
        {"name": "Expenses", "description": "Expense tracking"},
        {"name": "Reports", "description": "Reports and analytics"},
        {"name": "Public API", "description": "Public API for third-party integrations"},
        {"name": "API Keys", "description": "API key management"},
        {"name": "Webhooks", "description": "Webhook configuration"},
        {"name": "Accounting", "description": "Accounting (OHADA compliant)"},
        {"name": "Health", "description": "Health check endpoints"},
        {"name": "Monitoring", "description": "Prometheus metrics"},
    ]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app = FastAPI(
    title="FacturePro Africa API",
    description="Facturation professionnelle pour l'Afrique",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Apply custom OpenAPI schema
app.openapi = custom_openapi

# Set application info for Prometheus metrics
set_app_info(
    version="2.0.0",
    environment=settings.APP_ENV,
)

# ─── Prometheus Metrics Middleware ───
# Must be added before other middleware for accurate timing
app.add_middleware(PrometheusMiddleware)

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ───
app.include_router(api_router)


# ─── Health ───
@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint.
    
    Returns basic application status.
    """
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "version": "2.0.0",
    }


@app.get("/health/ready", tags=["Health"])
async def health_ready():
    """Readiness check endpoint.
    
    Returns detailed health status including database connectivity.
    """
    from sqlalchemy import text
    
    health_status = {
        "status": "ok",
        "checks": {},
    }
    
    # Check database
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Redis (if configured)
    try:
        import redis.asyncio as redis
        redis_client = redis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        await redis_client.close()
        health_status["checks"]["redis"] = "healthy"
    except Exception as e:
        health_status["checks"]["redis"] = f"unhealthy: {str(e)}"
        # Redis not critical for basic operation
        if health_status["status"] == "ok":
            health_status["status"] = "degraded"
    
    return health_status


# ─── Prometheus Metrics ───
@app.get("/metrics", tags=["Monitoring"])
async def metrics():
    """Prometheus metrics endpoint.
    
    Exposes application metrics for Prometheus to scrape.
    Includes business metrics, system metrics, and subscription metrics.
    """
    return metrics_endpoint()


# ─── Exception handlers ───
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": "internal_error",
            "request_id": request.headers.get("X-Request-ID", "unknown"),
        }
    )


# ─── Startup: create admin if missing ───
@app.on_event("startup")
async def create_initial_admin():
    """Create initial admin user if it doesn't exist."""
    from passlib.context import CryptContext
    from sqlalchemy import select
    from app.core.database import AsyncSessionFactory
    from app.models.all_models import User

    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    async with AsyncSessionFactory() as db:
        result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        if not result.scalar_one_or_none():
            admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=pwd_ctx.hash(settings.ADMIN_PASSWORD),
                first_name=settings.ADMIN_FIRST_NAME,
                last_name=settings.ADMIN_LAST_NAME,
                role="admin",
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            logger.info(f"Created initial admin: {settings.ADMIN_EMAIL}")
