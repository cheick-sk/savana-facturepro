# Rapports Financiers

Ce guide vous présente les différents rapports financiers disponibles dans FacturePro Africa.

## Vue d'ensemble

Les rapports financiers vous permettent d'analyser la santé financière de votre entreprise et de prendre des décisions éclairées.

## Accès aux rapports

**Menu principal > Rapports**

### Catégories de rapports

| Catégorie | Rapports inclus |
|-----------|-----------------|
| **Ventes** | CA, Factures, Clients |
| **Paiements** | Encaissements, Impayés |
| **Comptabilité** | Grand livre, Balance, Bilan |
| **Taxes** | TVA, Taxes diverses |

## Tableau de bord financier

### Vue d'ensemble

Le tableau de bord affiche les indicateurs clés :

#### Indicateurs de performance

| KPI | Description |
|-----|-------------|
| **Chiffre d'affaires** | Total facturé sur la période |
| **Encaissements** | Total des paiements reçus |
| **Créances** | Montant dû par les clients |
| **Dettes** | Montant dû aux fournisseurs |

#### Graphiques

- **Évolution du CA** - Courbe mensuelle
- **Répartition par client** - Top 10 clients
- **Délai de paiement** - Histogramme
- **Taux de recouvrement** - Jauge

### Personnalisation de la période

1. Cliquez sur le sélecteur de date
2. Choisissez :
   - **Prédéfini** : Ce mois, Ce trimestre, Cette année
   - **Personnalisé** : Sélectionnez les dates
3. Les données sont actualisées

## Rapports de ventes

### Journal des ventes

**Rapports > Ventes > Journal**

Liste de toutes les factures sur une période :

| Colonne | Description |
|---------|-------------|
| Date | Date de facture |
| Numéro | Numéro de facture |
| Client | Nom du client |
| HT | Montant hors taxes |
| TVA | Montant de la TVA |
| TTC | Montant total |
| Statut | Payé, En attente, Annulé |

#### Filtres

- Par client
- Par statut
- Par catégorie de produit
- Par utilisateur

#### Export

- **Excel** : Pour analyse approfondie
- **CSV** : Pour import externe
- **PDF** : Pour archivage

### Chiffre d'affaires

**Rapports > Ventes > Chiffre d'affaires**

#### Par période

| Vue | Description |
|-----|-------------|
| **Journalière** | CA par jour |
| **Mensuelle** | CA par mois |
| **Annuelle** | CA par an |

#### Par dimension

- **Par client** - Top clients
- **Par produit** - Produits les plus vendus
- **Par catégorie** - Répartition par catégorie
- **Par commercial** - Performance par utilisateur

#### Comparaison

Activez **"Comparer avec"** pour voir :
- Même période année précédente
- Période précédente
- Budget prévisionnel

### Rapport des clients

**Rapports > Clients**

| Rapport | Description |
|---------|-------------|
| **Top clients** | Clients par CA |
| **Nouveaux clients** | Acquisition mensuelle |
| **Rétention** | Clients récurrents |
| **Croissance** | Évolution par client |

## Rapports de paiements

### Encaissements

**Rapports > Paiements > Encaissements**

Détail des paiements reçus :

| Colonne | Description |
|---------|-------------|
| Date | Date de paiement |
| Client | Nom du client |
| Facture | Numéro de facture |
| Montant | Montant payé |
| Mode | Espèces, Mobile Money, etc. |
| Référence | N° de transaction |

#### Par mode de paiement

Répartition des encaissements :
- Espèces
- Mobile Money (Orange, MTN, Wave)
- Virement bancaire
- Carte bancaire

### Impayés

**Rapports > Paiements > Impayés**

#### Liste des impayés

Toutes les factures en retard avec :
- Client
- Numéro de facture
- Montant dû
- Date d'échéance
- Jours de retard

#### Balance âgée

| Tranche | Montant | % |
|---------|---------|---|
| Courant (non échue) | 500 000 | 40% |
| 1-30 jours | 300 000 | 24% |
| 31-60 jours | 200 000 | 16% |
| 61-90 jours | 150 000 | 12% |
| 90+ jours | 100 000 | 8% |

### Délai moyen de paiement

**Rapports > Paiements > Délai moyen**

Analyse du temps entre facturation et encaissement :
- **Délai moyen global**
- **Par client**
- **Évolution dans le temps**

