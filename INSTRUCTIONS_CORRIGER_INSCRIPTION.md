# Instructions pour corriger l'erreur d'inscription

## Le problème

Vous avez raison de vous poser la question ! **La table `public.users` n'est PAS nécessaire.**

Le problème vient d'une mauvaise configuration dans votre base de données Supabase :
- Votre table `comediens` a une contrainte de clé étrangère qui cherche `public.users`
- Mais cette table n'existe pas (et elle n'a pas besoin d'exister !)
- Supabase Auth gère déjà les utilisateurs dans `auth.users`

## La solution

### Étape 1 : Exécuter le script SQL

1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Copiez et exécutez le contenu du fichier `SUPABASE_FIX_FK_CONSTRAINT.sql`

Ce script va :
- ✅ Supprimer la mauvaise contrainte de clé étrangère
- ✅ Permettre l'inscription des comédiens sans erreur

### Étape 2 : Tester l'inscription

Après avoir exécuté le script SQL, testez l'inscription d'un comédien. Ça devrait fonctionner !

## Architecture correcte

Voici comment fonctionne maintenant votre système :

```
┌─────────────────────┐
│   auth.users        │  ← Géré par Supabase Auth
│  (Authentification) │
└──────────┬──────────┘
           │
           │ auth_user_id (UUID)
           │
    ┌──────┴───────┬──────────────┬──────────────┐
    ▼              ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌─────────┐   ┌──────┐
│comediens│  │annonceurs│  │ admins  │   │ ... │
└─────────┘  └──────────┘  └─────────┘   └──────┘
```

### Flux d'inscription comédien

1. **Création du compte** → `supabase.auth.signUp()` crée l'utilisateur dans `auth.users`
2. **Upload de la photo** → Stockage dans Supabase Storage
3. **Création du profil** → Insertion dans `comediens` avec `auth_user_id`
4. **✅ Terminé !**

## Pourquoi pas de table `public.users` ?

✅ **Avantages de ne pas avoir cette table :**
- Moins de duplication de données
- Moins de risques d'inconsistance
- Plus simple à maintenir
- Supabase Auth gère déjà tout

❌ **La table `public.users` serait utile seulement si :**
- Vous voulez stocker des données supplémentaires communes à TOUS les types d'utilisateurs
- Mais dans votre cas, chaque type a sa propre table (comediens, annonceurs, admins)

## Questions fréquentes

**Q : Est-ce sécurisé sans contrainte FK ?**
R : Oui ! L'`auth_user_id` est un UUID valide créé par Supabase Auth. Il ne peut pas pointer vers un utilisateur inexistant.

**Q : Comment je vérifie qu'un utilisateur existe ?**
R : Supabase Auth le fait automatiquement. Si `signUp()` réussit, l'utilisateur existe dans `auth.users`.

**Q : Et si je veux quand même une FK ?**
R : Vous pouvez créer une FK vers `auth.users` (voir section commentée dans le script SQL), mais ce n'est pas nécessaire.

## Fichiers modifiés

✅ `SUPABASE_FIX_FK_CONSTRAINT.sql` - Script à exécuter dans Supabase
✅ `components/comedian-signup-form.tsx` - Code nettoyé (suppression tentative création dans public.users)

## Support

Si vous avez toujours des erreurs après avoir exécuté le script, vérifiez :
1. Que le script s'est bien exécuté sans erreur
2. Que les politiques RLS sont bien configurées (voir `SUPABASE_FIX_RLS.sql`)
3. Les logs dans la console du navigateur pour plus de détails
