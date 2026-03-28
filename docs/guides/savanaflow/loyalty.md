# Programme de Fidélité

Ce guide vous explique comment créer et gérer un programme de fidélité pour récompenser vos clients avec SavanaFlow.

## Vue d'ensemble

Le programme de fidélité vous permet de récompenser vos clients réguliers, d'augmenter la rétention et de stimuler les ventes.

## Configuration

### Activer le programme de fidélité

**Fidélité > Configuration > Activer**

### Paramètres généraux

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| **Nom du programme** | Nom affiché aux clients | "Club Fidélité" |
| **Taux de conversion** | Points par montant dépensé | 1 point = 100 FCFA |
| **Valeur du point** | Valeur en FCFA lors de l'utilisation | 1 point = 10 FCFA |
| **Points minimum** | Seuil minimum pour utiliser | 100 points |

### Règles d'attribution

**Fidélité > Configuration > Règles**

| Action | Points attribués |
|--------|------------------|
| Achat standard | 1 pt / 100 FCFA |
| Premier achat | Bonus +50 pts |
| Anniversaire | Bonus +100 pts |
| Parrainage | Bonus +200 pts |
| Avis produit | Bonus +20 pts |

## Inscription des clients

### Inscription automatique

Tous les clients sont automatiquement inscrits lors de leur premier achat (si activé).

### Inscription manuelle

**Fidélité > Clients > Inscrire**

1. Recherchez le client
2. Cliquez sur **Inscrire au programme**
3. Attribuez des points de bienvenue

### Carte de fidélité

#### Carte virtuelle

Chaque client reçoit :
- Numéro de carte unique
- QR code personnel
- Accès via l'app mobile

#### Carte physique

Pour imprimer des cartes physiques :

1. **Fidélité > Cartes > Générer**
2. Nombre de cartes
3. Format (CR80 standard)
4. Téléchargez le fichier PDF
5. Faites imprimer

## Enregistrement des points

### Attribution automatique

Les points sont attribués automatiquement lors :
- D'un achat au POS
- D'une commande en ligne
- D'un parrainage validé

### Attribution manuelle

**Fidélité > Clients > [Client] > Ajouter des points**

1. Entrez le nombre de points
2. Sélectionnez le motif :
   - Compensation
   - Bonus exceptionnel
   - Correction
3. Ajoutez un commentaire
4. Validez

### Scanner la carte

Au POS :

1. Cliquez sur **Scan fidélité** (ou `L`)
2. Scannez le QR code du client
3. Le compte est affiché
4. Les points sont automatiquement calculés à la validation

## Utilisation des points

### Au POS

1. Identifiez le client (scan ou recherche)
2. Validez la vente
3. Avant le paiement, cliquez sur **Utiliser les points**
4. Entrez le montant en points
5. La réduction est appliquée

### En ligne

1. Le client se connecte
2. Au panier, il voit ses points disponibles
3. Il peut les utiliser comme réduction
4. Les points sont débités

### Conversion automatique

Option : Conversion automatique à partir d'un seuil
- Si le client a 500+ points
- Proposition automatique d'utilisation

## Niveaux de fidélité

### Créer des niveaux

**Fidélité > Niveaux**

| Niveau | Points requis | Avantages |
|--------|---------------|-----------|
| **Bronze** | 0 - 499 | 1 pt / 100 FCFA |
| **Argent** | 500 - 1 999 | 1.5 pt / 100 FCFA |
| **Or** | 2 000 - 4 999 | 2 pts / 100 FCFA + -5% |
| **Platine** | 5 000+ | 3 pts / 100 FCFA + -10% + livraison gratuite |

### Progression

- Les clients progressent automatiquement
- Notification lorsqu'ils changent de niveau
- Les avantages s'appliquent immédiatement

## Récompenses

### Types de récompenses

**Fidélité > Récompenses > Nouvelle**

| Type | Description |
|------|-------------|
| **Réduction** | X% ou X FCFA de réduction |
| **Produit gratuit** | Produit offert |
| **Livraison gratuite** | Sur la prochaine commande |
| **Accès VIP** | Ventes privées, avant-premières |

### Configurer une récompense

1. **Nom** de la récompense
2. **Type** de récompense
3. **Coût en points**
4. **Conditions** :
   - Niveau minimum
   - Validité
   - Utilisation unique/multiple
5. Activez

