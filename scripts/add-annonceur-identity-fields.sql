-- ============================================
-- MIGRATION: Ajout des champs d'identité pour les annonceurs
-- Date: 2026-01-17
-- Description: Permet de différencier personne physique et entreprise
--              et de collecter les informations légales nécessaires
-- ============================================

-- Créer les types ENUM pour les nouveaux champs
DO $$ BEGIN
    CREATE TYPE type_annonceur AS ENUM ('personne_physique', 'entreprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE type_juridique AS ENUM (
        'auto_entrepreneur',
        'entreprise_individuelle',
        'eirl',
        'sarl',
        'eurl',
        'sas',
        'sasu',
        'sa',
        'sci',
        'association',
        'autre'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE type_piece_identite AS ENUM ('cni', 'passeport');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- AJOUT DES COLONNES COMMUNES
-- ============================================

-- Type d'annonceur (personne physique ou entreprise)
ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS type_annonceur type_annonceur;

-- Numéro de téléphone (commun aux deux types)
ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS telephone TEXT;

-- ============================================
-- COLONNES POUR PERSONNE PHYSIQUE
-- ============================================

-- Informations personnelles
ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS nom TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS prenom TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS date_naissance DATE;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS adresse_rue TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS adresse_ville TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS adresse_code_postal TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS adresse_pays TEXT DEFAULT 'France';

-- Pièce d'identité
ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS type_piece_identite type_piece_identite;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS piece_identite_url TEXT;

-- ============================================
-- COLONNES POUR ENTREPRISE
-- ============================================

-- Informations entreprise
ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS nom_entreprise TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS type_juridique type_juridique;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS pays_entreprise TEXT DEFAULT 'France';

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS numero_legal TEXT; -- SIREN, SIRET, ou équivalent international

-- Adresse du siège
ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS siege_rue TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS siege_ville TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS siege_code_postal TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS siege_pays TEXT DEFAULT 'France';

-- ============================================
-- COLONNES POUR REPRÉSENTANT LÉGAL (entreprise uniquement)
-- ============================================

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS representant_nom TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS representant_prenom TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS representant_date_naissance DATE;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS representant_adresse_rue TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS representant_adresse_ville TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS representant_adresse_code_postal TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS representant_adresse_pays TEXT DEFAULT 'France';

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS representant_piece_identite_url TEXT;

ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS representant_type_piece_identite type_piece_identite;

-- ============================================
-- MIGRATION DES DONNÉES EXISTANTES
-- ============================================
-- IMPORTANT: La migration doit être faite AVANT d'ajouter les contraintes

-- Par défaut, les annonceurs existants sont considérés comme des entreprises
-- et nom_formation devient nom_entreprise
UPDATE annonceurs
SET
    type_annonceur = 'entreprise',
    nom_entreprise = nom_formation
WHERE type_annonceur IS NULL;

-- Note: Les annonceurs existants devront compléter leurs informations
-- via leur page de paramètres avant de pouvoir publier de nouvelles opportunités

-- ============================================
-- CONTRAINTES DE VALIDATION
-- ============================================
-- NOTE: Les contraintes CHECK strictes sont désactivées pour le moment
-- afin de permettre la migration des données existantes.
-- La validation est effectuée au niveau de l'application (formulaire).
-- Les contraintes pourront être ajoutées plus tard une fois tous les comptes migrés.

-- Nettoyage des anciennes contraintes si elles existent
ALTER TABLE annonceurs DROP CONSTRAINT IF EXISTS check_personne_physique_fields;
ALTER TABLE annonceurs DROP CONSTRAINT IF EXISTS check_entreprise_fields;
ALTER TABLE annonceurs DROP CONSTRAINT IF EXISTS check_age_minimum;
ALTER TABLE annonceurs DROP CONSTRAINT IF EXISTS check_representant_age_minimum;
ALTER TABLE annonceurs DROP CONSTRAINT IF EXISTS check_numero_legal_format;

-- ============================================
-- CONTRAINTES LÉGÈRES (optionnelles)
-- ============================================
-- Ces contraintes sont des validations minimales qui ne bloquent pas la migration

-- Contrainte : age minimum 18 ans pour personne physique (si date fournie)
ALTER TABLE annonceurs
ADD CONSTRAINT check_age_minimum
CHECK (
    date_naissance IS NULL OR
    date_naissance <= CURRENT_DATE - INTERVAL '18 years'
);

-- Contrainte : age minimum 18 ans pour représentant légal (si date fournie)
ALTER TABLE annonceurs
ADD CONSTRAINT check_representant_age_minimum
CHECK (
    representant_date_naissance IS NULL OR
    representant_date_naissance <= CURRENT_DATE - INTERVAL '18 years'
);

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================

-- Index sur type_annonceur pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_annonceurs_type
ON annonceurs(type_annonceur);

-- Index sur numero_legal pour recherche rapide (entreprises)
CREATE INDEX IF NOT EXISTS idx_annonceurs_numero_legal
ON annonceurs(numero_legal)
WHERE type_annonceur = 'entreprise';

-- Index sur identité vérifiée et type (pour admin)
CREATE INDEX IF NOT EXISTS idx_annonceurs_verification
ON annonceurs(identite_verifiee, type_annonceur);

-- ============================================
-- COMMENTAIRES POUR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN annonceurs.type_annonceur IS 'Type d''annonceur : personne physique ou entreprise';
COMMENT ON COLUMN annonceurs.telephone IS 'Numéro de téléphone de contact';

-- Personne physique
COMMENT ON COLUMN annonceurs.nom IS 'Nom de famille (personne physique uniquement)';
COMMENT ON COLUMN annonceurs.prenom IS 'Prénom (personne physique uniquement)';
COMMENT ON COLUMN annonceurs.date_naissance IS 'Date de naissance (personne physique uniquement)';
COMMENT ON COLUMN annonceurs.adresse_rue IS 'Rue et numéro de l''adresse (personne physique)';
COMMENT ON COLUMN annonceurs.adresse_ville IS 'Ville de l''adresse (personne physique)';
COMMENT ON COLUMN annonceurs.adresse_code_postal IS 'Code postal de l''adresse (personne physique)';
COMMENT ON COLUMN annonceurs.adresse_pays IS 'Pays de l''adresse (personne physique)';
COMMENT ON COLUMN annonceurs.type_piece_identite IS 'Type de pièce d''identité : CNI ou passeport';
COMMENT ON COLUMN annonceurs.piece_identite_url IS 'URL du fichier de la pièce d''identité dans Supabase Storage';

-- Entreprise
COMMENT ON COLUMN annonceurs.nom_entreprise IS 'Nom de l''entreprise/organisme';
COMMENT ON COLUMN annonceurs.type_juridique IS 'Statut juridique de l''entreprise';
COMMENT ON COLUMN annonceurs.pays_entreprise IS 'Pays d''immatriculation de l''entreprise';
COMMENT ON COLUMN annonceurs.numero_legal IS 'Numéro d''identification légal (SIREN, SIRET, etc.)';
COMMENT ON COLUMN annonceurs.siege_rue IS 'Rue et numéro du siège social';
COMMENT ON COLUMN annonceurs.siege_ville IS 'Ville du siège social';
COMMENT ON COLUMN annonceurs.siege_code_postal IS 'Code postal du siège social';
COMMENT ON COLUMN annonceurs.siege_pays IS 'Pays du siège social';

-- Représentant légal
COMMENT ON COLUMN annonceurs.representant_nom IS 'Nom du représentant légal (entreprise uniquement)';
COMMENT ON COLUMN annonceurs.representant_prenom IS 'Prénom du représentant légal (entreprise uniquement)';
COMMENT ON COLUMN annonceurs.representant_date_naissance IS 'Date de naissance du représentant légal';
COMMENT ON COLUMN annonceurs.representant_adresse_rue IS 'Rue de l''adresse du représentant légal';
COMMENT ON COLUMN annonceurs.representant_adresse_ville IS 'Ville de l''adresse du représentant légal';
COMMENT ON COLUMN annonceurs.representant_adresse_code_postal IS 'Code postal de l''adresse du représentant légal';
COMMENT ON COLUMN annonceurs.representant_adresse_pays IS 'Pays de l''adresse du représentant légal';
COMMENT ON COLUMN annonceurs.representant_piece_identite_url IS 'URL de la pièce d''identité du représentant légal';
COMMENT ON COLUMN annonceurs.representant_type_piece_identite IS 'Type de pièce d''identité du représentant légal';
