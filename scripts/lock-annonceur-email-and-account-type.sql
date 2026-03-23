-- Empêcher un annonceur de modifier lui-même son email ou son type de compte.
-- Les admins et les opérations système (sans auth.uid) conservent la possibilité d'éditer ces champs.

CREATE OR REPLACE FUNCTION public.prevent_annonceur_locked_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_auth_user_id uuid := auth.uid();
    is_admin boolean := false;
BEGIN
    -- Les migrations et opérations système peuvent continuer sans contexte utilisateur.
    IF current_auth_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.admins
        WHERE admins.auth_user_id = current_auth_user_id
    )
    INTO is_admin;

    IF is_admin THEN
        RETURN NEW;
    END IF;

    IF OLD.auth_user_id = current_auth_user_id THEN
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'L''email du compte ne peut pas être modifié depuis l''espace annonceur'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.type_annonceur IS DISTINCT FROM OLD.type_annonceur THEN
            RAISE EXCEPTION 'Le type de compte ne peut pas être modifié depuis l''espace annonceur'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_annonceur_locked_field_updates ON public.annonceurs;

CREATE TRIGGER prevent_annonceur_locked_field_updates
BEFORE UPDATE ON public.annonceurs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_annonceur_locked_field_updates();
