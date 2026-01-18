// ============================================
// TYPES GÉNÉRÉS DEPUIS LA BASE SUPABASE
// ============================================

// Types enum
export type OpportunityType = 
  | 'stages_ateliers'
  | 'ecoles_formations'
  | 'coachs_independants'
  | 'communication'

export type OpportunityModel = 
  | 'derniere_minute'
  | 'pre_vente'

export type OpportunityStatus = 
  | 'en_attente'
  | 'validee'
  | 'refusee'
  | 'expiree'
  | 'complete'

export type PurchaseStatus =
  | 'en_attente'
  | 'confirmee'
  | 'remboursee'
  | 'annulee'

export type TypeAnnonceur =
  | 'personne_physique'
  | 'entreprise'

export type TypeJuridique =
  | 'auto_entrepreneur'
  | 'entreprise_individuelle'
  | 'eirl'
  | 'sarl'
  | 'eurl'
  | 'sas'
  | 'sasu'
  | 'sa'
  | 'sci'
  | 'association'
  | 'autre'

export type TypePieceIdentite =
  | 'cni'
  | 'passeport'

// ============================================
// TABLES
// ============================================

export interface Comedien {
  id: string
  auth_user_id: string
  nom: string
  prenom: string
  email: string
  photo_url: string | null
  lien_demo: string | null
  preferences_opportunites: OpportunityType[]
  email_verifie: boolean
  created_at: string
  updated_at: string
}

export interface Annonceur {
  id: string
  auth_user_id: string
  nom_formation: string
  email: string
  iban: string | null
  nom_titulaire_compte: string | null
  bic_swift: string | null
  email_verifie: boolean
  identite_verifiee: boolean
  created_at: string
  updated_at: string

  // Nouveaux champs d'identité
  type_annonceur: TypeAnnonceur | null
  telephone: string | null

  // Champs personne physique
  nom: string | null
  prenom: string | null
  date_naissance: string | null
  adresse_rue: string | null
  adresse_ville: string | null
  adresse_code_postal: string | null
  adresse_pays: string | null
  type_piece_identite: TypePieceIdentite | null
  piece_identite_url: string | null

  // Champs entreprise
  nom_entreprise: string | null
  type_juridique: TypeJuridique | null
  pays_entreprise: string | null
  numero_legal: string | null
  siege_rue: string | null
  siege_ville: string | null
  siege_code_postal: string | null
  siege_pays: string | null

  // Représentant légal (entreprise)
  representant_nom: string | null
  representant_prenom: string | null
  representant_date_naissance: string | null
  representant_adresse_rue: string | null
  representant_adresse_ville: string | null
  representant_adresse_code_postal: string | null
  representant_adresse_pays: string | null
  representant_piece_identite_url: string | null
  representant_type_piece_identite: TypePieceIdentite | null
}

export interface Admin {
  id: string
  auth_user_id: string
  email: string
  nom: string
  created_at: string
}

export interface Opportunite {
  id: string
  annonceur_id: string
  type: OpportunityType
  modele: OpportunityModel
  titre: string
  resume: string
  image_url: string | null
  lien_infos: string | null
  prix_base: number
  prix_reduit: number
  reduction_pourcentage: number
  nombre_places: number
  places_restantes: number
  date_limite: string
  contact_telephone: string | null
  contact_email: string
  statut: OpportunityStatus
  created_at: string
  updated_at: string
}

export interface Achat {
  id: string
  comedien_id: string
  opportunite_id: string
  prix_paye: number
  stripe_payment_id: string | null
  statut: PurchaseStatus
  created_at: string
  updated_at: string
}

export interface AnnonceurBloque {
  id: string
  comedien_id: string
  annonceur_id: string
  created_at: string
}

export interface NotificationEmail {
  id: string
  comedien_id: string
  opportunite_id: string
  objet: string
  envoye: boolean
  envoye_at: string | null
  created_at: string
}

