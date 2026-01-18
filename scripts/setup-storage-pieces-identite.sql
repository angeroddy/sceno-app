-- ============================================
-- CONFIGURATION SUPABASE STORAGE
-- Bucket: pieces-identite
-- Description: Stockage sécurisé des pièces d'identité des annonceurs
-- ============================================

-- Note: La création du bucket doit être faite via l'interface Supabase
-- ou via le dashboard Storage, car la fonction create_bucket nécessite
-- des privilèges spéciaux.

-- Ce script configure les politiques RLS une fois le bucket créé.

-- ============================================
-- POLITIQUES RLS POUR LE BUCKET pieces-identite
-- ============================================

-- Politique 1: Un annonceur peut uploader sa propre pièce d'identité
CREATE POLICY "Annonceur peut uploader sa pièce identité"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'pieces-identite' AND
    -- Le chemin doit être: annonceur/{auth_user_id}/piece-identite.{ext}
    -- Vérifier que l'auth_user_id dans le chemin correspond à l'utilisateur connecté
    (storage.foldername(name))[1] = 'annonceur' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique 2: Un annonceur peut lire sa propre pièce d'identité
CREATE POLICY "Annonceur peut lire sa pièce identité"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'pieces-identite' AND
    (storage.foldername(name))[1] = 'annonceur' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique 3: Un annonceur peut mettre à jour sa propre pièce d'identité
CREATE POLICY "Annonceur peut mettre à jour sa pièce identité"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'pieces-identite' AND
    (storage.foldername(name))[1] = 'annonceur' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique 4: Un annonceur peut supprimer sa propre pièce d'identité
CREATE POLICY "Annonceur peut supprimer sa pièce identité"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'pieces-identite' AND
    (storage.foldername(name))[1] = 'annonceur' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique 5: Les admins peuvent lire toutes les pièces d'identité
-- (pour vérification)
CREATE POLICY "Admin peut lire toutes les pièces identité"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'pieces-identite' AND
    EXISTS (
        SELECT 1 FROM admins
        WHERE admins.auth_user_id = auth.uid()
    )
);

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour nettoyer les anciennes pièces d'identité
-- (à exécuter régulièrement via un cron job)
CREATE OR REPLACE FUNCTION cleanup_old_identity_documents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Supprimer les fichiers dans storage.objects qui n'ont plus de référence
    -- dans la table annonceurs (annonceurs supprimés)
    DELETE FROM storage.objects
    WHERE bucket_id = 'pieces-identite'
    AND NOT EXISTS (
        SELECT 1 FROM annonceurs
        WHERE annonceurs.piece_identite_url = storage.objects.name
        OR annonceurs.representant_piece_identite_url = storage.objects.name
    );
END;
$$;

-- ============================================
-- TRIGGER POUR NETTOYER STORAGE À LA SUPPRESSION D'UN ANNONCEUR
-- ============================================

CREATE OR REPLACE FUNCTION delete_annonceur_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Supprimer la pièce d'identité personnelle si elle existe
    IF OLD.piece_identite_url IS NOT NULL THEN
        DELETE FROM storage.objects
        WHERE bucket_id = 'pieces-identite'
        AND name = OLD.piece_identite_url;
    END IF;

    -- Supprimer la pièce d'identité du représentant si elle existe
    IF OLD.representant_piece_identite_url IS NOT NULL THEN
        DELETE FROM storage.objects
        WHERE bucket_id = 'pieces-identite'
        AND name = OLD.representant_piece_identite_url;
    END IF;

    RETURN OLD;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_delete_annonceur_files ON annonceurs;
CREATE TRIGGER trigger_delete_annonceur_files
BEFORE DELETE ON annonceurs
FOR EACH ROW
EXECUTE FUNCTION delete_annonceur_files();

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION cleanup_old_identity_documents() IS 'Nettoie les fichiers orphelins dans le bucket pieces-identite';
COMMENT ON FUNCTION delete_annonceur_files() IS 'Supprime automatiquement les fichiers storage lors de la suppression d''un annonceur';
