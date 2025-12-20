-- ============================================
-- SCRIPT POUR CORRIGER LA CONTRAINTE DE CLÉ ÉTRANGÈRE
-- ============================================
-- Ce script supprime la mauvaise contrainte FK qui pointe vers public.users
-- et permet l'inscription des comédiens sans erreur

-- ============================================
-- ÉTAPE 1 : SUPPRIMER LES CONTRAINTES INCORRECTES
-- ============================================

-- Supprimer la contrainte FK sur la table comediens
ALTER TABLE IF EXISTS public.comediens
DROP CONSTRAINT IF EXISTS comediens_auth_user_id_fkey;

-- Supprimer la contrainte FK sur la table annonceurs (si elle existe)
ALTER TABLE IF EXISTS public.annonceurs
DROP CONSTRAINT IF EXISTS annonceurs_auth_user_id_fkey;

-- Supprimer la contrainte FK sur la table admins (si elle existe)
ALTER TABLE IF EXISTS public.admins
DROP CONSTRAINT IF EXISTS admins_auth_user_id_fkey;

-- ============================================
-- ÉTAPE 2 : VÉRIFICATION
-- ============================================

-- Vérifier que les contraintes ont été supprimées
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname LIKE '%auth_user_id%'
  AND contype = 'f';

-- ============================================
-- NOTE IMPORTANTE
-- ============================================
/*
Après avoir exécuté ce script, l'inscription des comédiens
devrait fonctionner correctement.

La validation de l'existence de l'utilisateur est déjà assurée par :
1. Supabase Auth qui crée l'utilisateur dans auth.users
2. Le fait que auth_user_id est un UUID valide

Si vous voulez absolument une contrainte FK pour l'intégrité des données,
vous pouvez la recréer vers auth.users (voir solution alternative ci-dessous).
*/

-- ============================================
-- SOLUTION ALTERNATIVE (OPTIONNELLE)
-- ============================================
-- Si vous voulez garder une contrainte FK mais vers la bonne table :

-- DÉCOMMENTEZ CES LIGNES SI VOUS VOULEZ UNE FK VERS auth.users :
/*
ALTER TABLE public.comediens
ADD CONSTRAINT comediens_auth_user_id_fkey
FOREIGN KEY (auth_user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE public.annonceurs
ADD CONSTRAINT annonceurs_auth_user_id_fkey
FOREIGN KEY (auth_user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE public.admins
ADD CONSTRAINT admins_auth_user_id_fkey
FOREIGN KEY (auth_user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
*/
