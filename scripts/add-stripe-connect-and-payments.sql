-- ============================================
-- MIGRATION: Stripe Connect + Paiements
-- Date: 2026-02-23
-- Description:
--   - Ajout des colonnes Stripe sur annonceurs et achats
--   - Table d'idempotence des webhooks Stripe
--   - Fonctions atomiques pour confirmation checkout et remboursement
-- ============================================

-- ============================================
-- 1) ANNONCEURS: ETAT STRIPE CONNECT
-- ============================================
ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_annonceurs_stripe_account_id
ON annonceurs(stripe_account_id)
WHERE stripe_account_id IS NOT NULL;

-- ============================================
-- 2) ACHATS: TRACABILITE STRIPE
-- ============================================
ALTER TABLE achats
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

ALTER TABLE achats
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

ALTER TABLE achats
ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

ALTER TABLE achats
ADD COLUMN IF NOT EXISTS application_fee_amount INTEGER;

ALTER TABLE achats
ADD COLUMN IF NOT EXISTS transfer_destination TEXT;

ALTER TABLE achats
ADD COLUMN IF NOT EXISTS last_stripe_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_achats_checkout_session
ON achats(stripe_checkout_session_id)
WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_achats_payment_intent
ON achats(stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_achats_refund_id
ON achats(stripe_refund_id)
WHERE stripe_refund_id IS NOT NULL;

-- ============================================
-- 3) IDEMPOTENCE WEBHOOKS STRIPE
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NULL,
  processing_error TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type
ON stripe_events(event_type);

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at
ON stripe_events(processed_at);

-- ============================================
-- 4) FONCTION: CONFIRMATION ACHAT ATOMIQUE
-- ============================================
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

-- ============================================
-- 5) FONCTION: REMBOURSEMENT ATOMIQUE
-- ============================================
DROP FUNCTION IF EXISTS mark_purchase_refunded(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION mark_purchase_refunded(
  p_achat_id UUID,
  p_refund_id TEXT,
  p_last_event_id TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, code TEXT, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_statut purchase_status;
  v_opportunite_id UUID;
  v_date_evenement TIMESTAMPTZ;
  v_places_restantes INTEGER;
  v_nombre_places INTEGER;
BEGIN
  SELECT a.statut, a.opportunite_id
  INTO v_statut, v_opportunite_id
  FROM achats a
  WHERE a.id = p_achat_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'ACHAT_NOT_FOUND'::TEXT, 'Achat introuvable'::TEXT;
    RETURN;
  END IF;

  IF v_statut = 'remboursee' THEN
    UPDATE achats
    SET
      stripe_refund_id = COALESCE(p_refund_id, stripe_refund_id),
      last_stripe_event_id = COALESCE(p_last_event_id, last_stripe_event_id),
      updated_at = NOW()
    WHERE id = p_achat_id;

    RETURN QUERY SELECT TRUE, 'ALREADY_REFUNDED'::TEXT, 'Achat deja rembourse'::TEXT;
    RETURN;
  END IF;

  IF v_statut <> 'confirmee' THEN
    RETURN QUERY SELECT FALSE, 'INVALID_STATUS'::TEXT, 'Statut achat invalide pour remboursement'::TEXT;
    RETURN;
  END IF;

  SELECT o.date_evenement, o.places_restantes, o.nombre_places
  INTO v_date_evenement, v_places_restantes, v_nombre_places
  FROM opportunites o
  WHERE o.id = v_opportunite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'OPPORTUNITE_NOT_FOUND'::TEXT, 'Opportunite introuvable'::TEXT;
    RETURN;
  END IF;

  UPDATE achats
  SET
    statut = 'remboursee',
    stripe_refund_id = COALESCE(p_refund_id, stripe_refund_id),
    last_stripe_event_id = COALESCE(p_last_event_id, last_stripe_event_id),
    updated_at = NOW()
  WHERE id = p_achat_id;

  IF v_date_evenement > NOW() AND v_places_restantes < v_nombre_places THEN
    UPDATE opportunites
    SET
      places_restantes = places_restantes + 1,
      updated_at = NOW()
    WHERE id = v_opportunite_id;
  END IF;

  RETURN QUERY SELECT TRUE, 'REFUNDED'::TEXT, 'Achat rembourse'::TEXT;
END;
$$;

-- ============================================
-- 6) DOCUMENTATION COLONNES
-- ============================================
COMMENT ON COLUMN annonceurs.stripe_account_id IS 'Identifiant Stripe Connect (acct_...)';
COMMENT ON COLUMN annonceurs.stripe_onboarding_complete IS 'Onboarding Connect termine';
COMMENT ON COLUMN annonceurs.stripe_charges_enabled IS 'Autorisation Stripe pour accepter des paiements';
COMMENT ON COLUMN annonceurs.stripe_payouts_enabled IS 'Autorisation Stripe pour recevoir des virements';
COMMENT ON COLUMN annonceurs.stripe_details_submitted IS 'Informations KYC soumises sur Stripe';

COMMENT ON COLUMN achats.stripe_checkout_session_id IS 'Identifiant Stripe Checkout Session (cs_...)';
COMMENT ON COLUMN achats.stripe_payment_intent_id IS 'Identifiant Stripe PaymentIntent (pi_...)';
COMMENT ON COLUMN achats.stripe_refund_id IS 'Identifiant Stripe Refund (re_...)';
COMMENT ON COLUMN achats.application_fee_amount IS 'Commission plateforme en centimes';
COMMENT ON COLUMN achats.transfer_destination IS 'Compte Stripe Connect destinataire (acct_...)';
COMMENT ON COLUMN achats.last_stripe_event_id IS 'Dernier event Stripe applique a cet achat';
