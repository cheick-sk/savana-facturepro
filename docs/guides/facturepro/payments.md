# Suivi des Paiements

Ce guide vous explique comment suivre et gérer les paiements de vos factures dans FacturePro Africa.

## Vue d'ensemble

Le suivi des paiements vous permet de :
- Enregistrer les paiements reçus
- Suivre les impayés
- Configurer des rappels automatiques
- Accepter les paiements en ligne

## Tableau de bord des paiements

### Accès

**Menu principal > Paiements**

### Indicateurs principaux

| Indicateur | Description |
|------------|-------------|
| **Encaissé ce mois** | Total des paiements reçus |
| **En attente** | Montant des factures non échues |
| **En retard** | Montant des factures échues non payées |
| **Taux d'encaissement** | % de factures payées à temps |

### Graphiques

- **Évolution mensuelle** - Paiements par mois
- **Répartition par mode** - Mobile Money, Espèces, Virement...
- **Délai moyen de paiement** - Temps entre facture et paiement

## Enregistrer un paiement

### Paiement manuel

1. **Paiements > Nouveau paiement**
2. Sélectionnez la facture concernée
3. Renseignez :

| Champ | Description |
|-------|-------------|
| **Date** | Date de réception du paiement |
| **Montant** | Peut être partiel ou total |
| **Mode** | Espèces, Virement, Mobile Money, etc. |
| **Référence** | Numéro de transaction (optionnel) |
| **Notes** | Informations complémentaires |

4. Cliquez sur **"Valider"**

### Depuis une facture

1. Ouvrez la facture
2. Cliquez sur **"Enregistrer un paiement"**
3. Remplissez les informations
4. Validez

### Paiement partiel

Si le client paie une partie de la facture :

1. Entrez le montant reçu
2. Le statut passe à "Partiellement payé"
3. Le solde restant est affiché

```
Facture: 150 000 FCFA
├── Paiement 1: 100 000 FCFA (10/01/2024)
├── Solde restant: 50 000 FCFA
└── Statut: Partiellement payé
```

## Modes de paiement

### Configuration

**Paramètres > Paiements > Modes de paiement**

### Modes disponibles

| Mode | Description | Configuration requise |
|------|-------------|----------------------|
| **Espèces** | Paiement en liquide | Aucune |
| **Chèque** | Paiement par chèque | Aucune |
| **Virement bancaire** | Transfert bancaire | RIB à configurer |
| **Mobile Money** | Orange, MTN, Wave, M-Pesa | Intégration requise |
| **Carte bancaire** | Visa, Mastercard | Intégration requise |

### Ajouter un mode personnalisé

1. **Paramètres > Paiements > Modes**
2. Cliquez sur **"Ajouter"**
3. Nommez le mode (ex: "PayPal")
4. Sauvegardez

## Paiements en ligne

### Activer les paiements en ligne

**Paramètres > Paiements > Paiements en ligne**

### Intégrations disponibles

| Intégration | Pays | Moyens |
|-------------|------|--------|
| **CinetPay** | CI, SN, BF, ML, TG, BJ, NE, CM | Mobile Money, Cartes |
| **Paystack** | NG, GH, ZA, CI | Cartes, Transferts |
| **M-Pesa** | KE, TZ, CD, GH | Mobile Money |

### Configuration CinetPay

