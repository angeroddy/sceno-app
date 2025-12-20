-- ============================================
-- SCRIPT DE CORRECTION DES POLITIQUES RLS
-- ============================================
-- Ce script corrige l'erreur de récursion infinie
-- dans les politiques Row Level Security

-- ============================================
-- ÉTAPE 1 : NETTOYER LES POLITIQUES EXISTANTES
-- ============================================

-- Supprimer toutes les politiques existantes sur la table comediens
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur profil" ON comediens;
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leur profil" ON comediens;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur profil" ON comediens;
DROP POLICY IF EXISTS "Les admins peuvent tout lire" ON comediens;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON comediens;
DROP POLICY IF EXISTS "Enable read access for all users" ON comediens;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON comediens;

-- Supprimer toutes les politiques existantes sur la table annonceurs
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur profil annonceur" ON annonceurs;
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leur profil annonceur" ON annonceurs;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur profil annonceur" ON annonceurs;

-- Supprimer toutes les politiques existantes sur storage.objects
DROP POLICY IF EXISTS "Les utilisateurs peuvent uploader leurs photos" ON storage.objects;
DROP POLICY IF EXISTS "Les photos sont visibles publiquement" ON storage.objects;
DROP POLICY IF EXISTS "Les photos sont publiques" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs photos" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs photos" ON storage.objects;

-- ============================================
-- ÉTAPE 2 : DÉSACTIVER RLS TEMPORAIREMENT
-- ============================================

ALTER TABLE comediens DISABLE ROW LEVEL SECURITY;
ALTER TABLE annonceurs DISABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 3 : RÉACTIVER RLS
-- ============================================

ALTER TABLE comediens ENABLE ROW LEVEL SECURITY;
ALTER TABLE annonceurs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 4 : CRÉER DES POLITIQUES SIMPLES
-- ============================================

-- TABLE COMEDIENS
-- Politique simple pour l'insertion (pas de sous-requête)
CREATE POLICY "comediens_insert_policy"
ON comediens
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

-- Politique simple pour la lecture
CREATE POLICY "comediens_select_policy"
ON comediens
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- Politique simple pour la mise à jour
CREATE POLICY "comediens_update_policy"
ON comediens
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- TABLE ANNONCEURS
-- Politique simple pour l'insertion
CREATE POLICY "annonceurs_insert_policy"
ON annonceurs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

-- Politique simple pour la lecture
CREATE POLICY "annonceurs_select_policy"
ON annonceurs
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- Politique simple pour la mise à jour
CREATE POLICY "annonceurs_update_policy"
ON annonceurs
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- ============================================
-- ÉTAPE 5 : POLITIQUES STORAGE
-- ============================================

-- Permettre l'upload de photos (politique simple)
CREATE POLICY "storage_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Permettre la lecture publique des photos
CREATE POLICY "storage_select_policy"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Permettre la mise à jour des photos
CREATE POLICY "storage_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'photos')
WITH CHECK (bucket_id = 'photos');

-- Permettre la suppression des photos
CREATE POLICY "storage_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'photos');

-- ============================================
-- ÉTAPE 6 : VÉRIFICATION
-- ============================================

-- Vérifier que les politiques ont été créées
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('comediens', 'annonceurs')
ORDER BY tablename, policyname;

-- Vérifier les politiques storage
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- ============================================
-- NOTE IMPORTANTE
-- ============================================
-- Si vous avez besoin que les admins puissent tout voir,
-- vous devrez ajouter ces politiques APRÈS avoir testé
-- que l'inscription fonctionne correctement.
-- Les politiques admin peuvent causer des récursions si
-- elles contiennent des sous-requêtes mal configurées.
