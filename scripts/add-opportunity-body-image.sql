ALTER TABLE public.opportunites
ADD COLUMN IF NOT EXISTS contenu_mode text NOT NULL DEFAULT 'text';

ALTER TABLE public.opportunites
ADD COLUMN IF NOT EXISTS contenu_image_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'opportunites_contenu_mode_check'
  ) THEN
    ALTER TABLE public.opportunites
    ADD CONSTRAINT opportunites_contenu_mode_check
    CHECK (contenu_mode IN ('text', 'image', 'text_image', 'image_text'));
  END IF;
END $$;

COMMENT ON COLUMN public.opportunites.contenu_mode IS 'Mode du corps de l opportunite: text ou image';
COMMENT ON COLUMN public.opportunites.contenu_image_url IS 'Image verticale optionnelle affichée à la place du texte détaillé';
