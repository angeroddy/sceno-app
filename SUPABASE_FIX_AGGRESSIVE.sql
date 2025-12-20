-- ============================================
-- SCRIPT DE CORRECTION AGRESSIF - RÉCURSION INFINIE
-- ============================================
-- Ce script nettoie TOUT et désactive temporairement RLS
-- pour permettre le développement

-- ============================================
-- ÉTAPE 1 : LISTER TOUTES LES POLITIQUES EXISTANTES
-- ============================================

-- Voir toutes les politiques sur comediens
SELECT policyname FROM pg_policies WHERE tablename = 'comediens';

-- Voir toutes les politiques sur annonceurs
SELECT policyname FROM pg_policies WHERE tablename = 'annonceurs';

-- ============================================
-- ÉTAPE 2 : SUPPRIMER TOUTES LES POLITIQUES
-- ============================================

-- Cette fonction supprime toutes les politiques d'une table
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Supprimer toutes les politiques de comediens
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'comediens') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON comediens';
    END LOOP;

    -- Supprimer toutes les politiques de annonceurs
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'annonceurs') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON annonceurs';
    END LOOP;

    -- Supprimer toutes les politiques de storage.objects pour le bucket photos
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- ============================================
-- ÉTAPE 3 : DÉSACTIVER COMPLÈTEMENT RLS (TEMPORAIRE - DÉVELOPPEMENT SEULEMENT)
-- ============================================

ALTER TABLE comediens DISABLE ROW LEVEL SECURITY;
ALTER TABLE annonceurs DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE opportunites DISABLE ROW LEVEL SECURITY;
ALTER TABLE achats DISABLE ROW LEVEL SECURITY;
ALTER TABLE annonceurs_bloques DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_email DISABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 4 : VÉRIFICATION
-- ============================================

-- Vérifier qu'il n'y a plus de politiques sur comediens
SELECT 'Politiques comediens:', COUNT(*) FROM pg_policies WHERE tablename = 'comediens';

-- Vérifier qu'il n'y a plus de politiques sur annonceurs
SELECT 'Politiques annonceurs:', COUNT(*) FROM pg_policies WHERE tablename = 'annonceurs';

-- Vérifier le statut RLS
SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity THEN 'RLS ACTIVÉ'
        ELSE 'RLS DÉSACTIVÉ'
    END as statut_rls
FROM pg_tables
WHERE tablename IN ('comediens', 'annonceurs', 'admins', 'opportunites', 'achats');

-- ============================================
-- POLITIQUES STORAGE (SIMPLES)
-- ============================================

-- Permettre tout sur le bucket photos (développement)
CREATE POLICY "photos_all_access"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'photos')
WITH CHECK (bucket_id = 'photos');

-- ============================================
-- INFORMATION IMPORTANTE
-- ============================================

/*
⚠️ ATTENTION : Ce script désactive complètement RLS pour le développement.

C'est une solution temporaire qui permet de développer sans problème de récursion.

AVANT DE METTRE EN PRODUCTION :
1. Activez RLS à nouveau avec : ALTER TABLE comediens ENABLE ROW LEVEL SECURITY;
2. Créez des politiques simples et testez-les une par une
3. Assurez-vous qu'aucune politique ne contient de sous-requêtes récursives

Pour réactiver RLS plus tard, utilisez le script SUPABASE_ENABLE_RLS.sql
*/
