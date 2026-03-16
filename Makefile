.PHONY: help up down build logs ps clean migrate seed test lint

APP ?= savanaflow

help:
	@echo ""
	@echo "  SaaS Africa Monorepo — Commandes disponibles"
	@echo ""
	@echo "  make up            Démarrer tous les services"
	@echo "  make up APP=savanaflow  Démarrer un service spécifique"
	@echo "  make down          Arrêter tous les services"
	@echo "  make build         Reconstruire les images Docker"
	@echo "  make logs          Voir les logs (APP= pour filtrer)"
	@echo "  make ps            Voir l'état des conteneurs"
	@echo "  make migrate       Lancer les migrations Alembic"
	@echo "  make seed          Créer les admins initiaux"
	@echo "  make test          Lancer les tests"
	@echo "  make lint          Linter le code Python"
	@echo "  make clean         Supprimer volumes et conteneurs"
	@echo "  make shell         Shell bash dans le conteneur backend (APP=)"
	@echo ""

up:
	cd infra && docker compose up -d

down:
	cd infra && docker compose down

build:
	cd infra && docker compose build

logs:
	@if [ "$(APP)" = "" ]; then \
		cd infra && docker compose logs -f; \
	else \
		cd infra && docker compose logs -f $(APP)_backend $(APP)_frontend; \
	fi

ps:
	cd infra && docker compose ps

clean:
	cd infra && docker compose down -v --remove-orphans

shell:
	cd infra && docker compose exec $(APP)_backend bash

migrate:
	@echo "Running migrations for all apps..."
	cd infra && docker compose exec facturepro_backend alembic upgrade head
	cd infra && docker compose exec schoolflow_backend alembic upgrade head
	cd infra && docker compose exec savanaflow_backend alembic upgrade head

migrate-one:
	cd infra && docker compose exec $(APP)_backend alembic upgrade head

rollback:
	cd infra && docker compose exec $(APP)_backend alembic downgrade -1

test:
	@echo "Running tests..."
	cd apps/facturepro/backend && python -m pytest tests/ -v
	cd apps/schoolflow/backend && python -m pytest tests/ -v
	cd apps/savanaflow/backend && python -m pytest tests/ -v

test-one:
	cd apps/$(APP)/backend && python -m pytest tests/ -v

lint:
	cd apps/facturepro/backend && ruff check app/
	cd apps/schoolflow/backend && ruff check app/
	cd apps/savanaflow/backend && ruff check app/

dev-backend:
	@echo "Starting $(APP) backend in dev mode..."
	cd apps/$(APP)/backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "Starting $(APP) frontend in dev mode..."
	cd apps/$(APP)/frontend && npm run dev

install-deps:
	cd apps/facturepro/backend && pip install -r requirements.txt
	cd apps/schoolflow/backend && pip install -r requirements.txt
	cd apps/savanaflow/backend && pip install -r requirements.txt
	cd apps/facturepro/frontend && npm install
	cd apps/schoolflow/frontend && npm install
	cd apps/savanaflow/frontend && npm install

setup: install-deps
	@echo "Creating .env files from examples..."
	@for app in facturepro schoolflow savanaflow; do \
		if [ ! -f apps/$$app/backend/.env ]; then \
			cp apps/$$app/backend/.env.example apps/$$app/backend/.env; \
			echo "Created apps/$$app/backend/.env"; \
		fi; \
	done
	@echo ""
	@echo "Setup complete. Run 'make up' to start all services."
