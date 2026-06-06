-- Ajouter le site internet public de l'entreprise annonceur.
ALTER TABLE public.annonceurs
ADD COLUMN IF NOT EXISTS site_internet TEXT;

COMMENT ON COLUMN public.annonceurs.site_internet
IS 'Site internet public de l''entreprise, utilise pour pre-remplir Stripe Connect.';
