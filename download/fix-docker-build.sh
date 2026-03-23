#!/bin/bash
# Script de correction pour les problèmes de build Docker
# Exécutez ce script à la racine du projet savana-facturepro

set -e

echo "🔧 Application des corrections de build Docker..."

# 1. Corriger requirements.txt (redis version)
echo "📝 Correction de requirements.txt..."
sed -i 's/redis==5.0.1/redis>=4.5.2,<5.0.0/' apps/facturepro/backend/requirements.txt

# 2. Corriger package.json de facturepro frontend
echo "📝 Correction de facturepro/frontend/package.json..."
cat > apps/facturepro/frontend/package.json << 'EOF'
{
  "name": "facturepro-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "axios": "^1.7.2",
    "zustand": "^4.5.2",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.383.0",
    "recharts": "^2.12.7",
    "clsx": "^2.1.1",
    "i18next": "^23.11.5",
    "react-i18next": "^14.1.2",
    "i18next-browser-languagedetector": "^8.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.13"
  }
}
EOF

# 3. Corriger i18n/index.ts
echo "📝 Correction de facturepro/frontend/src/i18n/index.ts..."
sed -i "s/i18n.changeLanguage(languageCode, (err) => {/i18n.changeLanguage(languageCode, (err: Error | null | undefined) => {/" \
    apps/facturepro/frontend/src/i18n/index.ts

# 4. Corriger package.json de savanaflow frontend
echo "📝 Correction de savanaflow/frontend/package.json..."
cat > apps/savanaflow/frontend/package.json << 'EOF'
{
  "name": "savanaflow-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "clsx": "^2.1.1",
    "idb": "^8.0.3",
    "lucide-react": "^0.383.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.23.1",
    "recharts": "^2.12.7",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.13"
  }
}
EOF

# 5. Corriger offline-db.ts
echo "📝 Correction de savanaflow/frontend/src/lib/offline-db.ts..."
sed -i "s/indexes: { 'by-barcode': string }/indexes: { 'barcode': string }/" \
    apps/savanaflow/frontend/src/lib/offline-db.ts

# 6. Corriger package.json de schoolflow frontend
echo "📝 Correction de schoolflow/frontend/package.json..."
cat > apps/schoolflow/frontend/package.json << 'EOF'
{
  "name": "schoolflow-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "axios": "^1.7.2",
    "zustand": "^4.5.2",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.383.0",
    "recharts": "^2.12.7",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.13"
  }
}
EOF

# 7. Créer .gitignore
echo "📝 Création de .gitignore..."
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/
!**/src/lib/

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Build outputs
dist/
build/
*.local

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Testing
.coverage
htmlcov/
.tox/
.nox/
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.py,cover
.hypothesis/
.pytest_cache/
pytestdebug.log

# Logs
logs/
*.log

# Database
*.db
*.sqlite3

# Uploads
uploads/

# Misc
*.bak
*.tmp
*.temp
EOF

# 8. Nettoyer node_modules
echo "🧹 Nettoyage de node_modules..."
rm -rf apps/*/frontend/node_modules apps/*/frontend/package-lock.json

echo ""
echo "✅ Corrections appliquées avec succès !"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. git add ."
echo "   2. git commit -m 'fix: resolve Docker build issues'"
echo "   3. git push origin main"
echo "   4. docker compose up -d --build"
echo ""
