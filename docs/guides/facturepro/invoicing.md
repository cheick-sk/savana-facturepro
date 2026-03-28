# Facturation avec FacturePro

Ce guide vous explique comment créer, personnaliser et gérer vos factures avec FacturePro Africa.

## Vue d'ensemble

FacturePro vous permet de créer des factures professionnelles conformes aux normes africaines, avec support multi-devises et intégration Mobile Money.

## Créer une facture

### Accès

**Menu principal > Factures > Nouvelle facture**

### Étape 1 : Sélectionner un client

#### Client existant

1. Cliquez sur le champ **Client**
2. Tapez le nom ou l'email pour rechercher
3. Sélectionnez le client dans la liste

#### Nouveau client

1. Cliquez sur **"+ Créer un client"**
2. Remplissez les informations :

| Champ | Requis | Description |
|-------|--------|-------------|
| Nom | ✅ | Nom complet ou raison sociale |
| Email | ✅ | Pour l'envoi de la facture |
| Téléphone | ❌ | Pour notifications SMS/WhatsApp |
| Adresse | ❌ | Adresse de facturation |
| Numéro fiscal | ❌ | IF, NIF, etc. |

### Étape 2 : Ajouter des lignes

#### Produit/Service existant

1. Cliquez sur **"Ajouter une ligne"**
2. Sélectionnez le produit/service
3. Ajustez la quantité
4. Le prix et la TVA sont pré-remplis

#### Nouveau produit/service

1. Cliquez sur **"Ajouter une ligne"** > **"Nouveau produit"**
2. Remplissez :

| Champ | Description |
|-------|-------------|
| Désignation | Description du produit/service |
| Prix unitaire | Prix hors taxes |
| Unité | Pièce, Heure, Jour, Kg, etc. |
| TVA | Taux applicable (0%, 18%, etc.) |
| Catégorie | Pour le suivi comptable |

### Étape 3 : Configurer les options

#### Remises

| Type | Description | Exemple |
|------|-------------|---------|
| **Pourcentage** | Remise sur le total HT | 10% = -10 000 FCFA |
| **Montant fixe** | Réduction en valeur | -5 000 FCFA |

Pour appliquer une remise :
1. Cliquez sur **"Ajouter une remise"**
2. Choisissez le type et la valeur
3. La remise apparaît sur la facture

#### Échéance

Par défaut : 30 jours après la date de facture.

Options disponibles :
- **Immédiat** - Paiement à réception
- **7 jours** - Net 7
- **14 jours** - Net 14
- **30 jours** - Net 30 (défaut)
- **45 jours** - Net 45
- **60 jours** - Net 60
- **Personnalisé** - Date spécifique

#### Notes et conditions

- **Note privée** : Visible uniquement par vous
- **Note publique** : Apparaît sur la facture
- **Conditions** : Termes de paiement

### Étape 4 : Finaliser

1. **Vérifiez** l'aperçu
2. Cliquez sur **"Créer"** pour enregistrer
3. Ou **"Créer et envoyer"** pour envoyer immédiatement

## Personnaliser les factures

### Modèles de facture

**Paramètres > Modèles > Facture**

#### Éléments personnalisables

| Élément | Options |
|---------|---------|
| **Logo** | Position, taille |
| **Couleurs** | En-tête, bordures, texte |
| **Police** | Type, taille |
| **Disposition** | Colonnes, marges |
| **Pied de page** | Mentions légales, coordonnées bancaires |

#### Créer un modèle personnalisé

1. Allez dans **Paramètres > Modèles**
2. Cliquez sur **"Nouveau modèle"**
3. Choisissez un modèle de base
4. Personnalisez chaque section
5. Prévisualisez et sauvegardez

### Numérotation automatique

**Paramètres > Facturation > Numérotation**

#### Format du numéro

```
{PREFIX}-{YEAR}-{SEQUENCE}
```

Exemples :
- `FAC-2024-0001` - Format standard
- `INV-{CLIENT}-{SEQ}` - Avec code client
- `{YY}-{MM}-{SEQ}` - Année-Mois-Numéro

#### Configuration

| Paramètre | Description |
|-----------|-------------|
| Préfixe | Début du numéro (FAC, INV, FACTURE) |
| Séquence | Numéro auto-incrémenté |
| Remise à zéro | Annuelle, mensuelle, jamais |
| Prochain numéro | Forcer le prochain numéro |

