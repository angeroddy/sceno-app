-- ============================================
-- SCRIPT POUR RÉACTIVER RLS EN PRODUCTION
-- ============================================
-- À utiliser APRÈS que le développement fonctionne
-- et que vous êtes prêt pour la production

-- ============================================
-- ÉTAPE 1 : RÉACTIVER RLS
-- ============================================

ALTER TABLE comediens ENABLE ROW LEVEL SECURITY;
ALTER TABLE annonceurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunites ENABLE ROW LEVEL SECURITY;
ALTER TABLE achats ENABLE ROW LEVEL SECURITY;
ALTER TABLE annonceurs_bloques ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_email ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 2 : CRÉER DES POLITIQUES SIMPLES ET SÛRES
-- ============================================

-- POLITIQUES COMEDIENS (simples, sans récursion)
CREATE POLICY "comediens_insert"
ON comediens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "comediens_select_own"
ON comediens FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

CREATE POLICY "comediens_update_own"
ON comediens FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- POLITIQUES ANNONCEURS (simples, sans récursion)
CREATE POLICY "annonceurs_insert"
ON annonceurs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "annonceurs_select_own"
ON annonceurs FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

CREATE POLICY "annonceurs_update_own"
ON annonceurs FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- POLITIQUES OPPORTUNITES
CREATE POLICY "opportunites_select_validated"
ON opportunites FOR SELECT
TO authenticated
USING (statut = 'validee');

CREATE POLICY "opportunites_select_own"
ON opportunites FOR SELECT
TO authenticated
USING (
  annonceur_id IN (
    SELECT id FROM annonceurs WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "opportunites_insert_annonceur"
ON opportunites FOR INSERT
TO authenticated
WITH CHECK (
  annonceur_id IN (
    SELECT id FROM annonceurs WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "opportunites_update_annonceur"
ON opportunites FOR UPDATE
TO authenticated
USING (
  annonceur_id IN (
    SELECT id FROM annonceurs WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  annonceur_id IN (
    SELECT id FROM annonceurs WHERE auth_user_id = auth.uid()
  )
);

-- POLITIQUES ACHATS
CREATE POLICY "achats_insert_comedien"
ON achats FOR INSERT
TO authenticated
WITH CHECK (
  comedien_id IN (
    SELECT id FROM comediens WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "achats_select_comedien"
ON achats FOR SELECT
TO authenticated
USING (
  comedien_id IN (
    SELECT id FROM comediens WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "achats_select_annonceur"
ON achats FOR SELECT
TO authenticated
USING (
  opportunite_id IN (
    SELECT o.id FROM opportunites o
    JOIN annonceurs a ON o.annonceur_id = a.id
    WHERE a.auth_user_id = auth.uid()
  )
);

-- POLITIQUES STORAGE
DROP POLICY IF EXISTS "photos_all_access" ON storage.objects;

CREATE POLICY "storage_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

CREATE POLICY "storage_public_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

CREATE POLICY "storage_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'photos')
WITH CHECK (bucket_id = 'photos');

CREATE POLICY "storage_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos');

-- ============================================
-- ÉTAPE 3 : VÉRIFICATION
-- ============================================

SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ RLS ACTIVÉ'
    ELSE '❌ RLS DÉSACTIVÉ'
  END as statut_rls,
  COUNT(policyname) as nombre_politiques
FROM pg_tables
LEFT JOIN pg_policies ON pg_tables.tablename = pg_policies.tablename
WHERE pg_tables.tablename IN ('comediens', 'annonceurs', 'opportunites', 'achats')
GROUP BY pg_tables.schemaname, pg_tables.tablename, rowsecurity
ORDER BY pg_tables.tablename;

-- ============================================
-- NOTES
-- ============================================

/*
Ces politiques sont conçues pour éviter la récursion infinie tout en
maintenant la sécurité de base :

1. Chaque utilisateur peut gérer son propre profil
2. Les comédiens voient les opportunités validées
3. Les annonceurs gèrent leurs propres opportunités
4. Les achats sont visibles par les comédiens et annonceurs concernés

Si vous avez besoin de politiques admin, ajoutez-les séparément APRÈS
avoir vérifié que tout fonctionne.
*/
