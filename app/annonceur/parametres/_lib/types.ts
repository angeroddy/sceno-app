import type { TypeJuridique } from "@/types"

export type AnnonceurSettingsForm = {
  nom_formation: string
  email: string
  iban: string
  nom_titulaire_compte: string
  bic_swift: string
  telephone: string
  nom_entreprise: string
  site_internet: string
  type_juridique: TypeJuridique | ""
  pays_entreprise: string
  numero_legal: string
  siege_rue: string
  siege_ville: string
  siege_code_postal: string
  siege_pays: string
  representant_nom: string
  representant_prenom: string
  representant_telephone: string
  representant_date_naissance: string
  representant_adresse_rue: string
  representant_adresse_ville: string
  representant_adresse_code_postal: string
  representant_adresse_pays: string
}

export interface StripeConnectStatus {
  connected: boolean
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
  stripe_details_submitted: boolean
  stripe_requirements_currently_due: string[]
  stripe_requirements_pending_verification: string[]
  stripe_requirements_eventually_due: string[]
  stripe_requirements_disabled_reason: string | null
  stripe_has_pending_representative_verification: boolean
}
