# Guide d'implémentation - Système d'identité annonceurs

## Vue d'ensemble

Ce système permet de collecter et vérifier les informations d'identité des annonceurs, en différenciant les **personnes physiques** (coachs indépendants) et les **entreprises** (écoles, organismes de formation).

## Fichiers créés/modifiés

### 1. Base de données et Storage

- **`scripts/add-annonceur-identity-fields.sql`** : Migration SQL ajoutant tous les champs nécessaires
- **`scripts/setup-storage-pieces-identite.sql`** : Configuration des politiques RLS pour Storage
- **`scripts/INSTRUCTIONS_STORAGE.md`** : Instructions pour configurer le bucket Supabase Storage

### 2. Types TypeScript

- **`app/types/index.ts`** : Types mis à jour avec :
  - `TypeAnnonceur` : 'personne_physique' | 'entreprise'
  - `TypeJuridique` : Statuts juridiques (SARL, SAS, etc.)
  - `TypePieceIdentite` : 'cni' | 'passeport'
  - Interface `Annonceur` étendue avec tous les nouveaux champs
  - Formulaires `InscriptionPersonnePhysiqueForm` et `InscriptionEntrepriseForm`
  - Constantes de labels pour les selects

### 3. Composants UI

- **`components/file-upload.tsx`** : Composant réutilisable pour l'upload de pièces d'identité
  - Drag & drop
  - Validation type et taille
  - Preview des images
  - Gestion des erreurs

- **`components/advertiser-signup-form-v2.tsx`** : Nouveau formulaire d'inscription en 3 étapes
  - Étape 1 : Choix du type de compte (personne physique / entreprise)
  - Étape 2 : Informations d'identité (conditionnel selon le type)
  - Étape 3 : Compte et informations bancaires

## Déploiement

### Étape 1 : Migration base de données

Exécutez la migration SQL dans Supabase :

```bash
# Via l'éditeur SQL Supabase (recommandé)
# Copiez-collez le contenu de scripts/add-annonceur-identity-fields.sql
```

Ou via psql :

```bash
psql -h [SUPABASE_HOST] -U postgres -d postgres -f scripts/add-annonceur-identity-fields.sql
```

Cette migration va :
- Créer les types ENUM (type_annonceur, type_juridique, type_piece_identite)
- Ajouter ~30 colonnes à la table `annonceurs`
- Créer des contraintes CHECK pour valider les données
- Créer des index pour optimiser les requêtes
- Migrer les données existantes (type_annonceur = 'entreprise')

### Étape 2 : Configurer Supabase Storage

1. **Créer le bucket** via le Dashboard Supabase :
   - Nom : `pieces-identite`
   - Public : NON (privé)
   - File size limit : 5 MB
   - Allowed MIME types : image/jpeg, image/jpg, image/png, application/pdf

2. **Appliquer les politiques RLS** :

```bash
# Exécutez le script SQL
psql -h [SUPABASE_HOST] -U postgres -d postgres -f scripts/setup-storage-pieces-identite.sql
```

Voir `scripts/INSTRUCTIONS_STORAGE.md` pour plus de détails.

### Étape 3 : Remplacer le formulaire d'inscription

Remplacez l'ancien formulaire par le nouveau :

**Option A : Remplacer directement**

```bash
# Sauvegarder l'ancien
mv components/advertiser-signup-form.tsx components/advertiser-signup-form.old.tsx

# Renommer le nouveau
mv components/advertiser-signup-form-v2.tsx components/advertiser-signup-form.tsx
```

**Option B : Tester d'abord dans une page séparée**

Créez `app/inscription/annonceur-test/page.tsx` :

```tsx
import { AdvertiserSignupFormV2 } from "@/components/advertiser-signup-form-v2"

export default function TestSignupPage() {
  return (
    <div className="container max-w-2xl py-10">
      <AdvertiserSignupFormV2 />
    </div>
  )
}
```

Puis testez sur `/inscription/annonceur-test`

### Étape 4 : Vérifier les dépendances

Assurez-vous que tous les composants UI nécessaires sont présents :

```tsx
// Composants requis (normalement déjà présents)
- components/ui/button.tsx
- components/ui/input.tsx
- components/ui/checkbox.tsx
- components/ui/stepper.tsx
- components/ui/field.tsx
```

## Utilisation

### Inscription d'un annonceur

**Personne physique** :
1. Sélectionne "Personne physique"
2. Remplit nom, prénom, date de naissance, adresse
3. Upload pièce d'identité (CNI ou passeport)
4. Fournit IBAN + email/mot de passe
5. Validation : contraintes CHECK SQL + validation JS côté client

**Entreprise** :
1. Sélectionne "Entreprise"
2. Remplit nom organisme, statut juridique, SIREN
3. Adresse du siège social
4. Informations du représentant légal + upload pièce d'identité
5. Fournit IBAN + email/mot de passe

### Workflow de vérification

1. **Inscription** :
   - Création compte Supabase Auth
   - Upload pièces d'identité dans Storage (bucket `pieces-identite`)
   - Insertion dans table `annonceurs` avec `identite_verifiee = false`

2. **Vérification admin** :
   - L'admin accède à la liste des annonceurs non vérifiés
   - Consulte les informations et pièces d'identité
   - Valide ou refuse le compte
   - Si validé : `identite_verifiee = true`

3. **Publication d'opportunités** :
   - Seuls les annonceurs avec `identite_verifiee = true` peuvent publier

