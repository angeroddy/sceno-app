ALTER TABLE public.opportunites
ADD COLUMN IF NOT EXISTS statut_qualifie_at timestamptz NULL;

UPDATE public.opportunites
SET statut_qualifie_at = COALESCE(statut_qualifie_at, updated_at, created_at, timezone('utc', now()))
WHERE statut IN ('expiree', 'complete', 'supprimee')
  AND statut_qualifie_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_opportunites_statut_qualifie_at
ON public.opportunites(statut, statut_qualifie_at);

DROP FUNCTION IF EXISTS confirm_checkout_purchase(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION confirm_checkout_purchase(
  p_achat_id UUID,
  p_checkout_session_id TEXT,
  p_payment_intent_id TEXT,
  p_last_event_id TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, code TEXT, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_statut purchase_status;
  v_opportunite_id UUID;
  v_comedien_id UUID;
  v_places_restantes INTEGER;
  v_existing_confirmed_achat_id UUID;
BEGIN
  SELECT a.statut, a.opportunite_id, a.comedien_id
  INTO v_statut, v_opportunite_id, v_comedien_id
  FROM achats a
  WHERE a.id = p_achat_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'ACHAT_NOT_FOUND'::TEXT, 'Achat introuvable'::TEXT;
    RETURN;
  END IF;

  IF v_statut = 'confirmee' THEN
    UPDATE achats
    SET
      stripe_checkout_session_id = COALESCE(p_checkout_session_id, stripe_checkout_session_id),
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
      stripe_payment_id = COALESCE(p_payment_intent_id, stripe_payment_id),
      last_stripe_event_id = COALESCE(p_last_event_id, last_stripe_event_id),
      updated_at = NOW()
    WHERE id = p_achat_id;

    RETURN QUERY SELECT TRUE, 'ALREADY_CONFIRMED'::TEXT, 'Achat deja confirme'::TEXT;
    RETURN;
  END IF;

  IF v_statut <> 'en_attente' THEN
    RETURN QUERY SELECT FALSE, 'INVALID_STATUS'::TEXT, 'Statut achat invalide pour confirmation'::TEXT;
    RETURN;
  END IF;

  SELECT a.id
  INTO v_existing_confirmed_achat_id
  FROM achats a
  WHERE a.comedien_id = v_comedien_id
    AND a.opportunite_id = v_opportunite_id
    AND a.statut = 'confirmee'
    AND a.id <> p_achat_id
  LIMIT 1;

  IF v_existing_confirmed_achat_id IS NOT NULL THEN
    UPDATE achats
    SET
      statut = 'annulee',
      stripe_checkout_session_id = COALESCE(p_checkout_session_id, stripe_checkout_session_id),
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
      stripe_payment_id = COALESCE(p_payment_intent_id, stripe_payment_id),
      last_stripe_event_id = COALESCE(p_last_event_id, last_stripe_event_id),
      updated_at = NOW()
    WHERE id = p_achat_id;

    RETURN QUERY SELECT FALSE, 'DUPLICATE_CONFIRMED_PURCHASE'::TEXT, 'Une reservation existe deja pour ce comedien'::TEXT;
    RETURN;
  END IF;

  SELECT o.places_restantes
  INTO v_places_restantes
  FROM opportunites o
  WHERE o.id = v_opportunite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'OPPORTUNITE_NOT_FOUND'::TEXT, 'Opportunite introuvable'::TEXT;
    RETURN;
  END IF;

  IF v_places_restantes <= 0 THEN
    UPDATE achats
    SET
      statut = 'annulee',
      stripe_checkout_session_id = COALESCE(p_checkout_session_id, stripe_checkout_session_id),
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
      stripe_payment_id = COALESCE(p_payment_intent_id, stripe_payment_id),
      last_stripe_event_id = COALESCE(p_last_event_id, last_stripe_event_id),
      updated_at = NOW()
    WHERE id = p_achat_id;

    RETURN QUERY SELECT FALSE, 'NO_SPOTS_LEFT'::TEXT, 'Plus de places disponibles'::TEXT;
    RETURN;
  END IF;

  UPDATE opportunites
  SET
    places_restantes = places_restantes - 1,
    statut = CASE
      WHEN places_restantes - 1 <= 0 THEN 'complete'::opportunity_status
      ELSE statut
    END,
    statut_qualifie_at = CASE
      WHEN places_restantes - 1 <= 0 AND statut <> 'complete' THEN NOW()
      ELSE statut_qualifie_at
    END,
    updated_at = NOW()
  WHERE id = v_opportunite_id;

  UPDATE achats
  SET
    statut = 'confirmee',
    stripe_checkout_session_id = COALESCE(p_checkout_session_id, stripe_checkout_session_id),
    stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
    stripe_payment_id = COALESCE(p_payment_intent_id, stripe_payment_id),
    last_stripe_event_id = COALESCE(p_last_event_id, last_stripe_event_id),
    updated_at = NOW()
  WHERE id = p_achat_id;

  RETURN QUERY SELECT TRUE, 'CONFIRMED'::TEXT, 'Achat confirme'::TEXT;
END;
$$;
