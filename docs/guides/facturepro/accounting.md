# Comptabilité OHADA

Ce guide vous explique comment utiliser les fonctionnalités comptables de FacturePro Africa, conformes aux normes OHADA.

## Introduction à OHADA

### Qu'est-ce que OHADA ?

L'OHADA (Organisation pour l'Harmonisation en Afrique du Droit des Affaires) est une organisation qui établit un droit des affaires uniforme pour 17 pays africains :

| Zone UEMOA | Zone CEMAC | Autres |
|------------|------------|--------|
| Bénin | Cameroun | Comores |
| Burkina Faso | Centrafrique | Congo |
| Côte d'Ivoire | Congo | RDC |
| Guinée-Bissau | Gabon | Guinée |
| Mali | Guinée équatoriale | Tchad |
| Niger | Tchad | |
| Sénégal | | |
| Togo | | |

### Système Comptable OHADA (SYSCOHADA)

Le SYSCOHADA est le référentiel comptable uniformisé adopté par ces pays. FacturePro Africa est entièrement conforme à ce référentiel.

## Plan comptable

### Structure du plan comptable

Le plan comptable OHADA est organisé en 8 classes :

| Classe | Intitulé | Type |
|--------|----------|------|
| 1 | Comptes de capitaux | Passif |
| 2 | Comptes d'immobilisations | Actif |
| 3 | Comptes de stocks | Actif |
| 4 | Comptes de tiers | Actif/Passif |
| 5 | Comptes de trésorerie | Actif/Passif |
| 6 | Comptes de charges | Charges |
| 7 | Comptes de produits | Produits |
| 8 | Comptes de gestion | Gestion |

### Consulter le plan comptable

**Comptabilité > Plan comptable**

La liste affiche :
- Numéro du compte
- Intitulé
- Type (imputation)
- Solde actuel

### Personnaliser le plan

Vous pouvez ajouter des comptes divisionnaires :

1. **Comptabilité > Plan comptable > Ajouter**
2. Renseignez :
   - Compte principal (ex: 401)
   - Numéro divisionnaire (ex: 4011)
   - Intitulé (ex: Fournisseurs locaux)
3. Sauvegardez

## Écritures comptables

### Écritures automatiques

FacturePro génère automatiquement les écritures comptables pour :

| Opération | Écritures générées |
|-----------|-------------------|
| **Facture de vente** | 411 (Clients) / 70x (Ventes) / 443 (TVA) |
| **Paiement reçu** | 5xx (Trésorerie) / 411 (Clients) |
| **Facture d'achat** | 6xx (Charges) / 401 (Fournisseurs) |
| **Paiement fournisseur** | 401 (Fournisseurs) / 5xx (Trésorerie) |

### Exemple : Facture de vente

```
Facture FAC-2024-001
Client: Entreprise ABC
Montant TTC: 118 000 FCFA (HT: 100 000, TVA: 18 000)

Écritures comptables :
─────────────────────────────────────────────────
   N° Compte  │  Libellé           │ Débit   │ Crédit
─────────────────────────────────────────────────
   411001     │  Clients           │ 118 000 │
   701000     │  Ventes de march.  │         │ 100 000
   443100     │  TVA collectée     │         │  18 000
─────────────────────────────────────────────────
```

### Saisie manuelle

Pour les opérations non automatisées :

**Comptabilité > Écritures > Nouvelle écriture**

1. **Date** de l'opération
2. **Journal** (OD, Achats, Ventes, Banque, Caisse)
3. **Référence** (N° pièce)
4. **Lignes d'écriture** :
   - Compte
   - Libellé
   - Débit
   - Crédit
5. Vérifiez l'équilibre (Total Débit = Total Crédit)
6. Validez

### Validation des écritures

Une écriture validée ne peut plus être modifiée. Pour corriger :
- Créez une écriture de contrepassation
- Ou annulez si non validée

## Journaux comptables