## Rapports comptables

### Grand livre

**Comptabilité > Grand livre**

Liste de toutes les écritures comptables :

| Colonne | Description |
|---------|-------------|
| Date | Date de l'écriture |
| N° pièce | Numéro de document |
| Compte | Numéro et nom du compte |
| Libellé | Description |
| Débit | Montant au débit |
| Crédit | Montant au crédit |

#### Filtres

- Par compte
- Par journal
- Par période

### Balance générale

**Comptabilité > Balance**

Synthèse des soldes de tous les comptes :

| Compte | Intitulé | Débit | Crédit | Solde |
|--------|----------|-------|--------|-------|
| 101 | Capital | - | 1 000 000 | 1 000 000 (C) |
| 401 | Fournisseurs | - | 500 000 | 500 000 (C) |
| 411 | Clients | 750 000 | - | 750 000 (D) |
| 512 | Banque | 1 200 000 | 800 000 | 400 000 (D) |

### Balance âgée clients

**Comptabilité > Balance âgée**

Répartition des créances clients par ancienneté.

### Balance âgée fournisseurs

**Comptabilité > Balance âgée fournisseurs**

Répartition des dettes fournisseurs par ancienneté.

## Rapports fiscaux

### Déclaration TVA

**Rapports > Taxes > TVA**

#### TVA collectée

| Mois | Base HT | TVA |
|------|---------|-----|
| Janvier | 10 000 000 | 1 800 000 |
| Février | 12 000 000 | 2 160 000 |
| Mars | 11 500 000 | 2 070 000 |
| **Total** | **33 500 000** | **6 030 000** |

#### TVA déductible

| Mois | Base HT | TVA |
|------|---------|-----|
| Janvier | 4 000 000 | 720 000 |
| Février | 3 500 000 | 630 000 |
| Mars | 4 200 000 | 756 000 |
| **Total** | **11 700 000** | **2 106 000** |

#### TVA à payer

```
TVA collectée:    6 030 000
TVA déductible:  -2 106 000
───────────────────────────
TVA nette:        3 924 000
```

### État des taxes

**Rapports > Taxes > État récapitulatif**

Synthèse de toutes les taxes :
- TVA
- AIB (si applicable)
- Autres taxes

## Rapports personnalisés

### Créer un rapport

**Rapports > Personnalisés > Nouveau**

1. **Sélectionnez les colonnes** à inclure
2. **Ajoutez des filtres** pour restreindre les données
3. **Définissez le groupement** (par client, par mois, etc.)
4. **Choisissez le format** de sortie
5. **Sauvegardez** le rapport

### Rapports planifiés

Envoyez automatiquement des rapports par email :

1. Créez votre rapport
2. Cliquez sur **"Planifier"**
3. Définissez :
   - Fréquence (quotidien, hebdo, mensuel)
   - Destinataires
   - Format (Excel, PDF)
4. Activez

## Export des données

### Export global

**Paramètres > Données > Exporter**

Exportez toutes vos données :
- Clients
- Produits
- Factures
- Paiements
- Écritures comptables

### Formats disponibles

| Format | Usage |
|--------|-------|
| **Excel (.xlsx)** | Analyse, tableur |
| **CSV** | Import logiciel comptable |
| **PDF** | Archivage, impression |
| **JSON** | Intégration API |

## Impression des rapports

### Avant impression

1. Cliquez sur **"Imprimer"**
2. Ajustez les paramètres :
   - Orientation (Portrait/Paysage)
   - Format (A4, A3)
   - Marges
3. Prévisualisez

### En-tête et pied de page

Les rapports incluent automatiquement :
- Logo de l'entreprise
- Nom du rapport
- Période
- Date d'impression
- Numéro de page

## Bonnes pratiques

### Fréquence d'analyse

| Rapport | Fréquence recommandée |
|---------|----------------------|
| Tableau de bord | Quotidien |
| Journal des ventes | Hebdomadaire |
| TVA | Mensuel |
| Bilan | Trimestriel/Annuel |

### Actions recommandées

- ✅ Analysez les tendances régulièrement
- ✅ Comparez avec les périodes précédentes
- ✅ Identifiez les anomalies rapidement
- ✅ Partagez les rapports avec votre équipe
- ✅ Archivez les rapports importants

---

[← Suivi des paiements](./payments.md) | [Comptabilité OHADA →](./accounting.md)
