# Configuration Supabase pour Scenio App

Ce document contient toutes les configurations nécessaires pour que l'application fonctionne correctement avec Supabase.

---

## ⚠️ FIX RAPIDE - Erreur de récursion infinie

Si vous rencontrez l'erreur : **"infinite recursion detected in policy for relation 'comediens'"**

**Solution rapide :**

1. Ouvrez le **SQL Editor** dans Supabase Dashboard
2. Copiez-collez tout le contenu du fichier `SUPABASE_FIX_RLS.sql`
3. Exécutez le script
4. Testez à nouveau l'inscription

Ce script va :
- Nettoyer toutes les politiques existantes
- Recréer des politiques simples sans récursion
- Configurer correctement le Storage

**Puis passez directement à la section 1 ci-dessous.**

---

## 1. Configuration de l'authentification

### Désactiver la confirmation d'email (pour le développement)

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Authentication** > **Settings**
4. Dans la section **Email Auth**, décochez :
   - ❌ **Enable email confirmations**
5. Cliquez sur **Save**

> **Note:** En production, réactivez la confirmation d'email pour la sécurité.

---

## 2. Configuration de la table `comediens`

### Activer Row Level Security (RLS)

```sql
-- Activer RLS sur la table comediens
ALTER TABLE comediens ENABLE ROW LEVEL SECURITY;
```

### Créer les politiques RLS

```sql
-- Politique 1: Permettre aux utilisateurs authentifiés de créer leur propre profil
CREATE POLICY "Les utilisateurs peuvent créer leur profil"
ON comediens
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

-- Politique 2: Permettre aux utilisateurs de lire leur propre profil
CREATE POLICY "Les utilisateurs peuvent lire leur profil"
ON comediens
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- Politique 3: Permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "Les utilisateurs peuvent modifier leur profil"
ON comediens
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Politique 4: Permettre aux admins de tout voir
CREATE POLICY "Les admins peuvent tout lire"
ON comediens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.auth_user_id = auth.uid()
  )
);
```

---

## 3. Configuration de la table `annonceurs`

### Activer RLS et créer les politiques

```sql
-- Activer RLS
ALTER TABLE annonceurs ENABLE ROW LEVEL SECURITY;

-- Politique: Permettre la création de profil annonceur
CREATE POLICY "Les utilisateurs peuvent créer leur profil annonceur"
ON annonceurs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

-- Politique: Permettre la lecture de son profil
CREATE POLICY "Les utilisateurs peuvent lire leur profil annonceur"
ON annonceurs
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- Politique: Permettre la modification de son profil
CREATE POLICY "Les utilisateurs peuvent modifier leur profil annonceur"
ON annonceurs
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);
```

---

## 4. Configuration du Storage (Photos)

### Créer le bucket

1. Allez dans **Storage** dans le menu de gauche
2. Cliquez sur **Create a new bucket**
3. Configurez le bucket :
   - **Name:** `photos`
   - **Public bucket:** ✅ Coché
   - **File size limit:** 5 MB (ou selon vos besoins)
   - **Allowed MIME types:** `image/*`
4. Cliquez sur **Create bucket**

### Créer les politiques Storage

```sql
-- Politique 1: Permettre aux utilisateurs authentifiés d'uploader leurs photos
CREATE POLICY "Les utilisateurs peuvent uploader leurs photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'comediens'
);

-- Politique 2: Permettre à tous de voir les photos (bucket public)
CREATE POLICY "Les photos sont visibles publiquement"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Politique 3: Permettre aux utilisateurs de mettre à jour leurs photos
CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'comediens'
)
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'comediens'
);

-- Politique 4: Permettre aux utilisateurs de supprimer leurs photos
CREATE POLICY "Les utilisateurs peuvent supprimer leurs photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'comediens'
);
```

---

## 5. Configuration de la table `opportunites`

### Créer les politiques RLS

```sql
-- Activer RLS
ALTER TABLE opportunites ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut lire les opportunités validées
CREATE POLICY "Les opportunités validées sont publiques"
ON opportunites
FOR SELECT
TO authenticated
USING (statut = 'validee');

-- Politique: Les annonceurs peuvent créer des opportunités
CREATE POLICY "Les annonceurs peuvent créer des opportunités"
ON opportunites
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM annonceurs
    WHERE annonceurs.auth_user_id = auth.uid()
    AND annonceurs.id = opportunites.annonceur_id
  )
);

-- Politique: Les annonceurs peuvent modifier leurs opportunités
CREATE POLICY "Les annonceurs peuvent modifier leurs opportunités"
ON opportunites
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM annonceurs
    WHERE annonceurs.auth_user_id = auth.uid()
    AND annonceurs.id = opportunites.annonceur_id
  )
);

-- Politique: Les admins peuvent tout faire
CREATE POLICY "Les admins peuvent tout gérer"
ON opportunites
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.auth_user_id = auth.uid()
  )
);
```

