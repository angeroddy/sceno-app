-- ============================================
-- MIGRATION: Tracking des consultations d'opportunites
-- Date: 2026-03-12
-- Description:
--   - 1 vue unique par comedien et par opportunite
--   - mise a jour de last_viewed_at lors des revisites
-- ============================================

CREATE TABLE IF NOT EXISTS opportunite_vues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunite_id UUID NOT NULL REFERENCES opportunites(id) ON DELETE CASCADE,
  comedien_id UUID NOT NULL REFERENCES comediens(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(opportunite_id, comedien_id)
);

CREATE INDEX IF NOT EXISTS idx_opportunite_vues_opportunite_id
ON opportunite_vues(opportunite_id);

CREATE INDEX IF NOT EXISTS idx_opportunite_vues_comedien_id
ON opportunite_vues(comedien_id);

COMMENT ON TABLE opportunite_vues IS 'Consultations uniques des opportunites par comedien';
COMMENT ON COLUMN opportunite_vues.last_viewed_at IS 'Derniere consultation de la fiche opportunite par ce comedien';
