# Configuration Supabase Storage - Pièces d'identité

## Étape 1 : Créer le bucket

1. Connectez-vous à votre [Dashboard Supabase](https://app.supabase.com)
2. Sélectionnez votre projet **scenio-app**
3. Allez dans **Storage** (menu latéral gauche)
4. Cliquez sur **New bucket**

### Configuration du bucket :

- **Nom** : `pieces-identite`
- **Public** : ❌ **Non** (fichiers privés)
- **File size limit** : `5 MB` (5242880 bytes)
- **Allowed MIME types** :
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `application/pdf`

## Étape 2 : Exécuter le script SQL

Une fois le bucket créé, exécutez le script SQL pour configurer les politiques RLS :

```bash
# Via l'éditeur SQL Supabase
# Ou via psql
psql -h [VOTRE_HOST] -U postgres -d postgres -f scripts/setup-storage-pieces-identite.sql
```

## Étape 3 : Vérifier les politiques

Dans le dashboard Supabase :
1. Allez dans **Storage** > **Policies**
2. Sélectionnez le bucket `pieces-identite`
3. Vérifiez que vous voyez les 5 politiques suivantes :
   - ✅ Annonceur peut uploader sa pièce identité
   - ✅ Annonceur peut lire sa pièce identité
   - ✅ Annonceur peut mettre à jour sa pièce identité
   - ✅ Annonceur peut supprimer sa pièce identité
   - ✅ Admin peut lire toutes les pièces identité

## Structure des fichiers

Les fichiers seront organisés comme suit dans le bucket :

```
pieces-identite/
├── annonceur/
│   ├── {auth_user_id_1}/
│   │   ├── piece-identite.pdf
│   │   └── representant-piece-identite.pdf  (si entreprise)
│   ├── {auth_user_id_2}/
│   │   └── piece-identite.jpg
│   └── ...
```

## Exemple d'URL

Format des URLs stockées dans la base de données :

```
annonceur/a1b2c3d4-5678-90ab-cdef-1234567890ab/piece-identite.pdf
```

Pour générer l'URL publique signée (temporaire) :

```typescript
const { data } = await supabase.storage
  .from('pieces-identite')
  .createSignedUrl('annonceur/user-id/piece-identite.pdf', 3600) // Valide 1h
```

## Sécurité

- ✅ Fichiers privés (pas d'accès public direct)
- ✅ RLS activé : seul le propriétaire et les admins peuvent accéder
- ✅ Limite de taille : 5 MB par fichier
- ✅ Types MIME restreints (images et PDF uniquement)
- ✅ Auto-suppression lors de la suppression d'un annonceur

## Maintenance

Exécuter périodiquement (via cron job) :

```sql
SELECT cleanup_old_identity_documents();
```

Cela supprimera les fichiers orphelins (annonceurs supprimés mais fichiers restants).

## Tests

Pour tester la configuration :

1. Créer un compte annonceur
2. Uploader une pièce d'identité via le formulaire
3. Vérifier dans Storage > pieces-identite que le fichier apparaît
4. Vérifier qu'un autre utilisateur ne peut pas accéder au fichier
5. Vérifier qu'un admin peut voir le fichier
