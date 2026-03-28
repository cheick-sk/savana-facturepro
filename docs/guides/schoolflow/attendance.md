# Gestion des Absences

Ce guide vous explique comment gérer les absences et la présence des élèves avec SchoolFlow.

## Vue d'ensemble

Le module de présence permet de :
- Faire l'appel quotidiennement
- Suivre les absences et retards
- Justifier les absences
- Générer des rapports d'assiduité

## Faire l'appel

### Accès

**Menu principal > Présences > Faire l'appel**

### Sélection de la classe

1. Choisissez la **date**
2. Sélectionnez la **classe**
3. Sélectionnez le **créneau horaire** (optionnel)

### Interface d'appel

```
┌─────────────────────────────────────────────────────────┐
│  Appel - 6ème A - Lundi 15 Janvier 2024 - Matin        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📷 KOUASSI Amadou                               │   │
│  │ Matricule: 2024-6A-001                          │   │
│  │ [✅ Présent] [❌ Absent] [⏰ Retard] [📝 Dispensé]│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📷 DIALLO Fatou                                 │   │
│  │ Matricule: 2024-6A-002                          │   │
│  │ [✅ Présent] [❌ Absent] [⏰ Retard] [📝 Dispensé]│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Marquer tous présents]  [Sauvegarder]                │
└─────────────────────────────────────────────────────────┘
```

### Statuts de présence

| Statut | Icône | Description |
|--------|-------|-------------|
| **Présent** | ✅ | Élève présent au cours |
| **Absent** | ❌ | Absence non justifiée |
| **Absent justifié** | 📋 | Absence avec motif |
| **Retard** | ⏰ | Arrivée en retard |
| **Dispensé** | 📝 | Excusé pour la séance |

### Raccourcis

| Touche | Action |
|--------|--------|
| `P` | Marquer présent |
| `A` | Marquer absent |
| `R` | Marquer retard |
| `D` | Marquer dispensé |
| `Entrée` | Élève suivant |
| `↑/↓` | Naviguer entre élèves |

### Validation

1. Passez en revue tous les élèves
2. Cliquez sur **Sauvegarder**
3. L'appel est enregistré avec horodatage

## Justifier une absence

### Justification par le parent

#### En ligne (Portail parents)

1. Le parent se connecte au portail
2. **Présences > Justifier une absence**
3. Sélectionne l'enfant
4. Renseigne :
   - Date de l'absence
   - Motif
   - Document justificatif (optionnel)
5. Soumet la demande

#### Par message

Le parent peut envoyer :
- WhatsApp
- SMS
- Email

L'administration traite la demande.

### Justification par l'administration

**Présences > Absences > Justifier**

1. Recherchez l'absence
2. Cliquez sur **Justifier**
3. Renseignez :
   - Motif (maladie, familial, etc.)
   - Document justificatif
   - Commentaire
4. Validez

### Motifs d'absence

| Motif | Justificatif requis |
|-------|---------------------|
| **Maladie** | Certificat médical |
| **Rendez-vous médical** | Justificatif |
| **Décès famille** | Acte de décès |
| **Voyage familial** | Non |
| **Compétition sportive** | Convocation |
| **Autre** | Selon le cas |

## Suivi des absences

### Liste des absences

**Présences > Absences**

Filtres disponibles :
- Par classe
- Par élève
- Par période
- Par statut (justifiée/non justifiée)

### Détail d'une absence

Cliquez sur une absence pour voir :
- Informations de l'élève
- Date et horaires
- Statut de justification
- Historique de l'absence

### Historique par élève

**Élèves > [Élève] > Présences**

Affiche :
- Calendrier des présences
- Statistiques d'assiduité
- Liste détaillée des absences

## Alertes automatiques

### Configuration

**Présences > Configuration > Alertes**

| Alerte | Condition | Action |
|--------|-----------|--------|
| **Absence non justifiée** | À chaque absence | Notification parent |
| **Série d'absences** | 3 absences consécutives | Alert direction |
| **Taux critique** | > 10% d'absences | Signalement |
| **Retard répété** | 3 retards/semaine | Notification |

### Notifications

Les alertes peuvent être envoyées par :
- Email
- SMS
- WhatsApp
- Notification push

