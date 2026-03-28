# Concepts Fondamentaux

Cette page présente les concepts clés de SaaS Africa pour vous aider à comprendre le fonctionnement de la plateforme.

## Architecture Multi-Tenant

### Qu'est-ce que le multi-tenant ?

Le multi-tenant (ou multi-locataire) est une architecture où une seule instance de l'application sert plusieurs organisations (tenants), tout en gardant leurs données strictement isolées.

```
┌─────────────────────────────────────────────┐
│              SaaS Africa Platform            │
├─────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Tenant A │ │ Tenant B │ │ Tenant C │    │
│  │ (Org 1)  │ │ (Org 2)  │ │ (Org 3)  │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│       ↓            ↓            ↓           │
│  ┌──────────────────────────────────────┐  │
│  │         Base de données partagée      │  │
│  │      (avec isolation par tenant_id)   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Isolation des données

Chaque organisation possède :

| Élément | Description |
|---------|-------------|
| **Tenant ID** | Identifiant unique pour isoler les données |
| **Utilisateurs** | Membres de l'organisation uniquement |
| **Données** | Factures, clients, produits, etc. privés |
| **Configuration** | Paramètres personnalisés |
| **Branding** | Logo, couleurs, modèles de documents |

### Avantages pour l'utilisateur

- **Confidentialité** : Vos données sont invisibles pour les autres organisations
- **Personnalisation** : Configuration adaptée à votre entreprise
- **Mise à jour** : Nouvelles fonctionnalités disponibles pour tous
- **Coût réduit** : Infrastructure partagée = tarifs accessibles

## Organisations et Utilisateurs

### Organisation

L'organisation est l'entité principale de votre compte :

- Représente votre entreprise, école ou commerce
- Possède une configuration unique
- Peut avoir plusieurs utilisateurs avec différents rôles
- Peut utiliser une ou plusieurs applications SaaS Africa

### Utilisateur

Un utilisateur est une personne ayant accès à une organisation :

```
Utilisateur
    ├── Email (identifiant unique)
    ├── Mot de passe
    ├── Profil (nom, photo)
    └── Appartenance à une ou plusieurs organisations
         └── Rôle dans chaque organisation
```

### Rôles et Permissions

#### Hiérarchie des rôles

| Rôle | Niveau | Description |
|------|--------|-------------|
| **Propriétaire** | Max | Créateur de l'organisation, accès complet |
| **Admin** | Élevé | Gestion complète, y compris utilisateurs |
| **Manager** | Moyen | Gestion des données, accès aux rapports |
| **Employé** | Bas | Opérations quotidiennes, lecture limitée |
| **Consultant** | Min | Accès en lecture seule |

#### Matrice des permissions

| Action | Propriétaire | Admin | Manager | Employé |
|--------|:------------:|:-----:|:-------:|:-------:|
| Gérer les utilisateurs | ✅ | ✅ | ❌ | ❌ |
| Configurer l'organisation | ✅ | ✅ | ❌ | ❌ |
| Voir tous les rapports | ✅ | ✅ | ✅ | ❌ |
| Créer des factures | ✅ | ✅ | ✅ | ✅ |
| Supprimer des données | ✅ | ✅ | ✅ | ❌ |
| Exporter les données | ✅ | ✅ | ✅ | ❌ |

## Workflow des Documents

### Cycle de vie d'une facture (FacturePro)

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Brouil │───▶│  Envoyé │───▶│ Partiel │───▶│   Payé  │
│   lon   │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │
     │              ▼
     │         ┌─────────┐
     └────────▶│ Annulé  │
               │         │
               └─────────┘
```

#### Statuts détaillés

| Statut | Description | Actions possibles |
|--------|-------------|-------------------|
| **Brouillon** | En cours de création | Modifier, Supprimer, Envoyer |
| **Envoyé** | Transmis au client | Relancer, Marquer payé, Annuler |
| **Partiel** | Partiellement payé | Enregistrer paiement, Relancer |
| **Payé** | Paiement complet | Aucune action |
| **Annulé** | Annulé | Restaurer en brouillon |

### Workflow de commande (SavanaFlow)

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Panier  │───▶│ Validée │───▶│ En cours│───▶│ Prête   │───▶│ Livrée  │
│         │    │         │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                    │
                    ▼
               ┌─────────┐
               │ Annulée │
               │         │
               └─────────┘
