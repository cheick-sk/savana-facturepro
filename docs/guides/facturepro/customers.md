# Gestion des Clients

Ce guide vous explique comment gérer efficacement votre base de clients dans FacturePro Africa.

## Vue d'ensemble

La gestion des clients centralise toutes les informations de vos contacts commerciaux et facilite le suivi de vos relations d'affaires.

## Liste des clients

### Accès

**Menu principal > Clients**

### Interface

La liste affiche pour chaque client :

| Colonne | Information |
|---------|-------------|
| **Nom** | Raison sociale ou nom complet |
| **Email** | Adresse email principale |
| **Téléphone** | Numéro de téléphone |
| **Solde** | Montant dû total |
| **Statut** | Actif / Inactif |
| **Dernière facture** | Date de la dernière facture |

### Filtres disponibles

- **Tous** - Tous les clients
- **Actifs** - Clients avec factures récentes
- **Inactifs** - Sans activité depuis 6 mois
- **Avec solde** - Clients ayant un impayé
- **Par catégorie** - Si vous utilisez les catégories

### Recherche

Utilisez la barre de recherche pour trouver un client par :
- Nom
- Email
- Téléphone
- Numéro fiscal

## Créer un client

### Formulaire complet

**Clients > Nouveau client**

#### Informations générales

| Champ | Requis | Description |
|-------|--------|-------------|
| **Type** | ✅ | Particulier ou Entreprise |
| **Nom** | ✅ | Nom complet ou raison sociale |
| **Email** | ✅ | Pour l'envoi des documents |
| **Téléphone** | ❌ | Format international recommandé |
| **Site web** | ❌ | URL du site web |

#### Adresse

| Champ | Description |
|-------|-------------|
| **Adresse** | Rue, numéro, quartier |
| **Ville** | Ville |
| **Région/État** | Province ou région |
| **Pays** | Pays (défaut: votre pays) |
| **Code postal** | Code postal |

#### Informations fiscales

| Champ | Description |
|-------|-------------|
| **Numéro IF** | Identifiant Fiscal |
| **Numéro RC** | Registre du Commerce |
| **Numéro TVA** | Si assujetti |
| **Régime fiscal** | Normal, Simplifié, Franchise |

#### Paramètres de facturation

| Paramètre | Options |
|-----------|---------|
| **Délai de paiement** | Par défaut, 7j, 14j, 30j, 45j, 60j |
| **Taux de remise** | Remise automatique |
| **Devise préférée** | XOF, EUR, USD, etc. |
| **Notes** | Informations internes |

### Création rapide

Lors de la création d'une facture :
1. Cliquez sur **"+ Nouveau client"**
2. Remplissez le minimum (nom, email)
3. Le client est créé et sélectionné

⚠️ Pensez à compléter les informations plus tard.

## Gérer un client

### Fiche client

Cliquez sur un client pour accéder à sa fiche :

#### Onglet "Informations"

Toutes les données du client, modifiables à tout moment.

#### Onglet "Factures"

Historique des factures :
- Numéro et date
- Montant TTC
- Statut (Payé, En attente, Annulé)
- Lien vers la facture

#### Onglet "Paiements"

Historique des paiements :
- Date
- Montant
- Mode de paiement
- Facture associée

#### Onglet "Documents"

Tous les documents associés :
- Factures
- Devis
- Avoirs
- Contrats

#### Onglet "Activité"

Journal d'activité :
- Connexions au portail client
- Emails envoyés
- Paiements reçus
- Actions effectuées

### Modifier un client

1. Ouvrez la fiche client
2. Cliquez sur **"Modifier"**
3. Apportez vos modifications
4. Cliquez sur **"Sauvegarder"**

### Archiver un client

L'archivage masque le client sans supprimer les données :

1. Ouvrez la fiche client
2. Cliquez sur **"Archiver"**
3. Confirmez

Le client n'apparaît plus dans la liste active mais reste accessible dans "Archivés".

### Supprimer un client

⚠️ Un client ne peut être supprimé que s'il n'a aucune facture associée.

1. Ouvrez la fiche client
2. Cliquez sur **"Supprimer"**
3. Confirmez

## Catégories de clients

### Pourquoi utiliser les catégories ?

- Segmenter votre clientèle
- Appliquer des tarifs différenciés
- Générer des rapports par segment
- Cibler les communications

