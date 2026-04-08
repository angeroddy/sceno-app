ALTER TABLE public.comediens
ADD COLUMN IF NOT EXISTS compte_supprime boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS compte_supprime_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS compte_supprime_par text NULL CHECK (compte_supprime_par IN ('self', 'admin')),
ADD COLUMN IF NOT EXISTS email_anonymise text NULL;

CREATE TABLE IF NOT EXISTS public.account_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL,
  profile_type text NOT NULL CHECK (profile_type IN ('comedian')),
  profile_id uuid NOT NULL,
  deleted_by text NOT NULL CHECK (deleted_by IN ('self', 'admin')),
  reason text NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_account_deletions_auth_user_id
ON public.account_deletions(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_account_deletions_profile
ON public.account_deletions(profile_type, profile_id);
