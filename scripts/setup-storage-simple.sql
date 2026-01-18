-- ============================================
-- POLITIQUES RLS SÉCURISÉES - BUCKET pieces-identite
-- Version simple ET sécurisée
-- ============================================

-- IMPORTANT: Ces politiques sont NÉCESSAIRES pour que l'upload fonctionne
-- Et elles garantissent qu'un utilisateur ne peut accéder qu'à SES fichiers

-- Structure des chemins: annonceur/{auth_user_id}/piece-identite.pdf
-- On vérifie que l'auth_user_id dans le chemin = utilisateur connecté

-- 1. Upload: Chacun peut uploader uniquement dans SON dossier
CREATE POLICY "Annonceurs peuvent uploader leurs pièces"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'pieces-identite' AND
    (storage.foldername(name))[1] = 'annonceur' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- 2. Lecture: Chacun peut lire uniquement SES fichiers OU être admin
CREATE POLICY "Annonceurs peuvent lire leurs pièces"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'pieces-identite' AND
    (
        -- Soit c'est son propre fichier
        (
            (storage.foldername(name))[1] = 'annonceur' AND
            (storage.foldername(name))[2] = auth.uid()::text
        )
        -- Soit c'est un admin
        OR EXISTS (
            SELECT 1 FROM admins WHERE admins.auth_user_id = auth.uid()
        )
    )
);

-- 3. Modification: Chacun peut modifier uniquement SES fichiers
CREATE POLICY "Annonceurs peuvent modifier leurs pièces"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'pieces-identite' AND
    (storage.foldername(name))[1] = 'annonceur' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- 4. Suppression: Chacun peut supprimer uniquement SES fichiers
CREATE POLICY "Annonceurs peuvent supprimer leurs pièces"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'pieces-identite' AND
    (storage.foldername(name))[1] = 'annonceur' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================
-- RÉSUMÉ DE LA SÉCURITÉ
-- ============================================
-- ✅ Un annonceur ne peut accéder qu'à SES fichiers
-- ✅ Les admins peuvent voir TOUS les fichiers
-- ✅ Impossible d'accéder aux fichiers d'un autre utilisateur
-- ✅ Simple et efficace !