### Créer des catégories

**Paramètres > Clients > Catégories**

| Champ | Description |
|-------|-------------|
| **Nom** | Nom de la catégorie |
| **Description** | Description interne |
| **Couleur** | Pour identification visuelle |
| **Remise par défaut** | Remise automatique |

### Assigner une catégorie

1. Ouvrez la fiche client
2. Sélectionnez la catégorie dans le menu déroulant
3. Sauvegardez

## Portail Client

### Présentation

Le portail client permet à vos clients de :
- Consulter leurs factures
- Télécharger les documents
- Effectuer des paiements en ligne
- Communiquer avec vous

### Activer le portail

**Paramètres > Portail client > Activer**

Pour chaque client, vous pouvez :
- Autoriser l'accès au portail
- Définir les permissions
- Envoyer les identifiants

### Permissions du portail

| Permission | Description |
|------------|-------------|
| **Voir les factures** | Consulter les factures |
| **Payer en ligne** | Effectuer des paiements |
| **Télécharger** | Télécharger les PDF |
| **Voir les devis** | Accéder aux devis |

### Invitation client

Pour inviter un client au portail :

1. Ouvrez la fiche client
2. Cliquez sur **"Inviter au portail"**
3. Le client reçoit un email avec ses identifiants

## Segmentation avancée

### Étiquettes (Tags)

Ajoutez des étiquettes pour un classement flexible :

1. Ouvrez la fiche client
2. Dans "Étiquettes", tapez et appuyez sur Entrée
3. Les étiquettes existantes sont proposées

Exemples d'étiquettes :
- "VIP"
- "Prospect"
- "Fournisseur"
- "Abonné"

### Champs personnalisés

**Paramètres > Clients > Champs personnalisés**

Ajoutez des champs spécifiques à votre activité :

| Type | Exemple |
|------|---------|
| **Texte** | Secteur d'activité |
| **Nombre** | Nombre d'employés |
| **Date** | Date de premier contact |
| **Liste** | Source (Bouche-à-oreille, Web, Salon) |
| **Case à cocher** | Newsletter acceptée |

## Import et Export

### Importer des clients

**Clients > Importer**

1. Téléchargez le modèle CSV
2. Remplissez vos données
3. Uploadez le fichier
4. Vérifiez l'aperçu
5. Confirmez l'import

#### Format CSV

```csv
nom,email,telephone,adresse,ville,pays
Entreprise ABC,contact@abc.com,+22507000000, Rue 12,Abidjan,Côte d'Ivoire
```

### Exporter les clients

**Clients > Exporter**

Formats disponibles :
- **CSV** - Pour import dans autre logiciel
- **Excel** - Pour analyse
- **vCard** - Pour import dans contacts

## Communication

### Envoyer un email

1. Ouvrez la fiche client
2. Cliquez sur **"Envoyer un email"**
3. Rédigez votre message
4. Envoyez

L'email est enregistré dans l'historique.

### Historique des communications

L'onglet "Activité" affiche :
- Emails envoyés
- SMS envoyés
- Messages WhatsApp
- Documents envoyés

## Rapports clients

### Rapports disponibles

| Rapport | Description |
|---------|-------------|
| **Balance âgée** | Répartition des impayés par ancienneté |
| **Top clients** | Clients par chiffre d'affaires |
| **Nouveaux clients** | Évolution des inscriptions |
| **Croissance** | Évolution du portefeuille |

### Accès

**Rapports > Clients**

Voir le guide [Rapports financiers](./reports.md) pour plus de détails.

## Bonnes pratiques

### Qualité des données

- ✅ Renseignez l'email (obligatoire pour l'envoi)
- ✅ Ajoutez le téléphone (pour SMS/WhatsApp)
- ✅ Complétez l'adresse (pour les livraisons)
- ✅ Mettez à jour régulièrement

### Segmentation

- ✅ Utilisez des catégories cohérentes
- ✅ Étiquetez les clients importants
- ✅ Créez des champs personnalisés utiles

### Suivi

- ✅ Consultez régulièrement les soldes
- ✅ Relancez les impayés rapidement
- ✅ Archivez les clients inactifs

---

[← Facturation](./invoicing.md) | [Suivre les paiements →](./payments.md)