### Modèles de notification

Personnalisez les messages :

```
Objet: Absence de {eleve}

Madame, Monsieur,

Nous vous informons que votre enfant {eleve} 
({classe}) a été noté(e) absent(e) ce {date}.

Merci de bien vouloir justifier cette absence 
dans les plus brefs délais.

Cordialement,
{etablissement}
```

## Rapports de présence

### Taux de présence

**Présences > Rapports > Taux de présence**

| Classe | Présents | Absents | Taux |
|--------|----------|---------|------|
| 6ème A | 32/35 | 3 | 91.4% |
| 6ème B | 35/38 | 3 | 92.1% |
| 5ème A | 28/32 | 4 | 87.5% |
| **Total** | **95/105** | **10** | **90.5%** |

### Historique mensuel

**Présences > Rapports > Mensuel**

| Mois | Jours ouvrés | Absences | Taux présence |
|------|---------------|----------|---------------|
| Septembre | 22 | 45 | 97.5% |
| Octobre | 21 | 52 | 97.2% |
| Novembre | 20 | 38 | 97.7% |

### Rapport par élève

**Présences > Rapports > Par élève**

Pour chaque élève :
- Nombre total d'absences
- Absences justifiées / non justifiées
- Nombre de retards
- Taux de présence

### Export des rapports

**Présences > Exporter**

Formats disponibles :
- Excel
- PDF
- CSV

## Sanctions pour absences

### Configuration

**Présences > Configuration > Sanctions**

| Seuil | Sanction |
|-------|----------|
| 5 absences non justifiées | Avertissement écrit |
| 10 absences non justifiées | Convocation parents |
| 15 absences non justifiées | Conseil de discipline |

### Génération automatique

Le système peut générer automatiquement :
- Lettres d'avertissement
- Convocations
- Rapports pour conseil

## Mode hors-ligne

### Fonctionnement

L'application mobile permet de faire l'appel hors-ligne :

1. Les données sont synchronisées à l'avance
2. L'appel fonctionne sans connexion
3. À la reconnexion, les données sont envoyées

### Synchronisation

- Les présences sont stockées localement
- La synchronisation est automatique
- Un indicateur montre le statut

## Application mobile

### Faire l'appel mobile

1. Ouvrez l'app SchoolFlow
2. **Présences > Faire l'appel**
3. Sélectionnez la classe
4. Pointez l'élève ou scannez sa carte
5. Sélectionnez le statut

### Scan de carte

Utilisez le lecteur de carte étudiant :
- Scan du QR code
- La fiche élève s'affiche
- Sélectionnez le statut

## Rapports pour l'administration

### Tableau de bord

**Présences > Tableau de bord**

Indicateurs clés :
- Taux de présence du jour
- Absences non justifiées
- Élèves à surveiller
- Comparaison avec moyenne

### Liste des élèves à risque

Élèves avec un taux d'absence élevé :

| Élève | Classe | Absences | Taux | Action |
|-------|--------|----------|------|--------|
| KONE M. | 5ème B | 15 | 85% | ⚠️ Alerte |
| TRAORE A. | 4ème A | 12 | 88% | 📋 Convocation |

## Statistiques

### Graphiques disponibles

- **Courbe des présences** - Évolution quotidienne
- **Répartition par motif** - Causes des absences
- **Comparaison inter-classes** - Par classe
- **Heatmap** - Jours les plus absents

### Export pour autorités

**Présences > Rapports > Officiel**

Générez les rapports requis par :
- Inspection académique
- Ministère de l'éducation
- Organismes de subvention

## Bonnes pratiques

### Quotidiennement

- ✅ Faites l'appel à l'heure prévue
- ✅ Vérifiez les absences non justifiées
- ✅ Relancez les parents si nécessaire

### Hebdomadairement

- ✅ Analysez les statistiques
- ✅ Identifiez les élèves à risque
- ✅ Préparez les convocations

### Mensuellement

- ✅ Générez les rapports officiels
- ✅ Faites le suivi des sanctions
- ✅ Archivage des justificatifs

---

[← Gestion des élèves](./students.md) | [Gestion des notes →](./grades.md)