### Types de journaux

| Journal | Code | Utilisation |
|---------|------|-------------|
| **Opérations diverses** | OD | Écritures manuelles |
| **Achats** | AC | Factures fournisseurs |
| **Ventes** | VT | Factures clients |
| **Banque** | BQ | Opérations bancaires |
| **Caisse** | CA | Espèces |
| **Avoirs** | AV | Avoirs clients |

### Consulter un journal

**Comptabilité > Journaux > [Sélectionner]**

Affiche les écritures du journal :
- Chronologiquement
- Par période

### Clôturer un journal

La clôture fige les écritures d'une période :

1. Vérifiez que toutes les écritures sont saisies
2. **Comptabilité > Journaux > Clôturer**
3. Sélectionnez la période
4. Confirmez

## Grand livre

### Accès

**Comptabilité > Grand livre**

Le grand livre affiche toutes les écritures par compte :

```
Compte 411001 - Clients ABC
────────────────────────────────────────────────────────────
Date       │ Réf.    │ Libellé          │ Débit   │ Crédit
────────────────────────────────────────────────────────────
05/01/2024 │ VT-001  │ Facture FAC-001  │ 118 000 │
12/01/2024 │ BQ-045  │ Paiement         │         │ 118 000
────────────────────────────────────────────────────────────
Solde au 31/01/2024 : 0
```

### Filtres

- Par compte
- Par période
- Par journal

## Balance

### Balance générale

**Comptabilité > Balance**

Synthèse des soldes de tous les comptes :

| Compte | Intitulé | Mouvements Débit | Mouvements Crédit | Solde Débit | Solde Crédit |
|--------|----------|------------------|-------------------|-------------|--------------|
| 101 | Capital | - | 1 000 000 | - | 1 000 000 |
| 411 | Clients | 500 000 | 350 000 | 150 000 | - |
| 512 | Banque | 350 000 | 200 000 | 150 000 | - |
| 701 | Ventes | - | 500 000 | - | 500 000 |

### Contrôles

La balance permet de vérifier :
- **Équilibre** : Total Débits = Total Crédits
- **Cohérence** : Soldes débiteurs = Soldes créditeurs

### Balance auxiliaire

Détail des comptes de tiers :
- Balance clients (comptes 411)
- Balance fournisseurs (comptes 401)

## États financiers

### Bilan

**Comptabilité > États financiers > Bilan**

Le bilan présente la situation patrimoniale :

```
ACTIF                                    PASSIF
─────────────────────────────────────────────────────────
Actif immobilisé (Classe 2)              Capitaux propres (Classe 1)
  Immobilisations incorporelles            Capital
  Immobilisations corporelles              Réserves
  Immobilisations financières              Résultat de l'exercice

Actif circulant (Classes 3,4,5)          Dettes (Classes 4,5)
  Stocks                                   Emprunts
  Créances                                 Fournisseurs
  Trésorerie                               État
                                           Autres dettes
─────────────────────────────────────────────────────────
TOTAL ACTIF                    =  TOTAL PASSIF
```

### Compte de résultat

**Comptabilité > États financiers > Compte de résultat**

Le compte de résultat présente les performances :

```
CHARGES                                  PRODUITS
─────────────────────────────────────────────────────────
Charges d'exploitation                   Produits d'exploitation
  Achats de marchandises                   Ventes de marchandises
  Variation de stocks                      Production vendue
  Services externes                        Production stockée
  Charges de personnel
  Dotations aux amort.

Charges financières                      Produits financiers
  Intérêts                                 Intérêts reçus
  Pertes de change                         Gains de change

Charges exceptionnelles                  Produits exceptionnels
─────────────────────────────────────────────────────────
TOTAL CHARGES                       TOTAL PRODUITS

RÉSULTAT NET = PRODUITS - CHARGES
```

### Tableau de flux de trésorerie

**Comptabilité > États financiers > Flux de trésorerie**

