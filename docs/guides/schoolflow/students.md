# Gestion des Élèves

Ce guide vous explique comment gérer les informations des élèves avec SchoolFlow.

## Vue d'ensemble

La gestion des élèves centralise toutes les informations des étudiants et facilite le suivi de leur parcours scolaire.

## Liste des élèves

### Accès

**Menu principal > Élèves**

### Interface

La liste affiche pour chaque élève :

| Colonne | Information |
|---------|-------------|
| **Photo** | Photo d'identité |
| **Matricule** | Identifiant unique |
| **Nom complet** | Nom et prénom(s) |
| **Classe** | Classe actuelle |
| **Statut** | Actif, Inactif, Diplômé |
| **Date d'inscription** | Date d'admission |

### Filtres disponibles

- **Tous** - Tous les élèves
- **Actifs** - Élèves actuellement inscrits
- **Par classe** - Filtrer par classe
- **Par genre** - Garçons / Filles
- **Nouveaux** - Inscrits cette année
- **Diplômés** - Élèves ayant terminé

### Recherche

Utilisez la barre de recherche pour trouver un élève par :
- Nom ou prénom
- Matricule
- Nom du parent

## Inscrire un élève

### Nouvelle inscription

**Élèves > Nouvel élève**

#### Informations personnelles

| Champ | Requis | Description |
|-------|--------|-------------|
| **Nom** | ✅ | Nom de famille |
| **Prénom(s)** | ✅ | Prénoms |
| **Date de naissance** | ✅ | JJ/MM/AAAA |
| **Lieu de naissance** | ✅ | Ville/Pays |
| **Genre** | ✅ | M/F |
| **Nationalité** | ✅ | Pays |
| **Photo** | ❌ | Photo d'identité |

#### Informations de contact

| Champ | Description |
|-------|-------------|
| **Adresse** | Adresse résidentielle |
| **Téléphone** | Numéro personnel (si applicable) |
| **Email** | Email personnel (si applicable) |

#### Informations parentales

Pour chaque parent/tuteur :

| Champ | Requis |
|-------|--------|
| **Nom complet** | ✅ |
| **Lien** | Père, Mère, Tuteur, Autre |
| **Téléphone** | ✅ |
| **Email** | ❌ |
| **Profession** | ❌ |
| **Adresse** | ❌ |
| **Contact d'urgence** | ✅/❌ |

#### Informations scolaires

| Champ | Description |
|-------|-------------|
| **Classe** | Classe d'affectation |
| **Année scolaire** | Année en cours |
| **Date d'inscription** | Date d'admission |
| **Ancien établissement** | Si transfert |
| **Niveau précédent** | Classe précédente |

#### Informations médicales

| Champ | Description |
|-------|-------------|
| **Groupe sanguin** | A, B, AB, O, +/- |
| **Allergies** | Listes des allergies |
| **Maladies chroniques** | Si applicable |
| **Médicaments** | Traitement en cours |
| **Contact d'urgence médical** | En cas d'urgence |

### Génération du matricule

Le matricule est généré automatiquement selon le format configuré :

```
Format: {ANNÉE}{CLASSE}{SÉQUENCE}
Exemple: 2024-6A-001
```

### Documents d'inscription

Joignez les documents requis :

- [ ] Acte de naissance
- [ ] Photos d'identité
- [ ] Certificat de scolarité précédent
- [ ] Carnet de vaccination
- [ ] Certificat médical

**Élèves > [Élève] > Documents > Ajouter**

## Fiche élève

### Consulter une fiche

Cliquez sur un élève pour accéder à sa fiche complète.

#### Onglets disponibles

| Onglet | Contenu |
|--------|---------|
| **Informations** | Données personnelles |
| **Parents** | Contacts parentaux |
| **Scolarité** | Historique des classes |
| **Présences** | Historique d'assiduité |
| **Notes** | Bulletins et résultats |
| **Discipline** | Incidents et sanctions |
| **Paiements** | Frais de scolarité |
| **Documents** | Pièces jointes |

### Modifier les informations

1. Ouvrez la fiche élève
2. Cliquez sur **Modifier**
3. Effectuez vos changements
4. Sauvegardez

### Transférer vers une autre classe

1. **Élèves > [Élève] > Scolarité > Transférer**
2. Sélectionnez la nouvelle classe
3. Date du transfert
4. Motif (optionnel)
5. Validez

## Classes

### Organisation des classes