export interface Moderation {
  id: string
  admin_id: string
  type: 'annonceur' | 'opportunite'
  entity_id: string
  action: 'validee' | 'refusee'
  raison_refus: string | null
  created_at: string
}

// ============================================
// TYPES AVEC RELATIONS (pour les jointures)
// ============================================

export interface OpportuniteWithAnnonceur extends Opportunite {
  annonceur: Pick<Annonceur, 'nom_formation' | 'email'>
}

export interface AchatWithDetails extends Achat {
  opportunite: Opportunite
  comedien: Pick<Comedien, 'nom' | 'prenom' | 'email' | 'photo_url' | 'lien_demo'>
}

// ============================================
// TYPES POUR LES FORMULAIRES
// ============================================

export interface InscriptionComedienForm {
  nom: string
  prenom: string
  email: string
  password: string
  photo_url?: string
  lien_demo?: string
  preferences_opportunites: OpportunityType[]
}

export interface InscriptionAnnonceurForm {
  // Étape 1 : Type d'annonceur
  type_annonceur: TypeAnnonceur

  // Étape 2a : Personne physique (conditionnelle)
  nom?: string
  prenom?: string
  date_naissance?: string
  adresse_rue?: string
  adresse_ville?: string
  adresse_code_postal?: string
  adresse_pays?: string
  telephone?: string
  type_piece_identite?: TypePieceIdentite
  piece_identite_file?: File

  // Étape 2b : Entreprise (conditionnelle)
  nom_formation?: string
  nom_entreprise?: string
  type_juridique?: TypeJuridique
  pays_entreprise?: string
  numero_legal?: string
  siege_rue?: string
  siege_ville?: string
  siege_code_postal?: string
  siege_pays?: string

  // Représentant légal (entreprise)
  representant_nom?: string
  representant_prenom?: string
  representant_date_naissance?: string
  representant_adresse_rue?: string
  representant_adresse_ville?: string
  representant_adresse_code_postal?: string
  representant_adresse_pays?: string
  representant_type_piece_identite?: TypePieceIdentite
  representant_piece_identite_file?: File

  // Étape 3 : Compte et bancaire
  email: string
  password: string
  iban: string
  nom_titulaire_compte: string
  bic_swift: string
}

// Types conditionnels pour les formulaires
export interface InscriptionPersonnePhysiqueForm {
  type_annonceur: 'personne_physique'
  nom: string
  prenom: string
  date_naissance: string
  adresse_rue: string
  adresse_ville: string
  adresse_code_postal: string
  adresse_pays: string
  telephone: string
  type_piece_identite: TypePieceIdentite
  piece_identite_file: File
  email: string
  password: string
  iban: string
  nom_titulaire_compte: string
  bic_swift: string
}

export interface InscriptionEntrepriseForm {
  type_annonceur: 'entreprise'
  nom_formation: string
  nom_entreprise: string
  type_juridique: TypeJuridique
  pays_entreprise: string
  numero_legal: string
  siege_rue: string
  siege_ville: string
  siege_code_postal: string
  siege_pays: string
  telephone: string
  representant_nom: string
  representant_prenom: string
  representant_date_naissance: string
  representant_adresse_rue: string
  representant_adresse_ville: string
  representant_adresse_code_postal: string
  representant_adresse_pays: string
  representant_type_piece_identite: TypePieceIdentite
  representant_piece_identite_file: File
  email: string
  password: string
  iban: string
  nom_titulaire_compte: string
  bic_swift: string
}

export interface PublierOpportuniteForm {
  type: OpportunityType
  modele: OpportunityModel
  titre: string
  resume: string
  image_url?: string
  lien_infos?: string
  prix_base: number
  prix_reduit: number
  nombre_places: number
  date_limite: string
  contact_telephone?: string
  contact_email: string
}

// ============================================
// TYPE DATABASE POUR SUPABASE CLIENT
// ============================================

