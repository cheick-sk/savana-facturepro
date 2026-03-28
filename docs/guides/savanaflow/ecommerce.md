# Boutique en Ligne (E-commerce)

Ce guide vous explique comment créer et gérer votre boutique en ligne avec SavanaFlow E-commerce.

## Vue d'ensemble

SavanaFlow E-commerce vous permet de créer une boutique en ligne intégrée à votre point de vente, avec synchronisation automatique des stocks et des commandes.

## Activer la boutique

### Configuration initiale

**E-commerce > Configuration > Activer**

1. **Nom de la boutique** - Apparaît sur le site
2. **Domaine** - Votre boutique sera accessible à :
   - `votre-boutique.saasafrica.com`
   - Ou votre propre domaine (optionnel)
3. **Devise** - XOF, XAF, NGN, etc.
4. **Langues** - Français, Anglais

### Personnalisation

**E-commerce > Configuration > Apparence**

| Élément | Personnalisable |
|---------|-----------------|
| **Logo** | Logo de votre boutique |
| **Couleurs** | Couleur principale, secondaire |
| **Bannière** | Image d'en-tête |
| **Police** | Style de texte |
| **Favicon** | Icône du site |

## Gérer les produits

### Publier un produit

**E-commerce > Produits > Publier**

Tous vos produits SavanaFlow sont disponibles. Pour les publier en ligne :

1. Sélectionnez le produit
2. Activez **"Visible en ligne"**
3. Complétez les informations web :
   - **Description web** - Description marketing
   - **Images supplémentaires** - Galerie photos
   - **Tags** - Pour la recherche
   - **Meta description** - Pour le SEO

### Gestion des stocks en ligne

**E-commerce > Produits > Stock**

| Option | Description |
|--------|-------------|
| **Synchroniser** | Stock = Stock POS |
| **Stock dédié** | Stock séparé pour le web |
| **Illimité** | Toujours disponible |

### Prix spécifiques

**E-commerce > Produits > Prix**

- **Prix web** - Différent du prix magasin
- **Promotion** - Prix et dates de promotion
- **Multipack** - Prix pour lots (2 pour X, 3 pour Y)

## Catégories et navigation

### Organiser les catégories

**E-commerce > Catégories**

Les catégories POS sont automatiquement disponibles. Vous pouvez :

- Réorganiser l'ordre d'affichage
- Masquer certaines catégories
- Créer des catégories web uniquement

### Menu de navigation

**E-commerce > Navigation**

Créez votre menu principal :
1. Ajoutez des liens vers :
   - Catégories
   - Pages (À propos, Contact)
   - URLs personnalisées
2. Organisez l'ordre
3. Créez des sous-menus

## Gérer les commandes

### Tableau de bord des commandes

**E-commerce > Commandes**

| Statut | Description | Action |
|--------|-------------|--------|
| **Nouvelle** | Commande reçue | À traiter |
| **Confirmée** | Validée | Préparer |
| **En préparation** | En cours de préparation | Emballer |
| **Prête** | Prête pour livraison/retir | Notifier client |
| **Expédiée** | Colis envoyé | Fournir tracking |
| **Livrée** | Reçue par le client | Clôturer |
| **Annulée** | Commande annulée | Rembourser |

### Traiter une commande

1. **Sélectionnez la commande**
2. Vérifiez les articles et l'adresse
3. Cliquez sur **Confirmer**
4. Préparez la commande
5. Mettez à jour le statut à chaque étape
6. **Marquez comme expédiée** avec les infos de livraison

### Notification client

Les clients reçoivent automatiquement :
- Email de confirmation de commande
- Email d'expédition avec tracking
- Notification de livraison

## Livraison

### Zones de livraison

**E-commerce > Livraison > Zones**

Créez des zones géographiques :

| Zone | Description |
|------|-------------|
| **Abidjan Centre** | Plateau, Cocody, Treichville |
| **Abidjan Périphérie** | Abobo, Yopougon, Bingerville |
| **Intérieur** | Autres villes |

### Méthodes de livraison

**E-commerce > Livraison > Méthodes**

| Méthode | Description | Tarification |
|---------|-------------|--------------|
| **Retrait magasin** | Le client vient chercher | Gratuit |
| **Livraison standard** | 24-48h | Tarif par zone |
| **Livraison express** | 2-4h | Tarif majoré |
| **Point relais** | Livraison en point de retrait | Tarif fixe |

### Configurer les tarifs

Pour chaque zone et méthode :