---

## 6. Configuration de la table `achats`

### Créer les politiques RLS

```sql
-- Activer RLS
ALTER TABLE achats ENABLE ROW LEVEL SECURITY;

-- Politique: Les comédiens peuvent créer des achats
CREATE POLICY "Les comédiens peuvent créer des achats"
ON achats
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM comediens
    WHERE comediens.auth_user_id = auth.uid()
    AND comediens.id = achats.comedien_id
  )
);

-- Politique: Les comédiens peuvent voir leurs achats
CREATE POLICY "Les comédiens peuvent voir leurs achats"
ON achats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM comediens
    WHERE comediens.auth_user_id = auth.uid()
    AND comediens.id = achats.comedien_id
  )
);

-- Politique: Les annonceurs peuvent voir les achats de leurs opportunités
CREATE POLICY "Les annonceurs peuvent voir les achats de leurs opportunités"
ON achats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM annonceurs
    JOIN opportunites ON opportunites.annonceur_id = annonceurs.id
    WHERE annonceurs.auth_user_id = auth.uid()
    AND opportunites.id = achats.opportunite_id
  )
);
```

---

## 7. Vérification de la configuration

### Script de test

Exécutez ce script SQL pour vérifier que toutes les politiques sont en place :

```sql
-- Vérifier les politiques de la table comediens
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'comediens';

-- Vérifier les politiques du storage
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
```

---

## 8. Configuration des emails (optionnel)

Si vous voulez personnaliser les emails de confirmation :

1. Allez dans **Authentication** > **Email Templates**
2. Personnalisez les templates :
   - Confirm signup
   - Magic link
   - Change email address
   - Reset password

---

## 9. Checklist de configuration

Avant de tester l'application, vérifiez que vous avez :

- [ ] Désactivé la confirmation d'email (dev) ou configuré les emails (prod)
- [ ] Activé RLS sur la table `comediens`
- [ ] Créé les politiques RLS pour `comediens`
- [ ] Créé le bucket `photos` en mode public
- [ ] Créé les politiques Storage pour le bucket `photos`
- [ ] Activé RLS sur les autres tables (`annonceurs`, `opportunites`, `achats`)
- [ ] Créé les politiques RLS pour toutes les tables
- [ ] Vérifié que les variables d'environnement sont correctes dans `.env.local`

---

## 10. Résolution des problèmes courants

### Erreur: "infinite recursion detected in policy for relation 'comediens'"

**Cause:** Les politiques RLS contiennent des sous-requêtes qui créent une boucle infinie. Cela arrive souvent quand :
- Une politique sur `comediens` fait référence à une autre table qui elle-même référence `comediens`
- Une politique contient un `EXISTS` ou un `SELECT` qui crée une récursion
- Les politiques ont été créées dans le mauvais ordre

**Solution:**
1. Utilisez le script `SUPABASE_FIX_RLS.sql` pour nettoyer et recréer toutes les politiques
2. Le script supprime toutes les politiques existantes et les recrée de manière simple
3. Après l'exécution du script, testez l'inscription

**Comment éviter ce problème:**
- Utilisez des politiques simples avec uniquement `auth.uid() = auth_user_id`
- Évitez les sous-requêtes complexes dans les politiques `INSERT`
- Si vous avez besoin de politiques admin, créez-les APRÈS que l'inscription fonctionne

### Erreur: "new row violates row-level security policy"

**Cause:** Les politiques RLS bloquent l'insertion ou la lecture.

**Solution:** Vérifiez que les politiques sont créées correctement avec le script `SUPABASE_FIX_RLS.sql`.

### Erreur: "User not authenticated" (401)

**Cause:** L'utilisateur n'est pas authentifié ou la session a expiré.

**Solution:**
1. Vérifiez que `signUp()` a réussi
2. Vérifiez que la confirmation d'email est désactivée en dev

### Erreur: "Bad Request" (400) sur l'inscription

**Cause:** Le mot de passe ne respecte pas les règles ou l'email est invalide.

**Solution:**
- Mot de passe minimum 6 caractères (par défaut)
- Email valide requis

### Les photos ne s'uploadent pas

**Cause:** Le bucket n'existe pas ou les politiques Storage sont incorrectes.

**Solution:** Suivez la section 4 pour créer le bucket et les politiques.

---

## Support

Si vous rencontrez des problèmes après avoir suivi toutes ces étapes, vérifiez :

1. Les logs de la console du navigateur
2. Les logs dans l'onglet **Logs** de Supabase Dashboard
3. Que vous êtes sur le bon projet Supabase
4. Que les variables d'environnement sont correctes

---

**Dernière mise à jour:** 18 décembre 2024
