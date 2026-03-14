# Africa SaaS Monorepo

Trois applications SaaS MVP pour le marché africain, construites avec FastAPI + React + PostgreSQL.

## Applications

| App | Description | Backend | Frontend |
|-----|------------|---------|----------|
| **FacturePro Africa** | Facturation & devis avec PDF + Mobile Money | :8001 | :3001 |
| **SchoolFlow Africa** | Gestion scolaire (élèves, notes, bulletins, scolarité) | :8002 | :3002 |
| **SavanaFlow POS** | Point de vente multi-magasins + gestion de stock | :8003 | :3003 |

## Stack technique

- **Backend** : FastAPI + SQLAlchemy async + Alembic + PostgreSQL
- **Frontend** : React 18 + Vite + TypeScript + Tailwind CSS
- **Auth** : JWT (access + refresh) avec RBAC (admin / manager / user)
- **PDF** : ReportLab
- **Email** : aiosmtplib + Mailhog (dev)
- **Infra** : Docker Compose + Nginx reverse proxy

## Démarrage rapide

### Prérequis
- Docker & Docker Compose
- Node.js 20+ (pour dev frontend)
- Python 3.11+ (pour dev backend)

### Lancement complet (Docker)

```bash
git clone <repo>
cd repo
cp apps/facturepro/backend/.env.example apps/facturepro/backend/.env
cp apps/schoolflow/backend/.env.example apps/schoolflow/backend/.env
cp apps/savanaflow/backend/.env.example apps/savanaflow/backend/.env

make up
make migrate
```

L'application est disponible sur :
- http://facturepro.localhost → FacturePro
- http://schoolflow.localhost → SchoolFlow
- http://savanaflow.localhost → SavanaFlow POS
- http://localhost:8025 → Mailhog (emails de test)

### Développement local (sans Docker)

```bash
# Backend (dans chaque app)
cd apps/savanaflow/backend
pip install -r requirements.txt
cp .env.example .env   # puis éditer DATABASE_URL
alembic upgrade head
uvicorn app.main:app --reload --port 8003

# Frontend (dans chaque app)
cd apps/savanaflow/frontend
npm install
npm run dev
```

## Identifiants par défaut

| App | Email | Mot de passe |
|-----|-------|--------------|
| FacturePro | admin@facturepro.africa | Admin1234! |
| SchoolFlow | admin@schoolflow.africa | Admin1234! |
| SavanaFlow | admin@savanaflow.africa | Admin1234! |

## Structure du monorepo

```
repo/
├── apps/
│   ├── facturepro/
│   │   ├── backend/        FastAPI + migrations + tests
│   │   └── frontend/       React + Vite
│   ├── schoolflow/
│   │   ├── backend/
│   │   └── frontend/
│   └── savanaflow/
│       ├── backend/
│       └── frontend/
├── shared/
│   └── libs/
│       ├── auth/           JWT utils partagés
│       ├── db/             SQLAlchemy engine factory
│       └── utils/          Logging, pagination, erreurs
├── infra/
│   ├── docker-compose.yml
│   └── nginx/nginx.conf
├── docs/
│   ├── architecture.md
│   └── demo_steps.md
└── Makefile
```

## Commandes utiles

```bash
make up                    # Démarrer tous les services
make down                  # Arrêter
make logs APP=savanaflow   # Logs d'une app
make migrate               # Migrations toutes les apps
make test                  # Tests
make shell APP=savanaflow  # Shell bash backend
make clean                 # Tout supprimer (volumes inclus)
```

## API Documentation

Swagger UI disponible sur :
- http://localhost:8001/docs (FacturePro)
- http://localhost:8002/docs (SchoolFlow)
- http://localhost:8003/docs (SavanaFlow)

## Fonctionnalités principales

### FacturePro Africa
- Gestion clients et produits/services
- Création de factures avec lignes multi-TVA
- Génération PDF (ReportLab)
- Envoi par email (aiosmtplib)
- Simulation paiement Mobile Money (Orange Money, Wave, etc.)
- Tableau de bord (CA, top clients, retards)

### SchoolFlow Africa
- Inscription élèves avec numéro auto
- Gestion classes, matières, enseignants, trimestres
- Saisie notes + moyenne pondérée automatique
- Bulletins scolaires PDF
- Suivi frais de scolarité + enregistrement paiements
- Tableau de bord établissement

### SavanaFlow POS
- Caisse POS en temps réel : panier + scan code-barres
- Multi-magasins (sélection en caisse)
- Paiements : espèces, Mobile Money, carte
- Gestion stock : entrées/sorties/ajustements + alertes stock faible
- Rapports de ventes (jour/semaine/mois) avec graphiques
- Top produits et répartition par mode de paiement
