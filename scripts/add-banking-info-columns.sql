-- Migration pour ajouter les informations bancaires complètes aux annonceurs
-- Date: 2026-01-17
-- Description: Ajoute les colonnes nom_titulaire_compte et bic_swift à la table annonceurs

-- Ajouter la colonne nom_titulaire_compte
ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS nom_titulaire_compte TEXT;

-- Ajouter la colonne bic_swift
ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS bic_swift TEXT;

-- Commentaires pour documenter les colonnes
COMMENT ON COLUMN annonceurs.nom_titulaire_compte IS 'Nom du titulaire du compte bancaire (personne physique ou morale)';
COMMENT ON COLUMN annonceurs.bic_swift IS 'Code BIC/SWIFT du compte bancaire';
COMMENT ON COLUMN annonceurs.iban IS 'IBAN du compte bancaire pour les paiements';