### Échange de points

Le client peut échanger ses points :
- Au POS : Demande au vendeur
- En ligne : Dans son espace client
- Application : Section récompenses

## Parrainage

### Configuration

**Fidélité > Parrainage > Configuration**

| Paramètre | Valeur |
|-----------|--------|
| **Bonus parrain** | 200 points |
| **Bonus filleul** | 100 points |
| **Condition** | Premier achat du filleul |
| **Limite** | Illimité |

### Fonctionnement

1. Le client partage son lien/code de parrainage
2. Le filleul crée un compte avec le code
3. À son premier achat :
   - Le parrain reçoit ses points
   - Le filleul reçoit ses points

### Suivi des parrainages

**Fidélité > Parrainage > Historique**

- Liste des parrainages
- Statut (en attente, validé)
- Points attribués

## Campagnes promotionnelles

### Campagne de points bonus

**Fidélité > Campagnes > Nouvelle**

1. **Nom** de la campagne
2. **Type** :
   - Double points
   - Triple points
   - Points bonus fixe
3. **Période**
4. **Produits/catégories éligibles**
5. Activez

### Exemples de campagnes

| Occasion | Campagne | Période |
|----------|----------|---------|
| Soldes | Double points | 2 semaines |
| Anniversaire boutique | Triple points | 1 semaine |
| Lancement produit | +200 pts/achat | 1 mois |
| Journée de la femme | Points x2 pour les femmes | 1 jour |

## Communication

### Notifications automatiques

| Événement | Notification |
|-----------|--------------|
| Inscription | Bienvenue + points offerts |
| Gain de points | "Vous avez gagné X points" |
| Changement de niveau | "Vous êtes passé Niveau X" |
| Points qui expirent | "Vos points expirent dans X jours" |
| Récompense disponible | "Vous pouvez échanger X points" |

### Canaux

- Email
- SMS
- WhatsApp
- Push notification (app)

### Personnalisation

**Fidélité > Communication > Modèles**

Personnalisez les messages avec :
- `{client}` - Nom du client
- `{points}` - Solde de points
- `{niveau}` - Niveau actuel
- `{lien}` - Lien vers l'espace client

## Rapports et analyse

### Tableau de bord

**Fidélité > Tableau de bord**

| KPI | Description |
|-----|-------------|
| **Membres actifs** | Clients avec au moins 1 achat ce mois |
| **Points émis** | Points attribués ce mois |
| **Points utilisés** | Points échangés ce mois |
| **Taux de rétention** | % de clients fidèles vs nouveaux |
| **CA généré par les membres** | % du CA total |

### Rapports détaillés

| Rapport | Description |
|---------|-------------|
| **Évolution des membres** | Graphique d'inscription |
| **Distribution par niveau** | Pyramide des niveaux |
| **Programme le plus utilisé** | Top récompenses |
| **ROI du programme** | Impact sur les ventes |

## Expiration des points

### Configuration

**Fidélité > Configuration > Expiration**

| Paramètre | Option |
|-----------|--------|
| **Durée de validité** | 12 mois, 24 mois, illimité |
| **Règle** | FIFO (premiers entrés, premiers sortis) |
| **Notification** | 30 jours avant expiration |

### Gestion des expirations

**Fidélité > Points > Expiration**

- Liste des points qui expirent
- Possibilité d'extension manuelle
- Historique des expirations

## Intégration POS

### Raccourcis

| Touche | Action |
|--------|--------|
| `L` | Scanner carte fidélité |
| `Alt + L` | Rechercher client |
| `Ctrl + P` | Utiliser les points |

### Affichage client

Après identification :
- Nom du client
- Niveau actuel
- Solde de points
- Récompenses disponibles

## Bonnes pratiques

### Lancement

- ✅ Communiquez sur le programme (in-store, social media)
- ✅ Offrez des points de bienvenue
- ✅ Formez votre équipe

### Gestion quotidienne

- ✅ Identifiez systématiquement les clients
- ✅ Rappelez les avantages
- ✅ Proposez l'utilisation des points

### Optimisation

- ✅ Analysez les données régulièrement
- ✅ Ajustez les règles selon les résultats
- ✅ Créez des campagnes saisonnières
- ✅ Récompensez les comportements souhaités

---

[← Boutique en ligne](./ecommerce.md) | [Guides SchoolFlow →](../schoolflow/students.md)
