# Architecture du monorepo

## Vue d'ensemble

```
                        ┌─────────────────────┐
                        │   Nginx (port 80)    │
                        │   Reverse proxy      │
                        └──────────┬──────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
   facturepro.localhost    schoolflow.localhost    savanaflow.localhost
          │                        │                        │
   ┌──────▼──────┐         ┌───────▼──────┐        ┌───────▼──────┐
   │  Frontend   │         │  Frontend    │         │  Frontend    │
   │  React/Vite │         │  React/Vite  │         │  React/Vite  │
   │  port 3001  │         │  port 3002   │         │  port 3003   │
   └──────┬──────┘         └──────┬───────┘         └───────┬──────┘
          │ /api/v1               │ /api/v1                  │ /api/v1
   ┌──────▼──────┐         ┌──────▼───────┐         ┌───────▼──────┐
   │   FastAPI   │         │   FastAPI    │         │   FastAPI    │
   │  port 8001  │         │  port 8002   │         │  port 8003   │
   └──────┬──────┘         └──────┬───────┘         └───────┬──────┘
          │                       │                          │
   ┌──────▼──────┐         ┌──────▼───────┐         ┌───────▼──────┐
   │ PostgreSQL  │         │ PostgreSQL   │         │  PostgreSQL  │
   │  port 5432  │         │  port 5433   │         │  port 5434   │
   └─────────────┘         └──────────────┘         └──────────────┘
                                          │
                                   ┌──────▼──────┐
                                   │   Mailhog   │
                                   │ SMTP :1025  │
                                   │  UI :8025   │
                                   └─────────────┘
```

## Backend — FastAPI

Chaque backend suit la même architecture en couches :

```
app/
├── main.py              # App FastAPI + CORS + startup
├── core/
│   ├── config.py        # Settings (pydantic-settings, .env)
│   ├── database.py      # AsyncEngine + SessionFactory
│   └── security.py      # get_current_user + require_roles
├── models/
│   └── all_models.py    # SQLAlchemy ORM models
├── schemas/
│   └── schemas.py       # Pydantic v2 schemas (Request/Response)
├── services/
│   ├── pdf_service.py   # ReportLab PDF generation
│   └── email_service.py # aiosmtplib email sending
└── api/v1/
    ├── router.py        # APIRouter aggregator
    └── endpoints/       # Route handlers
```

### Auth flow

1. `POST /api/v1/auth/login` → retourne `access_token` (15min) + `refresh_token` (7 jours)
2. Toutes les routes protégées : `Authorization: Bearer <access_token>`
3. `POST /api/v1/auth/refresh` → nouveau access_token depuis refresh_token
4. RBAC : `admin > manager > user` — les rôles supérieurs héritent des inférieurs

### Pagination

Tous les endpoints de liste retournent :
```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "size": 20,
  "pages": 3
}
```

## Frontend — React + Vite

```
src/
├── lib/api.ts           # Axios + JWT interceptor + refresh auto
├── store/
│   ├── auth.ts          # Zustand auth store
│   └── cart.ts          # (SavanaFlow) Cart store
├── components/
│   └── layout/Layout.tsx  # Sidebar nav + outlet
└── pages/
    ├── auth/            # LoginPage
    ├── dashboard/       # Stats + quick actions
    └── {feature}/       # Pages métier
```

### State management

- **Zustand** pour l'état global (auth, panier POS)
- **useState/useEffect** pour l'état local des pages
- **react-hot-toast** pour les notifications

## Modèles de données

### FacturePro
`User → Customer ← Invoice → InvoiceItem → Product`
`Invoice → Payment`

### SchoolFlow
`User, Term, Class, Subject, Teacher`
`Parent → Student → Class`
`Student + Subject + Term → Grade`
`Student → FeeInvoice → FeePayment`

### SavanaFlow POS
`User, Store`
`Store → Product`
`Product → StockMovement`
`Store + User → Sale → SaleItem → Product`

## Sécurité

- Mots de passe hashés avec bcrypt (passlib)
- JWT HS256 avec expiration
- CORS configuré (tous origines en dev — à restreindre en prod)
- Validation des données entrantes via Pydantic v2
- Audit log sur les actions critiques

## Variables d'environnement importantes

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL async (asyncpg) |
| `SECRET_KEY` | Clé secrète JWT (min 32 chars) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée access token (défaut 15) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Durée refresh token (défaut 7) |
| `SMTP_HOST/PORT` | Serveur email |
| `ADMIN_EMAIL/PASSWORD` | Compte admin initial |
