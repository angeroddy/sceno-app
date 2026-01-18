-- ============================================
-- SCRIPT DE CRÉATION D'UN COMPTE ADMIN
-- ============================================
--
-- IMPORTANT : Ce script doit être exécuté EN DEUX ÉTAPES
--
-- ÉTAPE 1 : Créer l'utilisateur dans Supabase Auth (via Dashboard)
-- ============================================
-- 1. Allez dans Supabase Dashboard
-- 2. Authentication → Users → Add User
-- 3. Créez avec :
--    - Email : admin@scenio.com (ou votre email)
--    - Password : VotreMotDePasseSecurisé123!
--    - ✅ Cochez "Auto Confirm User"
-- 4. Cliquez sur "Create User"
-- 5. COPIEZ L'UUID de l'utilisateur créé
--
-- ÉTAPE 2 : Exécuter ce SQL (dans SQL Editor)
-- ============================================

-- Remplacez 'UUID-COPIÉ-ICI' par l'UUID de l'étape 1
INSERT INTO public.admins (auth_user_id, email, nom)
VALUES (
  'UUID-COPIÉ-ICI',  -- ⚠️ REMPLACEZ PAR L'UUID RÉEL
  'admin@scenio.com', -- ⚠️ MÊME EMAIL QUE LORS DE LA CRÉATION
  'Super Admin'       -- Nom/Prénom de l'admin
);

-- Vérification : Afficher tous les admins
SELECT
  a.id,
  a.email,
  a.nom,
  a.created_at,
  u.email as auth_email,
  u.email_confirmed_at
FROM public.admins a
LEFT JOIN auth.users u ON a.auth_user_id = u.id;

-- ============================================
-- EXEMPLE COMPLET
-- ============================================
--
-- Si après avoir créé l'utilisateur dans Auth, son UUID est :
-- '12345678-abcd-1234-abcd-123456789abc'
--
-- Alors exécutez :
--
-- INSERT INTO public.admins (auth_user_id, email, nom)
-- VALUES (
--   '12345678-abcd-1234-abcd-123456789abc',
--   'admin@scenio.com',
--   'Super Admin'
-- );
