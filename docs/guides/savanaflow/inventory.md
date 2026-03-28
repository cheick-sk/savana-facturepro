# Gestion de l'Inventaire

Ce guide vous explique comment gérer efficacement votre stock avec SavanaFlow.

## Vue d'ensemble

La gestion de l'inventaire vous permet de suivre vos stocks en temps réel, de gérer les approvisionnements et d'optimiser vos niveaux de stock.

## Tableau de bord inventaire

### Accès

**Menu principal > Stock > Tableau de bord**

### Indicateurs clés

| KPI | Description |
|-----|-------------|
| **Valeur du stock** | Valeur totale de l'inventaire |
| **Produits en stock** | Nombre de références disponibles |
| **Stock bas** | Produits sous le seuil d'alerte |
| **Ruptures** | Produits à stock nul |
| **Mouvements du jour** | Entrées et sorties du jour |

### Alertes

Le tableau affiche les alertes prioritaires :
- 🔴 **Ruptures de stock** - Produits indisponibles
- 🟠 **Stock bas** - Produits à réapprovisionner
- 🟡 **Péremption proche** - Pour les produits périssables

## Produits

### Consulter les produits

**Stock > Produits**

La liste affiche :
- Image du produit
- Nom et code
- Catégorie
- Prix d'achat / Prix de vente
- Stock actuel
- Statut

### Créer un produit

**Stock > Produits > Nouveau**

#### Informations générales

| Champ | Description | Requis |
|-------|-------------|--------|
| **Nom** | Désignation du produit | ✅ |
| **Code** | Code interne ou code-barres | ✅ |
| **Catégorie** | Classement du produit | ✅ |
| **Description** | Description détaillée | ❌ |
| **Image** | Photo du produit | ❌ |

#### Prix

| Champ | Description |
|-------|-------------|
| **Prix d'achat** | Coût d'acquisition HT |
| **Prix de vente** | Prix client TTC |
| **Marge** | Calculée automatiquement |

#### Stock

| Champ | Description |
|-------|-------------|
| **Stock initial** | Quantité au démarrage |
| **Stock minimum** | Seuil d'alerte |
| **Stock optimal** | Quantité idéale |
| **Emplacement** | Rayon/étagère |

#### Variantes

Pour les produits avec options (taille, couleur) :

1. Activez **"Produit avec variantes"**
2. Définissez les attributs :
   - Couleur : Rouge, Bleu, Vert
   - Taille : S, M, L, XL
3. Les combinaisons sont générées automatiquement

### Importer des produits

**Stock > Produits > Importer**

1. Téléchargez le modèle CSV
2. Remplissez vos données :

```csv
code,nom,categorie,prix_achat,prix_vente,stock
PRD001,Savon 500ml,Hygiène,500,750,100
PRD002,Riz 5kg,Alimentation,3000,4000,50
```

3. Uploadez le fichier
4. Vérifiez l'aperçu
5. Confirmez l'import

### Scanner un produit

Pour ajouter un produit par code-barres :

1. **Stock > Produits > Scanner**
2. Scannez le code-barres
3. Si le produit existe : affiche les détails
4. Si inconnu : formulaire de création pré-rempli

## Catégories

### Organiser par catégories

**Stock > Catégories**

Les catégories permettent de :
- Organiser le catalogue
- Faciliter la recherche au POS
- Générer des rapports par segment

### Créer une catégorie

1. **Stock > Catégories > Nouvelle**
2. Renseignez :
   - Nom
   - Description
   - Couleur (pour le POS)
   - Catégorie parente (optionnel)

### Hiérarchie des catégories

```
Alimentation
├── Boissons
│   ├── Eaux
│   └── Jus
├── Épicerie
│   ├── Riz et pâtes
│   └── Conserves
└── Frais
    ├── Laitiers
    └── Viandes
```

## Mouvements de stock

### Types de mouvements

| Type | Effet | Exemples |
|------|-------|----------|
| **Entrée** | + Stock | Achat, Retour client |
| **Sortie** | - Stock | Vente, Perte, Cassé |
| **Transfert** | Mouvement interne | Magasin A → Magasin B |
| **Inventaire** | Ajustement | Correction d'écart |

### Historique des mouvements

**Stock > Mouvements**

Affiche :
- Date et heure
- Type de mouvement
- Produit
- Quantité
- Origine/Destination
- Utilisateur

### Effectuer un mouvement manuel

**Stock > Mouvements > Nouveau**

1. Sélectionnez le **type** de mouvement
2. Choisissez le **produit**
3. Entrez la **quantité**
4. Renseignez le **motif**
5. Validez

## Inventaire physique

### Lancer un inventaire

**Stock > Inventaire > Nouvel inventaire**

1. **Nommez l'inventaire** (ex: "Inventaire Janvier 2024")
2. **Sélectionnez la portée** :
   - Tout le stock
   - Une catégorie
   - Un emplacement
3. **Lancez l'inventaire**

### Comptage

#### Méthode papier → saisie

1. Imprimez la liste de comptage
2. Comptez physiquement
3. Saisissez les quantités dans le système

#### Méthode scanner

1. Scannez chaque produit
2. Entrez la quantité comptée
3. Passez au produit suivant

#### Méthode mobile