## Envoyer les factures

### Envoi par email

1. Ouvrez la facture
2. Cliquez sur **"Envoyer"**
3. Vérifiez/adaptez le message :
   ```
   Objet: Facture FAC-2024-0001 - [Votre entreprise]
   
   Bonjour [Client],
   
   Veuillez trouver ci-joint la facture FAC-2024-0001 
   d'un montant de 150 000 FCFA.
   
   Échéance: 15/02/2024
   
   Cordialement,
   [Votre signature]
   ```
4. Cliquez sur **"Envoyer"**

### Envoi par WhatsApp

1. Ouvrez la facture
2. Cliquez sur **"Partager"** > **WhatsApp**
3. Sélectionnez le contact ou entrez le numéro
4. Le message et le PDF sont automatiquement attachés

### Lien de paiement

Pour permettre le paiement en ligne :

1. Ouvrez la facture
2. Activez **"Paiement en ligne"**
3. Le lien de paiement est généré
4. Partagez le lien :
   - Par email
   - Par SMS
   - Sur WhatsApp
   - Intégré à votre site web

## Suivre les paiements

### Enregistrer un paiement

1. Ouvrez la facture
2. Cliquez sur **"Enregistrer un paiement"**
3. Sélectionnez :
   - Date du paiement
   - Montant (peut être partiel)
   - Mode de paiement
   - Référence (optionnel)
4. Cliquez sur **"Valider"**

### Paiements automatiques

Lorsqu'un client paie via Mobile Money :
- Le paiement est automatiquement enregistré
- La facture est mise à jour
- Une notification vous est envoyée

### Rappels automatiques

**Paramètres > Facturation > Rappels**

Configurez des rappels automatiques :

| Moment | Action |
|--------|--------|
| 7 jours avant | Email de rappel |
| Jour de l'échéance | Email + SMS |
| 7 jours après | Email de relance |
| 14 jours après | Relance + pénalités |

## Factures récurrentes

Pour les abonnements et contrats réguliers.

### Créer une facture récurrente

1. **Factures > Récurrentes > Nouvelle**
2. Configurez :
   - Client
   - Lignes de facturation
   - Fréquence (mensuel, trimestriel, annuel)
   - Date de début
   - Date de fin (optionnel)
3. Les factures sont générées automatiquement

### Gestion des récurrentes

| Action | Description |
|--------|-------------|
| **Suspendre** | Arrêter temporairement |
| **Modifier** | Changer montant, fréquence |
| **Supprimer** | Arrêter définitivement |
| **Prévisualiser** | Voir les prochaines échéances |

## Devis et conversions

### Créer un devis

Le processus est identique à une facture, avec :
- Pas de numérotation comptable
- Statut "En attente" par défaut
- Validité configurable

### Convertir en facture

1. Ouvrez le devis
2. Cliquez sur **"Convertir en facture"**
3. La facture est créée avec les mêmes données
4. Le devis est marqué "Converti"

## Avoirs et annulations

### Créer un avoir

Un avoir est un document qui corrige une facture émise.

1. Ouvrez la facture concernée
2. Cliquez sur **"Créer un avoir"**
3. Ajustez les lignes si nécessaire
4. Validez l'avoir

L'avoir peut être :
- **Remboursé** au client
- **Crédité** sur sa prochaine facture

### Annuler une facture

Pour les factures non envoyées ou en erreur :

1. Ouvrez la facture
2. Cliquez sur **"Annuler"**
3. Renseignez le motif
4. Confirmez

⚠️ **Attention** : Une facture annulée ne peut pas être restaurée si elle a été envoyée au client.

## Export et rapport

### Exporter les factures

**Factures > Exporter**

Formats disponibles :
- **Excel** : Pour analyse
- **CSV** : Pour import dans autre logiciel
- **PDF** : Archive des factures sélectionnées

### Rapports de facturation

Voir le guide [Rapports financiers](./reports.md) pour les rapports détaillés disponibles.

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl + N` | Nouvelle facture |
| `Ctrl + S` | Sauvegarder |
| `Ctrl + P` | Imprimer |
| `Ctrl + E` | Envoyer |
| `Escape` | Annuler |

---

[← Retour à la documentation](../../README.md) | [Gérer les clients →](./customers.md)