**Paramètres > Classes**

Chaque classe comprend :

| Élément | Description |
|---------|-------------|
| **Nom** | Ex: "6ème A" |
| **Niveau** | Ex: "6ème" |
| **Capacité** | Nombre maximum d'élèves |
| **Salle** | Salle attribuée |
| **Professeur principal** | Enseignant référent |
| **Année scolaire** | Période |

### Effectifs par classe

**Élèves > Statistiques > Effectifs**

| Classe | Effectif | Capacité | Places disponibles |
|--------|----------|----------|-------------------|
| 6ème A | 35 | 40 | 5 |
| 6ème B | 38 | 40 | 2 |
| 5ème A | 32 | 40 | 8 |

### Liste de classe

Pour imprimer une liste de classe :

1. Sélectionnez la classe
2. **Actions > Imprimer la liste**
3. Format : PDF, Excel

## Import en masse

### Importer des élèves

**Élèves > Importer**

1. Téléchargez le modèle CSV
2. Remplissez les données :

```csv
nom,prenom,date_naissance,genre,classe,parent_nom,parent_tel
KOUASSI,Amadou,15/03/2012,M,6A,KOUASSI Jean,+22507000000
DIALLO,Fatou,22/06/2012,F,6A,DIALLO Mamadou,+22507000001
```

3. Uploadez le fichier
4. Vérifiez l'aperçu
5. Confirmez l'import

### Résolution des erreurs

En cas d'erreur lors de l'import :
- Les lignes en erreur sont listées
- Vous pouvez corriger et réimporter
- Un rapport d'erreur est généré

## Export des données

### Exporter la liste

**Élèves > Exporter**

Formats disponibles :
- **Excel** - Pour analyse
- **CSV** - Pour import externe
- **PDF** - Pour impression

### Données exportables

- Informations personnelles
- Informations parentales
- Historique scolaire
- Statistiques

## Photos des élèves

### Télécharger une photo

1. Ouvrez la fiche élève
2. Cliquez sur l'icône photo
3. Sélectionnez l'image
4. Recadrez si nécessaire
5. Sauvegardez

### Import en masse

**Élèves > Photos > Importer**

1. Nommez les photos avec le matricule
   - `2024-6A-001.jpg`
   - `2024-6A-002.jpg`
2. Sélectionnez toutes les photos
3. Uploadez
4. Les photos sont associées automatiquement

## Archivage

### Archiver un élève

L'archivage conserve les données mais retire l'élève de la liste active :

1. Ouvrez la fiche élève
2. Cliquez sur **Archiver**
3. Sélectionnez le motif :
   - Diplômé
   - Transfert
   - Démission
   - Autre
4. Confirmez

### Restaurer un élève archivé

1. **Élèves > Archives**
2. Trouvez l'élève
3. Cliquez sur **Restaurer**
4. Sélectionnez la nouvelle classe

## Statistiques

### Tableau de bord élèves

**Élèves > Statistiques**

| Statistique | Valeur |
|-------------|--------|
| **Total élèves** | 850 |
| **Nouveaux inscrits** | 120 |
| **Filles** | 420 (49%) |
| **Garçons** | 430 (51%) |
| **Transferts sortants** | 15 |

### Graphiques

- Répartition par niveau
- Évolution des effectifs
- Genre par classe
- Pyramide des âges

## Impression

### Carte d'étudiant

**Élèves > [Élève] > Imprimer > Carte**

La carte comprend :
- Photo
- Nom et prénom
- Matricule
- Classe
- Année scolaire
- QR code (optionnel)

### Fiche d'inscription

**Élèves > [Élève] > Imprimer > Fiche**

Document complet pour signature des parents.

### Attestation de scolarité

**Élèves > [Élève] > Imprimer > Attestation**

Document officiel attestant l'inscription.

## Confidentialité

### Protection des données

Conformément au RGPD et aux lois locales :

- Les données sont chiffrées
- L'accès est restreint par rôle
- Les parents peuvent demander la suppression
- Les données sont archivées et non supprimées

### Droit d'accès

| Rôle | Données accessibles |
|------|---------------------|
| **Admin** | Toutes les données |
| **Direction** | Toutes les données |
| **Enseignant** | Données de ses classes |
| **Comptabilité** | Données financières |
| **Parent** | Données de ses enfants |

---

[← Programme de fidélité](../savanaflow/loyalty.md) | [Gérer les absences →](./attendance.md)
