# Guide de démonstration

## Setup initial (2 minutes)

```bash
# 1. Cloner et configurer
git clone <repo> && cd repo
make setup      # Copie les .env.example → .env

# 2. Démarrer
make up         # Lance tous les conteneurs Docker

# 3. Migrer les bases de données
sleep 15        # Attendre que PostgreSQL soit prêt
make migrate    # Crée toutes les tables + admin
```

---

## SavanaFlow POS — Démo complète

### 1. Créer un magasin
1. Se connecter : http://savanaflow.localhost (admin@savanaflow.africa / Admin1234!)
2. Aller dans **Magasins** → **Nouveau magasin**
3. Nom : "Boutique Dakar Centre", Adresse : "Avenue Bourguiba, Dakar"

### 2. Créer des produits
**Via l'interface :**
1. Aller dans **Produits** → **Nouveau produit**
2. Remplir : Nom, Code-barres, Catégorie, Prix vente, Stock initial
3. Exemples :
   - Riz parfumé 5kg | Barcode: 6001234567890 | 3500 XOF | Stock: 100
   - Huile végétale 1L | Barcode: 6009876543210 | 1200 XOF | Stock: 50
   - Savon Lux | Barcode: 6005555555555 | 450 XOF | Stock: 200

**Via l'API (curl) :**
```bash
TOKEN=$(curl -s -X POST http://localhost:8003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@savanaflow.africa","password":"Admin1234!"}' \
  | jq -r .access_token)

curl -X POST http://localhost:8003/api/v1/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"store_id":1,"name":"Riz parfumé 5kg","barcode":"6001234567890","sell_price":3500,"stock_quantity":100,"category":"Alimentation","unit":"sac","low_stock_threshold":10}'
```

### 3. Effectuer une vente (POS)
1. Aller dans **Caisse POS**
2. Sélectionner le magasin
3. Scanner le code-barres dans le champ de recherche + Entrée, **ou** cliquer sur un produit
4. Ajuster les quantités avec +/-
5. Choisir mode de paiement : Espèces / Mobile Money / Carte
6. Cliquer **Encaisser** → La vente est enregistrée, le stock est déduit automatiquement

### 4. Vérifier le stock
1. Aller dans **Stock**
2. Observer les niveaux actualisés
3. Faire un mouvement d'entrée : cliquer **Mouvement** → Type: Entrée → Quantité: 50

### 5. Voir les rapports
1. Aller dans **Rapports**
2. Basculer entre Aujourd'hui / 7 jours / Ce mois
3. Observer : CA, marge brute, top produits (graphique barre), répartition paiements (camembert)

---

## FacturePro Africa — Démo complète

### 1. Créer un client
1. Se connecter : http://facturepro.localhost
2. **Clients** → **Nouveau client** → Remplir les informations

### 2. Créer une facture
1. **Factures** → **Nouvelle facture**
2. Sélectionner le client
3. Ajouter des lignes (produit/service, quantité, prix, TVA)
4. Définir l'échéance
5. Créer → Statut "Brouillon"

### 3. Envoyer par email
1. Cliquer l'icône "Envoyer" sur la facture
2. L'email est envoyé avec le PDF en pièce jointe
3. Vérifier dans Mailhog : http://localhost:8025

### 4. Simuler un paiement Mobile Money
1. Ouvrir le détail d'une facture
2. Cliquer **Paiement Mobile Money**
3. Renseigner numéro + opérateur (Orange Money, Wave...)
4. Confirmer → La facture passe en statut "Payée"

---

## SchoolFlow Africa — Démo complète

### 1. Configurer l'établissement
1. Se connecter : http://schoolflow.localhost
2. **Classes** → Créer les classes : "6ème A", "5ème B", "4ème C"

### 2. Inscrire des élèves
1. **Élèves** → **Inscrire un élève**
2. Remplir les informations (un numéro d'élève est auto-généré : EL-2024-0001)
3. Affecter à une classe

### 3. Saisir des notes
1. **Notes** → **Saisir une note**
2. Sélectionner élève + matière + trimestre
3. Entrer la note /20 avec coefficient
4. Enregistrer

### 4. Générer le bulletin PDF
1. Dans la liste des notes, cliquer l'icône téléchargement
2. Le bulletin PDF s'ouvre avec : informations élève, toutes les notes, moyennes pondérées

### 5. Suivre les frais de scolarité
1. **Scolarité** → Voir les factures
2. Cliquer **Payer** sur une facture → Entrer le montant
3. La facture passe à "Partiel" puis "Payée" selon les versements

---

## Endpoints API utiles

```bash
# SavanaFlow — Dashboard stats
curl -H "Authorization: Bearer $TOKEN" http://localhost:8003/api/v1/dashboard/stats

# SavanaFlow — Rapport mensuel
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8003/api/v1/reports/sales?period=month"

# SavanaFlow — Lookup barcode
curl -H "Authorization: Bearer $TOKEN" http://localhost:8003/api/v1/products/barcode/6001234567890

# FacturePro — PDF facture
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/invoices/1/pdf -o facture.pdf
```

## Swagger UI

- FacturePro : http://localhost:8001/docs
- SchoolFlow : http://localhost:8002/docs
- SavanaFlow : http://localhost:8003/docs
