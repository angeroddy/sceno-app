ALTER TABLE public.annonceurs
ADD COLUMN IF NOT EXISTS compte_supprime boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS compte_supprime_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS compte_supprime_par text NULL CHECK (compte_supprime_par IN ('self', 'admin')),
ADD COLUMN IF NOT EXISTS email_anonymise text NULL;

ALTER TABLE public.account_deletions
DROP CONSTRAINT IF EXISTS account_deletions_profile_type_check;

ALTER TABLE public.account_deletions
ADD CONSTRAINT account_deletions_profile_type_check
CHECK (profile_type IN ('comedian', 'advertiser'));

CREATE INDEX IF NOT EXISTS idx_annonceurs_compte_supprime
ON public.annonceurs(compte_supprime);