1. **Frais fixes** : Ex: 1 500 FCFA
2. **Gratuité** : À partir de X FCFA d'achat
3. **Poids** : Selon le poids total

## Paiements en ligne

### Moyens de paiement

**E-commerce > Paiement > Méthodes**

| Méthode | Configuration |
|---------|---------------|
| **Paiement à la livraison** | Par défaut |
| **Mobile Money** | Via CinetPay, Paystack |
| **Carte bancaire** | Via intégration |
| **Virement** | Instructions bancaires |
| **Crédit** | Pour clients enregistrés |

### Configurer CinetPay

1. **E-commerce > Paiement > CinetPay**
2. Entrez vos identifiants API
3. Activez les moyens souhaités :
   - Orange Money
   - MTN MoMo
   - Wave
   - Cartes bancaires
4. Testez en mode sandbox

## Promotions et réductions

### Créer une promotion

**E-commerce > Promotions > Nouvelle**

#### Types de promotions

| Type | Exemple |
|------|---------|
| **Pourcentage** | -20% sur tout le site |
| **Montant fixe** | -5 000 FCFA dès 50 000 FCFA |
| **Produit offert** | 1 produit offert pour 2 achetés |
| **Livraison gratuite** | Livraison offerte dès X FCFA |

#### Configuration

1. **Nom** de la promotion
2. **Type** et **valeur**
3. **Conditions** :
   - Montant minimum
   - Catégories éligibles
   - Clients éligibles (nouveaux, fidèles)
4. **Dates** de validité
5. **Code promo** (optionnel)
6. Activez

### Codes promotionnels

**E-commerce > Promotions > Codes**

Créez des codes personnalisés :
- **REMISE20** : -20%
- **BIENVENUE** : -10% nouveaux clients
- **LIVRAISON** : Livraison gratuite

## Pages de contenu

### Créer une page

**E-commerce > Pages > Nouvelle**

Pages utiles :
- **À propos** - Présentation de votre boutique
- **Contact** - Coordonnées et formulaire
- **CGV** - Conditions générales de vente
- **FAQ** - Questions fréquentes
- **Mentions légales** - Informations légales

### Éditeur de contenu

Utilisez l'éditeur visuel pour :
- Texte formaté
- Images
- Vidéos intégrées
- Boutons

## SEO et visibilité

### Optimisation SEO

**E-commerce > SEO**

| Élément | Configuration |
|---------|---------------|
| **Titre du site** | Balise title |
| **Description** | Meta description |
| **Mots-clés** | Mots-clés principaux |
| **URL canonique** | Pour éviter le duplicate content |

### SEO par produit

Pour chaque produit :
- **Titre SEO** - Optimisé pour la recherche
- **Meta description** - Résumé attrayant
- **URL personnalisée** - `produit/nom-du-produit`
- **Texte alternatif images** - Description pour les moteurs

### Intégration réseaux sociaux

**E-commerce > Intégrations > Social**

- Facebook Pixel
- Google Analytics
- Partage social (Open Graph)

## Clients et comptes

### Inscription client

Les clients peuvent créer un compte pour :
- Suivre leurs commandes
- Sauvegarder leurs adresses
- Accumuler des points de fidélité
- Accéder à des offres exclusives

### Gestion des clients

**E-commerce > Clients**

- Historique des commandes
- Adresse de livraison par défaut
- Préférences
- Points de fidélité

## Analytics

### Tableau de bord

**E-commerce > Analytics**

| Métrique | Description |
|----------|-------------|
| **Visites** | Nombre de visiteurs |
| **Taux de conversion** | % de visiteurs qui achètent |
| **Panier moyen** | Montant moyen par commande |
| **CA web** | Chiffre d'affaires en ligne |
| **Produits populaires** | Meilleures ventes |

### Rapports

- **Ventes par période**
- **Produits les plus vendus**
- **Sources de trafic**
- **Paniers abandonnés**

## Applications mobiles

### Application iOS/Android

Vos clients peuvent télécharger votre boutique :
- App Store
- Google Play

**E-commerce > Application mobile > Configuration**

- Logo et couleurs
- Notifications push
- Liens de téléchargement

## Support client

### Chat en ligne

**E-commerce > Support > Chat**

Intégrez un widget de chat :
- WhatsApp Business
- Tawk.to
- Crisp
- Intercom

### Formulaire de contact

Les messages sont accessibles dans :
**E-commerce > Support > Messages**

---

[← Gérer l'inventaire](./inventory.md) | [Programme de fidélité →](./loyalty.md)