export interface Database {
  public: {
    Tables: {
      comediens: {
        Row: Comedien
        Insert: Omit<Comedien, 'id' | 'created_at' | 'updated_at' | 'email_verifie'>
        Update: Partial<Omit<Comedien, 'id' | 'created_at' | 'updated_at'>>
      }
      annonceurs: {
        Row: Annonceur
        Insert: Omit<Annonceur, 'id' | 'created_at' | 'updated_at' | 'email_verifie' | 'identite_verifiee'>
        Update: Partial<Omit<Annonceur, 'id' | 'auth_user_id' | 'created_at' | 'updated_at'>>
      }
      admins: {
        Row: Admin
        Insert: Omit<Admin, 'id' | 'created_at'>
        Update: Partial<Omit<Admin, 'id' | 'created_at'>>
      }
      opportunites: {
        Row: Opportunite
        Insert: Omit<Opportunite, 'id' | 'created_at' | 'updated_at' | 'reduction_pourcentage' | 'statut'> & { statut?: OpportunityStatus }
        Update: Partial<Omit<Opportunite, 'id' | 'created_at' | 'updated_at' | 'reduction_pourcentage'>>
      }
      achats: {
        Row: Achat
        Insert: Omit<Achat, 'id' | 'created_at' | 'updated_at' | 'statut'> & { statut?: PurchaseStatus }
        Update: Partial<Omit<Achat, 'id' | 'created_at' | 'updated_at'>>
      }
      annonceurs_bloques: {
        Row: AnnonceurBloque
        Insert: Omit<AnnonceurBloque, 'id' | 'created_at'>
        Update: never
      }
      notifications_email: {
        Row: NotificationEmail
        Insert: Omit<NotificationEmail, 'id' | 'created_at' | 'envoye' | 'envoye_at'>
        Update: Partial<Pick<NotificationEmail, 'envoye' | 'envoye_at'>>
      }
      moderations: {
        Row: Moderation
        Insert: Omit<Moderation, 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      opportunity_type: OpportunityType
      opportunity_model: OpportunityModel
      opportunity_status: OpportunityStatus
      purchase_status: PurchaseStatus
      type_annonceur: TypeAnnonceur
      type_juridique: TypeJuridique
      type_piece_identite: TypePieceIdentite
    }
  }
}

// ============================================
// CONSTANTES UTILES
// ============================================

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  stages_ateliers: 'Stages / Ateliers',
  ecoles_formations: 'Écoles / Formations',
  coachs_independants: 'Coachs indépendants',
  communication: 'Photos / Démo / Communication'
}

export const OPPORTUNITY_MODEL_LABELS: Record<OpportunityModel, string> = {
  derniere_minute: 'Dernière minute',
  pre_vente: 'Pré-vente'
}

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  en_attente: 'En attente de validation',
  validee: 'Validée',
  refusee: 'Refusée',
  expiree: 'Expirée',
  complete: 'Complète'
}

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  remboursee: 'Remboursée',
  annulee: 'Annulée'
}

export const TYPE_ANNONCEUR_LABELS: Record<TypeAnnonceur, string> = {
  personne_physique: 'Personne physique',
  entreprise: 'Entreprise'
}

export const TYPE_JURIDIQUE_LABELS: Record<TypeJuridique, string> = {
  auto_entrepreneur: 'Auto-entrepreneur',
  entreprise_individuelle: 'Entreprise individuelle',
  eirl: 'EIRL',
  sarl: 'SARL',
  eurl: 'EURL',
  sas: 'SAS',
  sasu: 'SASU',
  sa: 'SA',
  sci: 'SCI',
  association: 'Association',
  autre: 'Autre'
}

export const TYPE_PIECE_IDENTITE_LABELS: Record<TypePieceIdentite, string> = {
  cni: 'Carte Nationale d\'Identité',
  passeport: 'Passeport'
}
