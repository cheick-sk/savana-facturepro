# Gestion des Notes

Ce guide vous explique comment gérer les évaluations et les bulletins scolaires avec SchoolFlow.

## Vue d'ensemble

Le module de notes permet de :
- Saisir les notes des évaluations
- Calculer les moyennes
- Générer les bulletins
- Suivre la progression des élèves

## Configuration

### Matières

**Paramètres > Matières**

Pour chaque matière :

| Champ | Description |
|-------|-------------|
| **Nom** | Nom de la matière |
| **Code** | Code court (MATH, FR, ANG) |
| **Coefficient** | Poids dans la moyenne |
| **Professeur** | Enseignant responsable |
| **Volume horaire** | Heures/semaine |

### Types d'évaluation

**Paramètres > Évaluations > Types**

| Type | Description | Coefficient |
|------|-------------|-------------|
| **Interrogation** | Petit contrôle | 1 |
| **Devoir** | Devoir surveillé | 2 |
| **Composition** | Examen | 3 |
| **Projet** | Travail personnel | 1 |
| **Participation** | Participation orale | 1 |

### Périodes

**Paramètres > Périodes**

Définissez les périodes de notation :
- Trimestre 1
- Trimestre 2
- Trimestre 3
- Annuel

### Barème

**Paramètres > Évaluations > Barème**

Configurez :
- Note maximum (ex: 20)
- Seuil de réussite (ex: 10)
- Échelle de notation

## Saisir des notes

### Accès

**Menu principal > Notes > Saisir**

### Sélection de l'évaluation

1. Choisissez la **classe**
2. Choisissez la **matière**
3. Choisissez le **type d'évaluation**
4. Définissez :
   - Intitulé
   - Date
   - Coefficient
   - Note maximum

### Interface de saisie

```
┌─────────────────────────────────────────────────────────┐
│  Saisie des notes - 6ème A - Mathématiques              │
│  Devoir 1 - Coefficient 2 - /20                        │
├─────────────────────────────────────────────────────────┤
│  Élève                          │ Note    │ Observations│
├─────────────────────────────────────────────────────────┤
│  KOUASSI Amadou                 │ [  15 ] │             │
│  DIALLO Fatou                   │ [  18 ] │ Excellent   │
│  TRAORE Ibrahim                 │ [  12 ] │             │
│  KONE Mariam                    │ [  Abs ] │ Absent     │
│  ...                           │         │             │
├─────────────────────────────────────────────────────────┤
│  Moyenne: 14.5/20   [Sauvegarder]  [Annuler]           │
└─────────────────────────────────────────────────────────┘
```

### Options de saisie

| Option | Description |
|--------|-------------|
| **Note** | Valeur numérique |
| **Abs** | Élève absent |
| **Disp** | Élève dispensé |
| **NN** | Non noté |

### Validation

1. Remplissez toutes les notes
2. Vérifiez la moyenne
3. Cliquez sur **Sauvegarder**

### Modification après saisie

Pour modifier une note saisie :

1. **Notes > Historique**
2. Trouvez l'évaluation
3. Cliquez sur **Modifier**
4. Effectuez les changements
5. Ajoutez un motif de modification

## Calcul des moyennes

### Calcul automatique

Les moyennes sont calculées automatiquement selon :

```
Moyenne = Σ (Note × Coefficient) / Σ Coefficients
```

### Moyenne par matière

| Évaluation | Note | Coef | Note × Coef |
|------------|------|------|-------------|
| Interro 1 | 15 | 1 | 15 |
| Devoir 1 | 12 | 2 | 24 |
| Compo 1 | 14 | 3 | 42 |
| **Total** | | **6** | **81** |
| **Moyenne** | **13.5** | | |

### Moyenne générale

```
Moyenne générale = Σ (Moyenne matière × Coef matière) / Σ Coef matières
```

### Rangs

Les élèves sont classés automatiquement par moyenne décroissante.

## Bulletins scolaires

### Générer un bulletin

**Notes > Bulletins > Générer**

1. Sélectionnez la **période**
2. Sélectionnez la **classe** ou les élèves
3. Choisissez le **modèle**
4. Générez

### Contenu du bulletin

| Section | Contenu |
|---------|---------|
| **En-tête** | Logo, nom établissement, année scolaire |
| **Infos élève** | Nom, prénom, classe, matricule |
| **Notes** | Notes par matière avec coefficients |
| **Moyennes** | Moyenne par matière, moyenne générale |
| **Rang** | Position dans la classe |
| **Appréciations** | Commentaires par matière |
| **Conseil** | Avis du conseil de classe |
| **Signature** | Signature du chef d'établissement |

### Modèles de bulletin

**Paramètres > Bulletins > Modèles**

Personnalisez :
- Mise en page
- Couleurs
- Logo
- Mentions légales

