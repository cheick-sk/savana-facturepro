# Point de Vente (POS)

Ce guide vous explique comment utiliser le système de point de vente SavanaFlow pour gérer vos transactions quotidiennes.

## Vue d'ensemble

SavanaFlow POS est une solution de point de vente tactile conçue pour les commerçants africains, avec support du mode hors-ligne et intégration Mobile Money.

## Interface du POS

### Accès

**Menu principal > POS** ou utilisez le raccourci `P`

### Écran principal

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Recherche...          │ Magasin: Principal  │ 👤 Admin │
├────────────────────────────┼────────────────────────────────┤
│                            │   PANIER (3 articles)         │
│   ┌──────┐ ┌──────┐       │   ─────────────────────────    │
│   │ Prod │ │ Prod │       │   Produit A   x2   10 000 F    │
│   │  A   │ │  B   │       │   Produit B   x1    5 000 F    │
│   └──────┘ └──────┘       │   Produit C   x1    3 500 F    │
│                            │   ─────────────────────────    │
│   ┌──────┐ ┌──────┐       │   TOTAL:       18 500 F        │
│   │ Prod │ │ Prod │       │                                │
│   │  C   │ │  D   │       │   [🛒 Vider]  [✓ Valider]      │
│   └──────┘ └──────┘       │                                │
│                            │                                │
│   [📱 Scanner] [⌨ Clavier]│                                │
└────────────────────────────┴────────────────────────────────┘
```

### Zones de l'interface

| Zone | Description |
|------|-------------|
| **En-tête** | Recherche, magasin actif, utilisateur |
| **Grille produits** | Affichage des produits par catégorie |
| **Pavé numérique** | Pour la saisie rapide |
| **Panier** | Liste des articles sélectionnés |
| **Actions** | Valider, annuler, mettre en attente |

## Ajouter des produits au panier

### Par scanner

1. Cliquez sur **📱 Scanner** ou appuyez sur `S`
2. Pointez le code-barres du produit
3. Le produit est ajouté automatiquement au panier

### Par recherche

1. Cliquez sur la barre de recherche
2. Tapez le nom ou le code du produit
3. Sélectionnez dans les résultats
4. Le produit est ajouté au panier

### Par grille

1. Naviguez dans les catégories (onglets supérieurs)
2. Cliquez sur le produit
3. Il est ajouté au panier

### Par code

1. Appuyez sur `Entrée` sans texte dans la recherche
2. Un champ "Code produit" apparaît
3. Tapez le code et validez

## Gérer le panier

### Modifier les quantités

**Méthode 1 : Boutons + et -**
- Cliquez sur `+` ou `-` à côté de la ligne

**Méthode 2 : Saisie directe**
- Cliquez sur la quantité
- Tapez le nouveau nombre
- Validez

### Supprimer un article

1. Glissez la ligne vers la gauche
2. Cliquez sur **🗑️** (Corbeille)

Ou cliquez sur la ligne et appuyez sur `Suppr`

### Vider le panier

Cliquez sur **🛒 Vider le panier**

### Mettre en attente

Pour servir un autre client :

1. Cliquez sur **⏸️ Mettre en attente**
2. Donnez un nom (ex: "Client table 5")
3. La vente est sauvegardée
4. Pour reprendre : Cliquez sur **📋 En attente** et sélectionnez

## Appliquer une remise

### Remise sur un article

1. Cliquez sur l'article dans le panier
2. Cliquez sur **% Remise**
3. Entrez le pourcentage ou le montant
4. Validez

### Remise sur le total

1. Cliquez sur **Ajouter remise** sous le panier
2. Choisissez :
   - **Pourcentage** : Ex: 10%
   - **Montant fixe** : Ex: -2 000 FCFA
3. Validez

### Remise programmée

Les promotions actives sont appliquées automatiquement.

## Finaliser une vente

### Modes de paiement disponibles

| Mode | Configuration | Frais |
|------|---------------|-------|
| **Espèces** | Par défaut | Aucun |
| **Mobile Money** | Intégration requise | Variable |
| **Carte bancaire** | Intégration requise | Variable |
| **Virement** | Par défaut | Aucun |
| **Crédit** | Pour clients enregistrés | Aucun |

### Paiement espèces

1. Cliquez sur **✓ Valider**
2. Sélectionnez **Espèces**
3. Entrez le montant donné par le client
4. Le système calcule la monnaie à rendre
5. Cliquez sur **Confirmer**

### Paiement Mobile Money

1. Cliquez sur **✓ Valider**
2. Sélectionnez **Mobile Money**
3. Choisissez l'opérateur (Orange, MTN, Wave, M-Pesa)
4. Entrez le numéro du client
5. Cliquez sur **Envoyer la demande**
6. Attendez la confirmation
7. Cliquez sur **Confirmer**

### Paiement mixte

Pour combiner plusieurs modes :

1. Cliquez sur **✓ Valider**
2. Sélectionnez **Paiement mixte**
3. Ajoutez les modes un par un :
   - Espèces : 10 000 FCFA
   - Mobile Money : 8 500 FCFA
4. Vérifiez que le total = montant dû
5. Confirmez

### Vente à crédit

Pour les clients avec compte :

1. Cliquez sur **✓ Valider**
2. Sélectionnez **Crédit**
3. Choisissez le client
4. Le montant est ajouté à son solde
5. Confirmez

## Impression du ticket

### Configuration de l'imprimante

**Paramètres > POS > Imprimante**

Types supportés :
- **Imprimante thermique** (ESC/POS)
- **Imprimante Bluetooth**
- **Imprimante réseau**

### Impression automatique

Le ticket s'imprime automatiquement après chaque vente (si configuré).

### Impression manuelle

Après une vente :
1. Cliquez sur **🖨️ Réimprimer**
2. Sélectionnez le format :
   - Ticket (58mm ou 80mm)
   - A4 (facture complète)

### Envoyer par SMS/WhatsApp

1. Cliquez sur **📤 Partager**
2. Entrez le numéro
3. Sélectionnez le canal
4. Envoyez

## Mode hors-ligne

### Fonctionnement

Le mode hors-ligne permet de continuer à vendre sans connexion internet.

```
┌─────────────────────────────────────────────┐
│  🟢 En ligne                                │
│     ↓ Synchronisation en temps réel         │
│  🟡 Connexion instable                      │
│     ↓ Mise en cache, sync différée          │
│  🔴 Hors-ligne                              │
│     ↓ Ventes locales, sync au retour        │
└─────────────────────────────────────────────┘
```

### Données disponibles hors-ligne

| Données | Disponibilité |
|---------|---------------|
| Produits (catalogue) | ✅ |
| Prix | ✅ |
| Clients | ✅ |
| Ventes | ✅ (stockées localement) |
| Paiements en ligne | ❌ |
| Mises à jour prix | ❌ |

### Indicateur de connexion

- 🟢 **En ligne** : Tout fonctionne
- 🟡 **Instable** : Synchronisation différée
- 🔴 **Hors-ligne** : Mode local actif

### Synchronisation

Quand la connexion revient :
1. Les ventes sont automatiquement envoyées
2. Les stocks sont mis à jour
3. Une notification confirme la synchronisation

## Gestion des caisses

### Ouverture de caisse

1. **POS > Caisse > Ouvrir**
2. Entrez le montant initial (fonds de caisse)
3. Confirmez

### Clôture de caisse

En fin de journée :

1. **POS > Caisse > Clôturer**
2. Comptez les espèces
3. Entrez le montant compté
4. Le système calcule l'écart :
   ```
   Théorique : 250 000 FCFA
   Compté    : 248 500 FCFA
   Écart     : -1 500 FCFA
   ```
5. Expliquez l'écart si nécessaire
6. Validez la clôture

### Rapport de caisse

**POS > Caisse > Rapport**

| Élément | Montant |
|---------|---------|
| Fond de caisse | 50 000 |
| Espèces | 180 000 |
| Mobile Money | 65 000 |
| Carte | 45 000 |
| **Total** | **340 000** |
| Retraits | -20 000 |
| **Net** | **320 000** |

## Retours et remboursements

### Effectuer un retour

1. **POS > Retours > Nouveau retour**
2. Recherchez la vente (par numéro ou date)
3. Sélectionnez les articles à reprendre
4. Choisissez le mode de remboursement :
   - Espèces
   - Avoir
   - Échange
5. Validez

### Échange

1. Effectuez le retour
2. Choisissez **Échange**
3. Ajoutez les nouveaux articles
4. Ajustez le différentiel si nécessaire

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `F1` | Aide |
| `F2` | Nouvelle vente |
| `F3` | Recherche produit |
| `F4` | Scanner |
| `F5` | Paiement |
| `F6` | Mettre en attente |
| `F7` | Reprendre attente |
| `F8` | Annuler vente |
| `F9` | Remise |
| `F10` | Clôturer caisse |
| `Esc` | Annuler / Retour |

## Configuration du POS

### Paramètres généraux

**Paramètres > POS > Général**

| Option | Description |
|--------|-------------|
| **Magasin par défaut** | Point de vente actif |
| **Devise** | XOF, XAF, NGN, etc. |
| **Taxe incluse** | Prix TTC affichés |
| **Imprimer auto** | Ticket après vente |
| **Scanner sonore** | Bip à la lecture |

### Apparence

**Paramètres > POS > Apparence**

- Taille des tuiles produits
- Couleurs des catégories
- Mode sombre/clair
- Colonnes de la grille

### Taxes

**Paramètres > POS > Taxes**

Configurez les taux de TVA applicables :
- Exonéré (0%)
- Taux réduit (ex: 9%)
- Taux normal (ex: 18%)

---

[← Comptabilité OHADA](../facturepro/accounting.md) | [Gérer l'inventaire →](./inventory.md)
