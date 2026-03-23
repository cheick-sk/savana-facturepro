#!/bin/bash
# Africa SaaS Monorepo — WSL2 / Linux / macOS
# Usage: source scripts/saas.sh
#   puis: saas-start, saas-stop, saas-logs, etc.

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

saas-help() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       Africa SaaS Monorepo — WSL2/Linux      ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${YELLOW}Commandes disponibles :${NC}"
    echo ""
    echo -e "  ${GREEN}saas-start${NC}            Démarrer tous les services + migrations"
    echo -e "  ${GREEN}saas-stop${NC}             Arrêter tous les services"
    echo -e "  ${GREEN}saas-restart${NC}          Redémarrer"
    echo -e "  ${GREEN}saas-build${NC}            Reconstruire les images Docker"
    echo -e "  ${GREEN}saas-logs${NC}             Logs de tous les services"
    echo -e "  ${GREEN}saas-logs savanaflow${NC}  Logs d'une app spécifique"
    echo -e "  ${GREEN}saas-ps${NC}               État des conteneurs"
    echo -e "  ${GREEN}saas-migrate${NC}          Lancer les migrations Alembic"
    echo -e "  ${GREEN}saas-shell savanaflow${NC} Shell bash dans le backend"
    echo -e "  ${GREEN}saas-test${NC}             Lancer les tests"
    echo -e "  ${GREEN}saas-clean${NC}            Supprimer tout (volumes inclus)"
    echo -e "  ${GREEN}saas-urls${NC}             Afficher les URLs"
    echo ""
}

saas-urls() {
    echo ""
    echo -e "  ${CYAN}┌─ Applications ───────────────────────────────┐${NC}"
    echo -e "  │  SavanaFlow POS   →  ${GREEN}http://localhost:3003${NC}   │"
    echo -e "  │  FacturePro       →  ${GREEN}http://localhost:3001${NC}   │"
    echo -e "  │  SchoolFlow       →  ${GREEN}http://localhost:3002${NC}   │"
    echo -e "  ${CYAN}├─ APIs (Swagger) ──────────────────────────────┤${NC}"
    echo -e "  │  SavanaFlow API   →  ${GREEN}http://localhost:8003/docs${NC} │"
    echo -e "  │  FacturePro API   →  ${GREEN}http://localhost:8001/docs${NC} │"
    echo -e "  │  SchoolFlow API   →  ${GREEN}http://localhost:8002/docs${NC} │"
    echo -e "  ${CYAN}├─ Outils ──────────────────────────────────────┤${NC}"
    echo -e "  │  Mailhog (emails) →  ${GREEN}http://localhost:8025${NC}   │"
    echo -e "  ${CYAN}└──────────────────────────────────────────────┘${NC}"
    echo ""
    echo -e "  ${YELLOW}Identifiants : admin@savanaflow.africa / Admin1234!${NC}"
    echo ""
}

_saas-setup-env() {
    for app in facturepro schoolflow savanaflow; do
        if [ ! -f "apps/$app/backend/.env" ]; then
            cp "apps/$app/backend/.env.example" "apps/$app/backend/.env"
            echo -e "${GREEN}[✓] .env créé pour $app${NC}"
        fi
    done
}

saas-start() {
    echo -e "${CYAN}[→] Vérification de Docker...${NC}"
    if ! docker info &>/dev/null; then
        echo -e "${RED}[✗] Docker n'est pas lancé !${NC}"
        return 1
    fi

    _saas-setup-env

    echo -e "${CYAN}[→] Démarrage des conteneurs...${NC}"
    (cd infra && docker compose up -d)

    echo -e "${CYAN}[→] Attente des bases de données (20 secondes)...${NC}"
    sleep 20

    saas-migrate
    saas-urls
}

saas-stop() {
    echo -e "${CYAN}[→] Arrêt des services...${NC}"
    (cd infra && docker compose down)
    echo -e "${GREEN}[✓] Services arrêtés.${NC}"
}

saas-restart() {
    saas-stop
    sleep 3
    saas-start
}

saas-build() {
    echo -e "${CYAN}[→] Reconstruction des images...${NC}"
    (cd infra && docker compose build)
    echo -e "${GREEN}[✓] Build terminé.${NC}"
}

saas-migrate() {
    echo -e "${CYAN}[→] Migration FacturePro...${NC}"
    (cd infra && docker compose exec facturepro_backend alembic upgrade head 2>/dev/null || true)
    echo -e "${CYAN}[→] Migration SchoolFlow...${NC}"
    (cd infra && docker compose exec schoolflow_backend alembic upgrade head 2>/dev/null || true)
    echo -e "${CYAN}[→] Migration SavanaFlow...${NC}"
    (cd infra && docker compose exec savanaflow_backend alembic upgrade head 2>/dev/null || true)
    echo -e "${GREEN}[✓] Migrations terminées.${NC}"
}

saas-logs() {
    local app="${1:-}"
    if [ -z "$app" ]; then
        (cd infra && docker compose logs -f)
    else
        (cd infra && docker compose logs -f "${app}_backend" "${app}_frontend")
    fi
}

saas-ps() {
    (cd infra && docker compose ps)
}

saas-shell() {
    local app="${1:-savanaflow}"
    (cd infra && docker compose exec "${app}_backend" bash)
}

saas-test() {
    for app in facturepro schoolflow savanaflow; do
        echo -e "${CYAN}[→] Tests $app...${NC}"
        (cd "apps/$app/backend" && python -m pytest tests/ -v)
    done
}

saas-clean() {
    echo -e "${RED}[!] ATTENTION : Ceci supprime tous les conteneurs ET les données !${NC}"
    read -p "Taper 'oui' pour confirmer : " confirm
    if [ "$confirm" = "oui" ]; then
        (cd infra && docker compose down -v --remove-orphans)
        echo -e "${GREEN}[✓] Tout supprimé.${NC}"
    else
        echo -e "${YELLOW}[x] Annulé.${NC}"
    fi
}

saas-help
echo -e "${GREEN}  Fichier chargé ! Lance 'saas-start' pour démarrer.${NC}"
echo ""
