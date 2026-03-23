-- Ajouter un téléphone dédié au représentant légal pour les comptes entreprise.
ALTER TABLE annonceurs
ADD COLUMN IF NOT EXISTS representant_telephone TEXT;

-- Laisser la valeur vide pour les comptes existants afin d'éviter de recopier
-- automatiquement le téléphone de l'organisme dans le champ du représentant.
-- Le numéro personnel du représentant doit être saisi explicitement.

COMMENT ON COLUMN annonceurs.representant_telephone
IS 'Numéro de téléphone du représentant légal (distinct du téléphone de la structure)';