Utilisez l'application mobile :
1. Ouvrez l'inventaire en cours
2. Scannez/entrez les produits
3. Les données se synchronisent

### Écarts d'inventaire

Après saisie, le système affiche les écarts :

| Produit | Théorique | Compté | Écart |
|---------|-----------|--------|-------|
| Savon 500ml | 100 | 98 | -2 |
| Riz 5kg | 50 | 52 | +2 |
| Lait 1L | 30 | 30 | 0 |

### Valider l'inventaire

1. Vérifiez les écarts significatifs
2. Ajoutez des commentaires si nécessaire
3. **Validez l'inventaire**
4. Les stocks sont ajustés automatiquement

## Réapprovisionnement

### Commandes fournisseurs

**Achats > Commandes > Nouvelle commande**

1. **Sélectionnez le fournisseur**
2. **Ajoutez les produits** :
   - Par recherche
   - Depuis les suggestions (stock bas)
   - Depuis un modèle de commande
3. **Vérifiez les quantités**
4. **Envoyez la commande**

### Réception des marchandises

**Achats > Réceptions > Nouvelle réception**

1. Sélectionnez la **commande fournisseur**
2. Vérifiez les quantités reçues
3. Signalez les écarts :
   - Manquants
   - Endommagés
   - Erreurs de référence
4. **Validez la réception**
5. Le stock est mis à jour automatiquement

### Suggestions de réapprovisionnement

**Stock > Suggestions**

Le système propose des commandes basées sur :
- Niveau de stock actuel
- Ventes moyennes
- Délai de livraison fournisseur
- Stock de sécurité

## Alertes de stock

### Configurer les alertes

**Stock > Alertes > Configuration**

| Alerte | Condition | Action |
|--------|-----------|--------|
| **Stock bas** | Stock < Minimum | Notification |
| **Rupture** | Stock = 0 | Notification + Bloquer vente |
| **Sur-stock** | Stock > Maximum | Notification |
| **Péremption** | Date < J+30 | Alerte avance |

### Notifications

Les alertes peuvent être envoyées par :
- Email
- SMS
- WhatsApp
- Notification in-app

## Transferts inter-magasins

### Créer un transfert

**Stock > Transferts > Nouveau transfert**

1. **Magasin origine**
2. **Magasin destination**
3. **Produits et quantités**
4. **Date de transfert**
5. Validez

### Réception du transfert

Dans le magasin destinataire :

1. **Stock > Transferts > En attente**
2. Sélectionnez le transfert
3. Vérifiez les quantités reçues
4. Validez la réception

## Rapports d'inventaire

### État du stock

**Stock > Rapports > État du stock**

- Valeur par catégorie
- Rotation des produits
- Produits dormants (sans vente)

### Mouvements

**Stock > Rapports > Mouvements**

- Entrées/sorties par période
- Par type de mouvement
- Par utilisateur

### Rotation des stocks

**Stock > Rapports > Rotation**

| Produit | Rotation | Commentaire |
|---------|----------|-------------|
| Eau 1.5L | 45 jours | Excellente |
| Riz 5kg | 30 jours | Bonne |
| Savon | 90 jours | À surveiller |
| Détergent | 180 jours | Sur-stock |

### Valorisation du stock

**Stock > Rapports > Valorisation**

Méthodes disponibles :
- **CUMP** : Coût Unitaire Moyen Pondéré
- **FIFO** : Premier entré, premier sorti
- **LIFO** : Dernier entré, premier sorti

## Gestion des fournisseurs

### Ajouter un fournisseur

**Achats > Fournisseurs > Nouveau**

| Champ | Description |
|-------|-------------|
| **Nom** | Raison sociale |
| **Contact** | Nom du contact |
| **Téléphone** | Numéro |
| **Email** | Pour les commandes |
| **Adresse** | Adresse complète |
| **Délai de livraison** | En jours |
| **Conditions** | Délai de paiement |

### Associer des produits

Pour chaque fournisseur, définissez :
- Les produits qu'il fournit
- Le prix d'achat
- Le code fournisseur
- Le conditionnement

## Prévisions de stock

### Analyse prédictive

**Stock > Prévisions**

Le système analyse vos ventes passées pour prédire :
- Demandes futures
- Risques de rupture
- Besoins de réapprovisionnement

### Rapport de prévision

| Produit | Vente moy./semaine | Stock actuel | Jours de stock | Action |
|---------|-------------------|--------------|----------------|--------|
| Eau 1.5L | 50 | 200 | 28 jours | OK |
| Riz 5kg | 30 | 40 | 9 jours | Commander |
| Savon | 10 | 5 | 3 jours | Urgent |

## Bonnes pratiques

### Organisation

- ✅ Structurez vos catégories logiquement
- ✅ Utilisez des codes cohérents
- ✅ Maintenez à jour les images produits

### Suivi

- ✅ Effectuez des inventaires réguliers
- ✅ Analysez les écarts et identifiez les causes
- ✅ Paramétrez correctement les seuils d'alerte

### Optimisation

- ✅ Réduisez les stocks dormants
- ✅ Négociez avec les fournisseurs
- ✅ Utilisez les prévisions d'achat

---

[← Point de vente](./pos.md) | [Boutique en ligne →](./ecommerce.md)