```

### Statuts de présence (SchoolFlow)

| Statut | Signification | Impact |
|--------|---------------|--------|
| **Présent** | Élève présent | - |
| **Absent** | Absence non justifiée | Comptabilisé |
| **Absence justifiée** | Absence avec motif | Ne compte pas |
| **Retard** | Arrivée en retard | Signalé aux parents |
| **Dispensé** | Excusé pour la séance | Ne compte pas |

## Synchronisation et Mode Hors-ligne

### Fonctionnement

Les applications mobiles SaaS Africa fonctionnent en mode hybride :

```
┌─────────────────┐         ┌─────────────────┐
│   App Mobile    │◀───────▶│   Serveur API   │
│                 │  Sync   │                 │
│  ┌───────────┐  │         │  ┌───────────┐  │
│  │  Local DB │  │         │  │  Cloud DB │  │
│  │ (SQLite)  │  │         │  │ (Postgres)│  │
│  └───────────┘  │         │  └───────────┘  │
└─────────────────┘         └─────────────────┘
```

### Données synchronisées

| Type | Direction | Fréquence |
|------|-----------|-----------|
| Clients | Bidirectionnelle | Temps réel |
| Produits | Serveur → Mobile | À la connexion |
| Ventes | Mobile → Serveur | Immédiat si online |
| Inventaire | Bidirectionnelle | Après chaque opération |

### Résolution des conflits

En cas de conflit entre données locales et serveur :

1. **Timestamp** - La donnée la plus récente gagne
2. **Notification** - L'utilisateur est informé
3. **Historique** - Les deux versions sont conservées

## Comptabilité OHADA

### Qu'est-ce que OHADA ?

L'OHADA (Organisation pour l'Harmonisation en Afrique du Droit des Affaires) établit des normes comptables uniformisées pour 17 pays africains.

### Plan comptable OHADA

SaaS Africa intègre le plan comptable OHADA par défaut :

| Classe | Type de comptes |
|---------|-----------------|
| 1 | Capitaux |
| 2 | Immobilisations |
| 3 | Stocks |
| 4 | Tiers (clients, fournisseurs) |
| 5 | Trésorerie |
| 6 | Charges |
| 7 | Produits |
| 8 | Comptes de gestion |

### Écritures automatiques

Chaque opération génère automatiquement les écritures comptables :

```
Vente: 100 000 FCFA (TTC)
├── Débit: 411 Clients - 100 000
├── Crédit: 701 Ventes - 91 743
└── Crédit: 4431 TVA collectée - 8 257
```

## Intégrations de Paiement

### Fonctionnement des paiements

```
┌─────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────┐
│ Facture │─────▶│ SaaS Africa │─────▶│  CinetPay/  │─────▶│ Mobile  │
│         │      │   Gateway   │      │  Paystack   │      │  Money  │
└─────────┘      └─────────────┘      └─────────────┘      └─────────┘
                        │                    │
                        │     ┌──────────────┘
                        ▼     ▼
                   ┌─────────────┐
                   │ Webhook:    │
                   │ Paiement    │
                   │ confirmé    │
                   └─────────────┘
```

### Statuts de paiement

| Statut | Description |
|--------|-------------|
| **En attente** | Lien de paiement généré |
| **En cours** | Client sur la page de paiement |
| **Réussi** | Paiement confirmé |
| **Échoué** | Transaction rejetée |
| **Remboursé** | Montant retourné au client |

## API et Webhooks

### Architecture de l'API

L'API REST de SaaS Africa suit les principes RESTful :

- **Base URL**: `https://api.saasafrica.com/{app}/api/v1/`
- **Authentification**: Bearer Token ou API Key
- **Format**: JSON
- **Versioning**: Via l'URL (v1)

### Structure des endpoints

```
GET    /invoices           # Liste des factures
POST   /invoices           # Créer une facture
GET    /invoices/{id}      # Détails d'une facture
PUT    /invoices/{id}      # Modifier une facture
DELETE /invoices/{id}      # Supprimer une facture
```

### Webhooks

Les webhooks notifient votre système des événements :

```
Événement (ex: payment.received)
    │
    ▼
┌─────────────────────────────────────┐
│ POST vers votre URL configurée       │
│ {                                   │
│   "event": "payment.received",      │
│   "data": { ... },                  │
│   "timestamp": "2024-01-15T10:00Z"  │
│ }                                   │
└─────────────────────────────────────┘
```

## Sécurité

### Authentification

| Méthode | Usage | Sécurité |
|---------|-------|----------|
| **Mot de passe** | Interface web | Hachage bcrypt |
| **2FA** | Optionnel, recommandé | TOTP (Google Authenticator) |
| **API Key** | Intégrations | Scopes limités, rotation possible |
| **JWT** | Sessions | Expiration configurable |

### Protection des données

- **Chiffrement** : TLS 1.3 en transit, AES-256 au repos
- **Sauvegardes** : Quotidiennes, rétention 30 jours
- **Audit** : Logs d'accès conservés 90 jours
- **RGPD** : Export et suppression sur demande

## Limites et Quotas

### Quotas par plan

| Ressource | Starter | Pro | Business |
|-----------|---------|-----|----------|
| Factures/mois | 10 | Illimité | Illimité |
| Produits | 100 | 5 000 | Illimité |
| Utilisateurs | 2 | 10 | Illimité |
| Stockage fichiers | 100 MB | 5 GB | 50 GB |
| Appels API/heure | 1 000 | 5 000 | 20 000 |

---

[← Guide de démarrage rapide](./quick-start.md) | [Guides par application →](../guides/facturepro/invoicing.md)
