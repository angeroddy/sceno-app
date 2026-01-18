-- ============================================
-- POLITIQUES RLS POUR LE BUCKET pieces-identite
-- ============================================

-- 1. Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "Annonceurs peuvent uploader leurs pièces" ON storage.objects;
DROP POLICY IF EXISTS "Annonceurs peuvent lire leurs pièces" ON storage.objects;
DROP POLICY IF EXISTS "Annonceurs peuvent modifier leurs pièces" ON storage.objects;
DROP POLICY IF EXISTS "Annonceurs peuvent supprimer leurs pièces" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs peuvent uploader leurs fichiers" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs peuvent lire leurs fichiers" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leurs fichiers" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs peuvent supprimer leurs fichiers" ON storage.objects;

-- 2. Créer les nouvelles policies pour pieces-identite

-- Policy INSERT: Permet aux utilisateurs authentifiés d'uploader dans leur dossier
CREATE POLICY "Allow authenticated users to upload their identity documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'pieces-identite' AND
    (storage.foldername(name))[1] = 'annonceur' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy SELECT: Permet de lire ses propres fichiers
CREATE POLICY "Allow users to read their own identity documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'pieces-identite' AND
    (
        -- L'utilisateur peut lire ses propres fichiers
        (
            (storage.foldername(name))[1] = 'annonceur' AND
            (storage.foldername(name))[2] = auth.uid()::text
        )
        -- OU c'est un admin
        OR EXISTS (
            SELECT 1 FROM public.admins WHERE admins.auth_user_id = auth.uid()
        )
    )
);

-- Policy UPDATE: Permet de modifier ses propres fichiers
CREATE POLICY "Allow users to update their own identity documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'pieces-identite' AND
    (storage.foldername(name))[1] = 'annonceur' AND
    (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'pieces-identite' AND
    (storage.foldername(name))[1] = 'annonceur' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy DELETE: Permet de supprimer ses propres fichiers
CREATE POLICY "Allow users to delete their own identity documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'pieces-identite' AND
    (storage.foldername(name))[1] = 'annonceur' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- 3. Vérification des policies créées
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
