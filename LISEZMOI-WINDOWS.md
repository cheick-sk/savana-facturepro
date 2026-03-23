# Lancer le projet sur Windows

## Prérequis unique : Docker Desktop

Télécharge et installe Docker Desktop : https://www.docker.com/products/docker-desktop/
Assure-toi qu'il est bien lancé (icône baleine dans la barre des tâches).

---

## Option 1 — Scripts .bat (le plus simple, double-clic)

### Démarrage en un clic
1. Copie les fichiers `.bat` à la racine du projet (là où se trouve le dossier `infra/`)
2. Double-clique sur **START.bat**
3. C'est tout — les URLs s'affichent à la fin

### Menu interactif
Double-clique sur **menu.bat** pour accéder à toutes les actions.

### Scripts disponibles
| Fichier | Action |
|---------|--------|
| `START.bat` | Démarrer + migrer + afficher les URLs |
| `STOP.bat` | Arrêter tous les services |
| `menu.bat` | Menu interactif complet |

---

## Option 2 — PowerShell

### Première utilisation
Ouvre PowerShell **en tant qu'administrateur** et autorise les scripts :
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Utilisation
```powershell
# Depuis la racine du projet
. .\saas.ps1        # Charger les commandes (note le point au début)

saas-start          # Démarrer tout
saas-stop           # Arrêter
saas-logs savanaflow  # Voir les logs du POS
saas-ps             # État des conteneurs
saas-migrate        # Re-lancer les migrations
saas-urls           # Afficher les URLs
saas-help           # Voir toutes les commandes
```

---

## Option 3 — WSL2 (Linux dans Windows)

### Activer WSL2 (une seule fois)
Dans PowerShell admin :
```powershell
wsl --install
# Redémarre Windows, puis installe Ubuntu depuis le Microsoft Store
```

### Utilisation
```bash
# Ouvre Ubuntu depuis le menu Démarrer
# Navigue vers ton projet (les disques Windows sont dans /mnt/)
cd /mnt/c/Users/TON_NOM/Documents/repo

# Charger les commandes
source scripts/saas.sh

# Démarrer
saas-start
saas-logs savanaflow
saas-stop
```

---

## URLs une fois démarré

| Application | URL |
|------------|-----|
| **SavanaFlow POS** | http://localhost:3003 |
| **FacturePro** | http://localhost:3001 |
| **SchoolFlow** | http://localhost:3002 |
| **Mailhog** (emails) | http://localhost:8025 |
| **API SavanaFlow** (Swagger) | http://localhost:8003/docs |

## Identifiants

| App | Email | Mot de passe |
|-----|-------|--------------|
| SavanaFlow | admin@savanaflow.africa | Admin1234! |
| FacturePro | admin@facturepro.africa | Admin1234! |
| SchoolFlow | admin@schoolflow.africa | Admin1234! |

## Problèmes fréquents

**"Docker n'est pas lancé"**
→ Ouvre Docker Desktop et attends que la baleine soit stable.

**"Port déjà utilisé"**
→ Lance `STOP.bat` puis `START.bat`.

**"Les migrations échouent"**
→ Attends 30 secondes après le démarrage et relance les migrations depuis le menu.

**Les pages ne chargent pas**
→ Les frontends mettent 1-2 minutes à compiler au premier démarrage. Patiente ou consulte les logs.