1. Créez un compte sur [CinetPay](https://cinetpay.com)
2. Récupérez votre **API Key** et **Site ID**
3. Dans FacturePro : **Paramètres > Intégrations > CinetPay**
4. Entrez vos identifiants
5. Testez la connexion

Voir le guide détaillé : [Intégration CinetPay](../../integrations/cinetpay.md)

### Lien de paiement

Pour chaque facture, vous pouvez générer un lien de paiement :

1. Ouvrez la facture
2. Activez **"Paiement en ligne"**
3. Le lien est créé automatiquement
4. Partagez-le avec le client

Le client accède à une page de paiement sécurisée.

### Notifications de paiement

Quand un client paie en ligne :

1. **Webhook** - FacturePro reçoit la confirmation
2. **Mise à jour** - La facture est marquée payée
3. **Notification** - Vous recevez un email/SMS
4. **Reçu** - Le client reçoit une confirmation

## Rappels automatiques

### Configuration

**Paramètres > Facturation > Rappels automatiques**

### Scénarios de rappel

| Moment | Type | Message par défaut |
|--------|------|-------------------|
| J-7 | Email | "Rappel : Votre facture arrive à échéance" |
| J+0 | Email + SMS | "Votre facture est arrivée à échéance" |
| J+7 | Email | "Rappel : Facture en retard" |
| J+14 | Email + SMS | "Dernier rappel avant pénalités" |
| J+30 | Email | "Mise en demeure" |

### Personnaliser les rappels

1. Allez dans **Paramètres > Rappels**
2. Cliquez sur le rappel à modifier
3. Éditez le sujet et le message
4. Utilisez les variables :

| Variable | Remplacé par |
|----------|--------------|
| `{client}` | Nom du client |
| `{numero}` | Numéro de facture |
| `{montant}` | Montant TTC |
| `{echeance}` | Date d'échéance |
| `{lien}` | Lien de paiement |

### Activer/Désactiver

- **Globalement** : Paramètres > Rappels > Activer
- **Par client** : Fiche client > Options > Désactiver les rappels

## Gestion des impayés

### Rapport des impayés

**Rapports > Impayés**

Affiche :
- Liste des factures en retard
- Ancienneté des impayés
- Montant total par client

### Balance âgée

Répartition par ancienneté :

| Période | Montant | Action recommandée |
|---------|---------|-------------------|
| 0-30 jours | 500 000 | Premier rappel |
| 31-60 jours | 250 000 | Relance téléphonique |
| 61-90 jours | 100 000 | Mise en demeure |
| 90+ jours | 50 000 | Recouvrement |

### Actions sur impayés

Pour chaque facture en retard :

| Action | Description |
|--------|-------------|
| **Envoyer rappel** | Email/SMS manuel |
| **Appeler** | Journal d'appel |
| **Appliquer pénalités** | Majoration automatique |
| **Marquer irrécouvrable** | Pour provision |

### Pénalités de retard

**Paramètres > Facturation > Pénalités**

Configurez :
- **Taux** : Pourcentage de majoration
- **Fréquence** : Quotidienne, hebdomadaire
- **Maximum** : Plafond de majoration

Exemple :
- Taux : 1% par mois
- Une facture de 100 000 FCFA en retard de 2 mois = 102 000 FCFA

## Remboursements

### Créer un remboursement

1. Ouvrez le paiement concerné
2. Cliquez sur **"Rembourser"**
3. Entrez le montant (total ou partiel)
4. Sélectionnez le motif :
   - Erreur de facturation
   - Retour produit
   - Annulation de commande
   - Autre
5. Validez

### Impact comptable

Le remboursement génère automatiquement :
- Une écriture de sortie de trésorerie
- Un avoir si nécessaire

## Rapprochement bancaire

### Importer un relevé

**Comptabilité > Rapprochement > Importer**

1. Uploadez votre relevé bancaire (OFX, QIF, CSV)
2. Les transactions sont analysées
3. Associez chaque transaction à un paiement

### Rapprochement automatique

Le système propose automatiquement les correspondances :
- Par montant exact
- Par référence
- Par date proche

### Valider le rapprochement

1. Vérifiez les propositions
2. Corrigez si nécessaire
3. Validez le rapprochement

## Rapports de paiements

### Rapports disponibles

| Rapport | Description |
|---------|-------------|
| **Journal des paiements** | Tous les paiements sur une période |
| **Par mode de paiement** | Répartition par type |
| **Par client** | Historique par client |
| **Délai moyen** | Temps moyen d'encaissement |
| **Impayés** | Factures en retard |

### Export

**Paiements > Exporter**

Formats : Excel, CSV, PDF

## Bonnes pratiques

### Enregistrement

- ✅ Enregistrez les paiements dès réception
- ✅ Renseignez toujours la référence
- ✅ Vérifiez les montants partiels

### Suivi

- ✅ Consultez quotidiennement les impayés
- ✅ Relancez rapidement les retards
- ✅ Documentez les communications

### Réconciliation

- ✅ Faites un rapprochement mensuel
- ✅ Vérifiez les écarts
- ✅ Archiver les preuves de paiement

---

[← Gérer les clients](./customers.md) | [Rapports financiers →](./reports.md)