Analyse des flux de trésorerie par activité :
- Activité opérationnelle
- Activité d'investissement
- Activité de financement

## Exercices comptables

### Créer un exercice

**Comptabilité > Exercices > Nouveau**

1. **Date de début** (ex: 01/01/2024)
2. **Date de fin** (ex: 31/12/2024)
3. **Statut** : Ouvert

### Clôturer un exercice

La clôture annuelle fige l'exercice :

1. Vérifiez toutes les écritures
2. Générez les états financiers
3. **Comptabilité > Exercices > Clôturer**
4. Confirmez

Les écritures de clôture sont générées automatiquement :
- Résultat -> Report à nouveau
- Comptes de gestion -> Résultat

## États OHADA obligatoires

### Liste des états

FacturePro génère tous les états requis par le SYSCOHADA :

| État | Description |
|------|-------------|
| **Bilan** | Situation patrimoniale |
| **Compte de résultat** | Performance |
| **Tableau des flux** | Trésorerie |
| **État annexé** | Informations complémentaires |
| **État des provisions** | Provisions et amortissements |
| **État des engagements hors bilan** | Engagements donnés/reçus |

### Génération

**Comptabilité > États OHADA > Générer**

1. Sélectionnez l'exercice
2. Choisissez les états à générer
3. Prévisualisez
4. Exportez (PDF, Excel)

## Amortissements

### Configurer les amortissements

**Comptabilité > Amortissements > Configuration**

Pour chaque immobilisation :
- Valeur d'origine
- Durée d'utilité
- Mode d'amortissement (linéaire, dégressif)
- Date de mise en service

### Calcul automatique

FacturePro calcule automatiquement :
- Dotations aux amortissements
- Tableau d'amortissement
- Valeur nette comptable

### Tableau d'amortissement

**Comptabilité > Amortissements > Tableau**

| Immobilisation | Valeur | Durée | Dotation | VNC |
|----------------|--------|-------|----------|-----|
| Matériel info | 2 000 000 | 3 ans | 666 667 | 1 333 333 |
| Véhicule | 15 000 000 | 5 ans | 3 000 000 | 12 000 000 |

## Rapprochement bancaire

### Importer un relevé

**Comptabilité > Rapprochement > Importer**

Formats acceptés :
- OFX (Open Financial Exchange)
- QIF (Quicken Interchange Format)
- CSV personnalisé

### Procédure de rapprochement

1. Importez le relevé bancaire
2. Les lignes sont comparées aux écritures
3. Pour chaque ligne :
   - **Correspondance trouvée** : Validez
   - **Pas de correspondance** : Créez l'écriture
   - **Écart** : Analysez et corrigez
4. Validez le rapprochement

### État de rapprochement

Document présentant :
- Solde selon la banque
- Écritures non lettrées
- Solde selon la comptabilité
- Écarts expliqués

## Export comptable

### Export pour expert-comptable

**Comptabilité > Export**

Formats disponibles :
- **FEC** (Fichier des Écritures Comptables) - Format standard
- **Quadratus** - Pour certains logiciels
- **Excel** - Pour analyse
- **CSV** - Format universel

### Période d'export

Sélectionnez :
- Exercice complet
- Période personnalisée
- Depuis le début

## Bonnes pratiques

### Organisation quotidienne

- ✅ Saisissez les opérations du jour
- ✅ Pointez les relevés bancaires
- ✅ Classez les justificatifs

### Organisation mensuelle

- ✅ Rapprochez les comptes bancaires
- ✅ Vérifiez les balances
- ✅ Préparez la déclaration TVA

### Organisation annuelle

- ✅ Inventaire des stocks
- ✅ Amortissements
- ✅ Provisions
- ✅ Clôture de l'exercice
- ✅ États financiers

---

[← Rapports financiers](./reports.md) | [Guides SavanaFlow →](../savanaflow/pos.md)