## Structure de Storage

```
pieces-identite/
├── annonceur/
│   ├── {auth_user_id}/
│   │   ├── piece-identite.pdf         (personne physique)
│   │   └── representant-piece-identite.pdf  (entreprise)
```

Exemples de chemins stockés en DB :
```
annonceur/a1b2c3d4-e5f6-7890-abcd-1234567890ab/piece-identite.pdf
annonceur/b2c3d4e5-f6a7-8901-bcde-234567890abc/representant-piece-identite.pdf
```

## Sécurité

### Politiques RLS Storage

- ✅ Un annonceur peut uploader/lire/modifier/supprimer **uniquement** sa propre pièce d'identité
- ✅ Les admins peuvent lire toutes les pièces d'identité (pour vérification)
- ✅ Fichiers privés (pas d'accès public)

### Contraintes SQL

- ✅ Age minimum 18 ans (personne physique ET représentant légal)
- ✅ Champs obligatoires conditionnels (selon type_annonceur)
- ✅ Format SIREN validé (9 ou 14 chiffres pour la France)
- ✅ Auto-suppression des fichiers si annonceur supprimé (trigger SQL)

## Administration

### Interface admin à mettre à jour

Fichier : `app/admin/annonceurs/page.tsx`

Ajouter :
1. Colonne "Type" dans le tableau (Personne physique / Entreprise)
2. Modal de détails avec :
   - Toutes les infos d'identité
   - Bouton "Voir pièce d'identité" (signed URL)
   - Bouton "Valider identité" / "Refuser"

### Page paramètres annonceur à mettre à jour

Fichier : `app/annonceur/parametres/page.tsx`

Ajouter :
1. Section "Mes informations d'identité" (lecture seule si vérifié)
2. Possibilité de modifier si non vérifié
3. Upload/remplacement pièce d'identité
4. Warning : "Toute modification remettra votre compte en attente de vérification"

## Migration données existantes

Les annonceurs existants sont automatiquement migrés avec :
- `type_annonceur = 'entreprise'`
- `nom_entreprise = nom_formation`
- `identite_verifiee = false`

Ils devront compléter leurs informations via la page paramètres avant de pouvoir publier de nouvelles opportunités.

## Validation côté client

Le formulaire valide :
- ✅ Formats IBAN (15-34 caractères, commence par 2 lettres + 2 chiffres)
- ✅ Format BIC/SWIFT (6 lettres + 2 caractères + 3 optionnels)
- ✅ Format SIREN/SIRET (9 ou 14 chiffres)
- ✅ Age minimum 18 ans
- ✅ Email valide
- ✅ Mot de passe minimum 8 caractères
- ✅ Upload fichier (type, taille max 5 MB)

## Validation côté serveur (SQL)

Contraintes CHECK SQL garantissent :
- ✅ Cohérence des données selon type_annonceur
- ✅ Age minimum respect\u00e9
- ✅ Tous les champs obligatoires remplis

## Maintenance

### Nettoyer les fichiers orphelins

Exécutez régulièrement (via cron) :

```sql
SELECT cleanup_old_identity_documents();
```

Cela supprime les fichiers dans Storage qui n'ont plus de référence dans la table `annonceurs`.

### Monitoring

Points à surveiller :
1. Taille du bucket `pieces-identite` (quota Supabase)
2. Nombre d'annonceurs en attente de vérification
3. Taux de refus (identifier les problèmes récurrents)

## Tests

### Tests manuels à effectuer

1. **Inscription personne physique** :
   - [ ] Formulaire se remplit correctement
   - [ ] Upload pièce d'identité fonctionne
   - [ ] Validation âge < 18 ans bloque
   - [ ] Compte créé avec succès
   - [ ] Fichier visible dans Storage

2. **Inscription entreprise** :
   - [ ] Formulaire entreprise s'affiche
   - [ ] SIREN invalide est rejeté
   - [ ] Représentant légal < 18 ans bloque
   - [ ] Upload pièce représentant fonctionne
   - [ ] Compte créé avec succès

3. **Sécurité Storage** :
   - [ ] Utilisateur A ne peut pas accéder aux fichiers de B
   - [ ] Admin peut voir tous les fichiers
   - [ ] Fichiers supprimés si annonceur supprimé

## Troubleshooting

### Erreur : "Duplicate column name"
→ La migration a déjà été exécutée. Vérifiez avec :
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'annonceurs';
```

### Erreur : "Storage bucket not found"
→ Créez le bucket `pieces-identite` via le Dashboard Supabase

### Upload fichier échoue
→ Vérifiez :
1. Bucket créé et configuré
2. Politiques RLS appliquées
3. Taille fichier < 5 MB
4. Type MIME autorisé

### Contrainte CHECK violation
→ Assurez-vous que tous les champs obligatoires sont remplis selon le type_annonceur

## Prochaines étapes

1. ✅ Migration SQL
2. ✅ Configuration Storage
3. ✅ Types TypeScript
4. ✅ Composant FileUpload
5. ✅ Formulaire inscription v2
6. ⏳ Interface admin vérification
7. ⏳ Page paramètres annonceur
8. ⏳ Tests end-to-end
9. ⏳ Documentation utilisateur

## Support

Pour toute question ou problème :
1. Vérifiez les logs Supabase (Auth + Database + Storage)
2. Consultez ce guide
3. Vérifiez les contraintes SQL
4. Testez les politiques RLS dans l'éditeur SQL
