import type Stripe from 'stripe'
import type { Annonceur } from '@/app/types'
import {
  normalizeBusinessId,
  normalizeCountry,
  normalizeHumanText,
  normalizePhone,
  normalizePostalCode,
} from '@/app/lib/signup-validation'

export interface StripeAccountStatus {
  stripe_onboarding_complete: boolean
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
  stripe_details_submitted: boolean
}

export interface StripeAccountRequirementsSummary {
  stripe_requirements_currently_due: string[]
  stripe_requirements_pending_verification: string[]
  stripe_requirements_eventually_due: string[]
  stripe_requirements_disabled_reason: string | null
  stripe_has_pending_representative_verification: boolean
}

export function toStripeCountryCode(rawCountry: string | null | undefined): string {
  if (!rawCountry) return 'FR'
  const normalized = rawCountry.trim().toLowerCase()
  if (!normalized) return 'FR'

  // Mapping minimal pour les cas les plus fréquents de l'application.
  if (normalized === 'france') return 'FR'
  if (normalized === 'belgique') return 'BE'
  if (normalized === 'suisse') return 'CH'
  if (normalized === 'canada') return 'CA'

  if (normalized.length === 2) {
    return normalized.toUpperCase()
  }

  return 'FR'
}

export function extractStripeAccountStatus(account: Stripe.Account): StripeAccountStatus {
  return {
    stripe_onboarding_complete: Boolean(account.details_submitted),
    stripe_charges_enabled: Boolean(account.charges_enabled),
    stripe_payouts_enabled: Boolean(account.payouts_enabled),
    stripe_details_submitted: Boolean(account.details_submitted),
  }
}

export function extractStripeAccountRequirementsSummary(
  account: Stripe.Account
): StripeAccountRequirementsSummary {
  const currentlyDue = account.requirements?.currently_due ?? []
  const pendingVerification = account.requirements?.pending_verification ?? []
  const eventuallyDue = account.requirements?.eventually_due ?? []
  const disabledReason = account.requirements?.disabled_reason ?? null

  const requiresRepresentativeVerification = [
    ...currentlyDue,
    ...pendingVerification,
    ...eventuallyDue,
  ].some((item) => item.includes('representative'))

  return {
    stripe_requirements_currently_due: currentlyDue,
    stripe_requirements_pending_verification: pendingVerification,
    stripe_requirements_eventually_due: eventuallyDue,
    stripe_requirements_disabled_reason: disabledReason,
    stripe_has_pending_representative_verification:
      requiresRepresentativeVerification || disabledReason === 'requirements.pending_verification',
  }
}

function cleanString(value: string | null | undefined): string | undefined {
  const normalized = normalizeHumanText(value)
  return normalized ? normalized : undefined
}

function toStripePhone(rawPhone: string | null | undefined): string | undefined {
  const normalized = normalizePhone(rawPhone)
  return normalized || undefined
}

function toStripeDob(rawDate: string | null | undefined): Stripe.AccountCreateParams.Individual.Dob | undefined {
  const normalized = cleanString(rawDate)
  if (!normalized) return undefined

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function toStripeAddress(
  line1: string | null | undefined,
  city: string | null | undefined,
  postalCode: string | null | undefined,
  country: string | null | undefined
): Stripe.AddressParam | undefined {
  const stripeCountry = cleanString(country)
  const address: Stripe.AddressParam = {}

  if (cleanString(line1)) address.line1 = cleanString(line1)
  if (cleanString(city)) address.city = cleanString(city)

  const normalizedPostalCode = normalizePostalCode(postalCode, country)
  if (normalizedPostalCode) address.postal_code = normalizedPostalCode

  if (stripeCountry) address.country = toStripeCountryCode(normalizeCountry(stripeCountry))

  return Object.keys(address).length > 0 ? address : undefined
}

function buildAccountPayload(annonceur: Annonceur): Stripe.AccountCreateParams {
  const businessType = annonceur.type_annonceur === 'personne_physique' ? 'individual' : 'company'
  const country = toStripeCountryCode(annonceur.pays_entreprise || annonceur.adresse_pays || 'France')

  const payload: Stripe.AccountCreateParams = {
    type: 'express',
    country,
    email: annonceur.email,
    business_type: businessType,
    metadata: {
      annonceur_id: annonceur.id,
      platform: 'scenio',
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: cleanString(annonceur.nom_formation),
    },
  }

  if (businessType === 'individual') {
    payload.individual = {
      first_name: cleanString(annonceur.prenom),
      last_name: cleanString(annonceur.nom),
      email: cleanString(annonceur.email),
      phone: toStripePhone(annonceur.telephone),
      dob: toStripeDob(annonceur.date_naissance),
      address: toStripeAddress(
        annonceur.adresse_rue,
        annonceur.adresse_ville,
        annonceur.adresse_code_postal,
        annonceur.adresse_pays
      ),
    }
  } else {
    payload.company = {
      name: cleanString(annonceur.nom_entreprise) || cleanString(annonceur.nom_formation),
      tax_id: normalizeBusinessId(annonceur.numero_legal) || undefined,
      address: toStripeAddress(
        annonceur.siege_rue,
        annonceur.siege_ville,
        annonceur.siege_code_postal,
        annonceur.siege_pays || annonceur.pays_entreprise
      ),
    }
    payload.individual = {
      first_name: cleanString(annonceur.representant_prenom),
      last_name: cleanString(annonceur.representant_nom),
      email: cleanString(annonceur.email),
      phone: toStripePhone(annonceur.telephone),
      dob: toStripeDob(annonceur.representant_date_naissance),
      address: toStripeAddress(
        annonceur.representant_adresse_rue,
        annonceur.representant_adresse_ville,
        annonceur.representant_adresse_code_postal,
        annonceur.representant_adresse_pays
      ),
    }
  }

  return payload
}

function buildAccountUpdatePayload(annonceur: Annonceur): Stripe.AccountUpdateParams {
  const businessType = annonceur.type_annonceur === 'personne_physique' ? 'individual' : 'company'

  const payload: Stripe.AccountUpdateParams = {
    metadata: {
      annonceur_id: annonceur.id,
      platform: 'scenio',
    },
    business_profile: {
      name: cleanString(annonceur.nom_formation),
    },
  }

  if (businessType === 'company') {
    payload.company = {
      name: cleanString(annonceur.nom_entreprise) || cleanString(annonceur.nom_formation),
      tax_id: normalizeBusinessId(annonceur.numero_legal) || undefined,
      address: toStripeAddress(
        annonceur.siege_rue,
        annonceur.siege_ville,
        annonceur.siege_code_postal,
        annonceur.siege_pays || annonceur.pays_entreprise
      ),
    }
  }

  return payload
}

export async function createExpressAccountForAnnonceur(
  stripe: Stripe,
  annonceur: Annonceur
): Promise<Stripe.Account> {
  return stripe.accounts.create(buildAccountPayload(annonceur))
}

export async function syncExpressAccountForAnnonceur(
  stripe: Stripe,
  accountId: string,
  annonceur: Annonceur
): Promise<Stripe.Account> {
  return stripe.accounts.update(accountId, buildAccountUpdatePayload(annonceur))
}