### Aperçu et impression

1. Générez le bulletin
2. Prévisualisez chaque page
3. Imprimez ou exportez en PDF

## Appréciations

### Ajouter une appréciation

**Notes > Appréciations**

Par matière :
1. Sélectionnez l'élève
2. Rédigez l'appréciation
3. Sauvegardez

Appréciation générale :
1. **Notes > Bulletins > Appréciation générale**
2. Par élève ou par classe

### Suggestions automatiques

Le système propose des appréciations basées sur les notes :

| Moyenne | Suggestion |
|---------|------------|
| 16-20 | "Excellent trimestre. Continue ainsi !" |
| 14-15.9 | "Très bon travail. Des efforts à poursuivre." |
| 12-13.9 | "Bon trimestre. Peut mieux faire." |
| 10-11.9 | "Résultats satisfaisants. Plus d'efforts nécessaires." |
| <10 | "Trimestre difficile. Un travail sérieux s'impose." |

## Conseils de classe

### Préparer un conseil

**Notes > Conseil de classe**

1. Sélectionnez la classe
2. Générez le rapport de conseil :
   - Moyennes par élève
   - Élèves en difficulté
   - Élèves méritants
3. Imprimez pour le conseil

### Décisions du conseil

Après le conseil, enregistrez :
- **Avis** : Satisfaisant, Encouragements, Compliments, Félicitations
- **Décision** : Passe, Redouble, Exclu
- **Observations** : Commentaires du conseil

### Transmission aux parents

Les décisions apparaissent sur le bulletin final.

## Rapports statistiques

### Statistiques de classe

**Notes > Statistiques > Par classe**

| Matière | Min | Max | Moyenne | Écart-type |
|---------|-----|-----|---------|------------|
| Mathématiques | 5 | 19 | 12.5 | 3.2 |
| Français | 8 | 18 | 13.1 | 2.5 |
| Anglais | 6 | 17 | 11.8 | 2.8 |
| **Générale** | **7** | **18** | **12.8** | **2.6** |

### Distribution des notes

**Notes > Statistiques > Distribution**

Graphique en barres montrant :
- 0-5 : 2 élèves
- 5-10 : 8 élèves
- 10-15 : 18 élèves
- 15-20 : 7 élèves

### Évolution par élève

**Notes > Statistiques > Évolution**

Courbe de progression :
- Trimestre 1 vs Trimestre 2 vs Trimestre 3
- Comparaison avec la moyenne de classe

### Export des statistiques

**Notes > Exporter**

- Excel avec graphiques
- PDF pour présentation
- CSV pour analyse externe

## Rapports personnalisés

### Créer un rapport

**Notes > Rapports > Nouveau**

1. Définissez les données à inclure
2. Choisissez le format
3. Ajoutez des filtres
4. Sauvegardez le modèle

### Rapports prédéfinis

| Rapport | Description |
|---------|-------------|
| **Relevé de notes** | Notes d'un élève |
| **Palmarès** | Top 10 de la classe |
| **Élèves en difficulté** | Moyenne < seuil |
| **Matières critiques** | Moyennes basses |

## Gestion des coefficients

### Modifier les coefficients

**Paramètres > Matières > Coefficients**

Pour chaque matière, définissez :
- Coefficient par niveau
- Coefficient par filière

### Impact sur les moyennes

Le coefficient détermine le poids dans la moyenne :
- Coef 1 = poids normal
- Coef 2 = compte double
- Coef 3 = compte triple

## Archivage

### Archiver les notes

**Notes > Archives**

À la fin de l'année :
1. Vérifiez toutes les notes
2. **Notes > Archives > Archiver l'année**
3. Les notes sont figées
4. Accessibles en lecture seule

### Consulter les archives

**Notes > Archives > [Année]**

Consultez les notes des années précédentes.

## Intégration avec le portail parents

### Publication des notes

**Notes > Publication**

1. Sélectionnez les évaluations
2. Cliquez sur **Publier**
3. Les parents reçoivent une notification
4. Les notes sont visibles sur le portail

### Confidentialité

- Les parents ne voient que les notes de leurs enfants
- Les rangs sont optionnellement masqués
- Les appréciations sont publiées avec les notes

## Bonnes pratiques

### Saisie des notes

- ✅ Saisissez rapidement après l'évaluation
- ✅ Vérifiez les notes avant sauvegarde
- ✅ Documentez les modifications

### Analyse

- ✅ Identifiez les élèves en difficulté
- ✅ Analysez les résultats par matière
- ✅ Partagez les statistiques avec l'équipe

### Communication

- ✅ Publiez régulièrement les notes
- ✅ Communiquez avec les parents des élèves en difficulté
- ✅ Valorisez les bons résultats

---

[← Gestion des absences](./attendance.md) | [Portail parents →](./parent-portal.md)
