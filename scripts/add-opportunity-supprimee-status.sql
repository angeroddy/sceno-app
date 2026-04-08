DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'opportunity_status'
  ) THEN
    ALTER TYPE opportunity_status ADD VALUE IF NOT EXISTS 'supprimee';
  END IF;
END $$;

ALTER TABLE public.opportunites
DROP CONSTRAINT IF EXISTS opportunites_statut_check;

ALTER TABLE public.opportunites
ADD CONSTRAINT opportunites_statut_check
CHECK (
  statut::text = ANY (
    ARRAY[
      'en_attente',
      'validee',
      'refusee',
      'expiree',
      'complete',
      'supprimee'
    ]
  )
);
