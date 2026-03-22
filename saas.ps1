# Africa SaaS Monorepo - PowerShell Helper
# Usage: . .\saas.ps1   (charger les fonctions)
# Puis: saas-start, saas-stop, saas-logs, etc.

$ErrorActionPreference = "Stop"

function Write-Header {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║       Africa SaaS Monorepo — PowerShell      ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function saas-help {
    Write-Header
    Write-Host "  Commandes disponibles :" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  saas-start       " -ForegroundColor Green -NoNewline; Write-Host "Démarrer tous les services + migrations"
    Write-Host "  saas-stop        " -ForegroundColor Green -NoNewline; Write-Host "Arrêter tous les services"
    Write-Host "  saas-restart     " -ForegroundColor Green -NoNewline; Write-Host "Redémarrer tous les services"
    Write-Host "  saas-build       " -ForegroundColor Green -NoNewline; Write-Host "Reconstruire les images Docker"
    Write-Host "  saas-logs        " -ForegroundColor Green -NoNewline; Write-Host "Voir les logs de tous les services"
    Write-Host "  saas-logs savanaflow  " -ForegroundColor Green -NoNewline; Write-Host "Logs d'une app spécifique"
    Write-Host "  saas-ps          " -ForegroundColor Green -NoNewline; Write-Host "État des conteneurs"
    Write-Host "  saas-migrate     " -ForegroundColor Green -NoNewline; Write-Host "Lancer les migrations Alembic"
    Write-Host "  saas-shell savanaflow  " -ForegroundColor Green -NoNewline; Write-Host "Shell bash dans le backend"
    Write-Host "  saas-test        " -ForegroundColor Green -NoNewline; Write-Host "Lancer les tests"
    Write-Host "  saas-clean       " -ForegroundColor Green -NoNewline; Write-Host "Supprimer tout (volumes inclus)"
    Write-Host "  saas-urls        " -ForegroundColor Green -NoNewline; Write-Host "Afficher les URLs de l'application"
    Write-Host ""
}

function saas-urls {
    Write-Host ""
    Write-Host "  ┌─ Applications ──────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "  │  SavanaFlow POS   →  http://localhost:3003  │" -ForegroundColor White
    Write-Host "  │  FacturePro       →  http://localhost:3001  │" -ForegroundColor White
    Write-Host "  │  SchoolFlow       →  http://localhost:3002  │" -ForegroundColor White
    Write-Host "  ├─ APIs (Swagger) ────────────────────────────┤" -ForegroundColor Cyan
    Write-Host "  │  SavanaFlow API   →  http://localhost:8003/docs  │" -ForegroundColor White
    Write-Host "  │  FacturePro API   →  http://localhost:8001/docs  │" -ForegroundColor White
    Write-Host "  │  SchoolFlow API   →  http://localhost:8002/docs  │" -ForegroundColor White
    Write-Host "  ├─ Outils ───────────────────────────────────┤" -ForegroundColor Cyan
    Write-Host "  │  Mailhog (emails) →  http://localhost:8025  │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────┘" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Identifiants : admin@savanaflow.africa / Admin1234!" -ForegroundColor Yellow
    Write-Host ""
}

function saas-check-docker {
    try {
        docker info 2>&1 | Out-Null
        return $true
    } catch {
        Write-Host "[✗] Docker n'est pas lancé. Ouvre Docker Desktop." -ForegroundColor Red
        return $false
    }
}

function saas-setup-env {
    $apps = @("facturepro", "schoolflow", "savanaflow")
    foreach ($app in $apps) {
        $env_file = "apps\$app\backend\.env"
        $example  = "apps\$app\backend\.env.example"
        if (-not (Test-Path $env_file)) {
            Copy-Item $example $env_file
            Write-Host "[✓] .env créé pour $app" -ForegroundColor Green
        }
    }
}

function saas-start {
    Write-Header
    if (-not (saas-check-docker)) { return }

    saas-setup-env

    Write-Host "[→] Démarrage des conteneurs..." -ForegroundColor Cyan
    Set-Location infra
    docker compose up -d
    Set-Location ..

    Write-Host "[→] Attente des bases de données (20 secondes)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 20

    saas-migrate

    saas-urls
}

function saas-stop {
    Write-Host "[→] Arrêt des services..." -ForegroundColor Cyan
    Set-Location infra
    docker compose down
    Set-Location ..
    Write-Host "[✓] Services arrêtés." -ForegroundColor Green
}

function saas-restart {
    saas-stop
    Start-Sleep -Seconds 3
    saas-start
}

function saas-build {
    Write-Host "[→] Reconstruction des images (peut prendre quelques minutes)..." -ForegroundColor Cyan
    Set-Location infra
    docker compose build
    Set-Location ..
    Write-Host "[✓] Build terminé." -ForegroundColor Green
}

function saas-migrate {
    Write-Host "[→] Migration FacturePro..." -ForegroundColor Cyan
    Set-Location infra
    docker compose exec facturepro_backend alembic upgrade head 2>$null
    Write-Host "[→] Migration SchoolFlow..." -ForegroundColor Cyan
    docker compose exec schoolflow_backend alembic upgrade head 2>$null
    Write-Host "[→] Migration SavanaFlow..." -ForegroundColor Cyan
    docker compose exec savanaflow_backend alembic upgrade head 2>$null
    Set-Location ..
    Write-Host "[✓] Migrations terminées." -ForegroundColor Green
}

function saas-logs {
    param([string]$app = "")
    Set-Location infra
    if ($app -eq "") {
        docker compose logs -f
    } else {
        docker compose logs -f "${app}_backend" "${app}_frontend"
    }
    Set-Location ..
}

function saas-ps {
    Set-Location infra
    docker compose ps
    Set-Location ..
}

function saas-shell {
    param([string]$app = "savanaflow")
    Set-Location infra
    docker compose exec "${app}_backend" bash
    Set-Location ..
}

function saas-test {
    $apps = @("facturepro", "schoolflow", "savanaflow")
    foreach ($app in $apps) {
        Write-Host "[→] Tests $app..." -ForegroundColor Cyan
        Set-Location "apps\$app\backend"
        python -m pytest tests/ -v
        Set-Location "..\..\..\"
    }
}

function saas-clean {
    Write-Host ""
    Write-Host "[!] ATTENTION : Ceci supprime tous les conteneurs ET les données !" -ForegroundColor Red
    $confirm = Read-Host "Taper 'oui' pour confirmer"
    if ($confirm -eq "oui") {
        Set-Location infra
        docker compose down -v --remove-orphans
        Set-Location ..
        Write-Host "[✓] Tout supprimé." -ForegroundColor Green
    } else {
        Write-Host "[x] Annulé." -ForegroundColor Yellow
    }
}

# Afficher l'aide au chargement
saas-help
Write-Host "  Fichier chargé. Tape 'saas-start' pour démarrer !" -ForegroundColor Green
Write-Host ""
