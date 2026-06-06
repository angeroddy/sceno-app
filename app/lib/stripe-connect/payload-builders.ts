import Stripe from 'stripe'
import type { Annonceur } from '@/app/types'
import {
  isValidFrenchBusinessId,
  normalizeBusinessId,
  normalizeCountry,
  normalizeHumanText,
  normalizePostalCode,
  normalizeWebsiteUrl,
} from '@/app/lib/signup-validation'
import { EVENT_TICKETING_MCC, STRIPE_ONBOARDING_STARTED_METADATA_KEY } from './types'

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

export function buildStripeMetadata(
  annonceur: Annonceur,
  onboardingStarted?: boolean
): Stripe.MetadataParam {
  const metadata: Stripe.MetadataParam = {
    annonceur_id: annonceur.id,
    platform: 'scenio',
  }

  if (typeof onboardingStarted === 'boolean') {
    metadata[STRIPE_ONBOARDING_STARTED_METADATA_KEY] = onboardingStarted ? 'true' : 'false'
  }

  return metadata
}

export function hasStripeOnboardingStarted(account: Stripe.Account): boolean {
  return (
    account.metadata?.[STRIPE_ONBOARDING_STARTED_METADATA_KEY] === 'true' ||
    Boolean(account.details_submitted)
  )
}

export function shouldAttemptKycPrefillSync(account: Stripe.Account): boolean {
  return !hasStripeOnboardingStarted(account)
}

function cleanString(value: string | null | undefined): string | undefined {
  const normalized = normalizeHumanText(value)
  return normalized ? normalized : undefined
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

function toStripeBusinessId(
  rawBusinessId: string | null | undefined,
  rawCountry: string | null | undefined
): string | undefined {
  const normalized = normalizeBusinessId(rawBusinessId)
  if (!normalized) return undefined

  const country = normalizeCountry(rawCountry || 'France')
  if (country === 'France' && !isValidFrenchBusinessId(normalized)) {
    return undefined
  }

  return normalized
}

function buildCompanyPayload(
  annonceur: Annonceur
): Stripe.AccountCreateParams.Company | Stripe.AccountUpdateParams.Company {
  return {
    name: cleanString(annonceur.nom_entreprise) || cleanString(annonceur.nom_formation),
    tax_id: toStripeBusinessId(
      annonceur.numero_legal,
      annonceur.pays_entreprise || annonceur.siege_pays
    ),
    address: toStripeAddress(
      annonceur.siege_rue,
      annonceur.siege_ville,
      annonceur.siege_code_postal,
      annonceur.siege_pays || annonceur.pays_entreprise
    ),
  }
}

function buildBusinessProfileCreatePayload(
  annonceur: Annonceur
): Stripe.AccountCreateParams.BusinessProfile {
  const websiteUrl = normalizeWebsiteUrl(annonceur.site_internet)

  return {
    name: cleanString(annonceur.nom_formation),
    mcc: EVENT_TICKETING_MCC,
    ...(websiteUrl ? { url: websiteUrl, support_url: websiteUrl } : {}),
  }
}

function buildBusinessProfileUpdatePayload(
  annonceur: Annonceur
): Stripe.AccountUpdateParams.BusinessProfile {
  return {
    ...buildBusinessProfileCreatePayload(annonceur),
    product_description: undefined,
  }
}

export function buildRepresentativePersonPayload(
  annonceur: Annonceur
): Stripe.AccountCreatePersonParams | Stripe.AccountUpdatePersonParams {
  return {
    first_name: cleanString(annonceur.representant_prenom),
    last_name: cleanString(annonceur.representant_nom),
    dob: toStripeDob(annonceur.representant_date_naissance),
    address: toStripeAddress(
      annonceur.representant_adresse_rue,
      annonceur.representant_adresse_ville,
      annonceur.representant_adresse_code_postal,
      annonceur.representant_adresse_pays
    ),
    relationship: {
      representative: true,
    },
    metadata: {
      annonceur_id: annonceur.id,
      platform: 'scenio',
      role: 'representative',
    },
  }
}

export function buildAccountPayload(annonceur: Annonceur): Stripe.AccountCreateParams {
  const country = toStripeCountryCode(annonceur.pays_entreprise || annonceur.siege_pays || 'France')

  const payload: Stripe.AccountCreateParams = {
    type: 'express',
    country,
    email: annonceur.email,
    business_type: 'company',
    metadata: buildStripeMetadata(annonceur, false),
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: buildBusinessProfileCreatePayload(annonceur),
    company: buildCompanyPayload(annonceur) as Stripe.AccountCreateParams.Company,
  }

  return payload
}

function shouldSyncStripeAccountEmail(onboardingStarted?: boolean): boolean {
  // Stripe can reject email edits once the connected account onboarding has started.
  return !onboardingStarted
}

export function buildSafeAccountUpdatePayload(
  annonceur: Annonceur,
  onboardingStarted?: boolean
): Stripe.AccountUpdateParams {
  const payload: Stripe.AccountUpdateParams = {
    metadata: buildStripeMetadata(annonceur, onboardingStarted),
    business_profile: buildBusinessProfileUpdatePayload(annonceur),
  }

  if (shouldSyncStripeAccountEmail(onboardingStarted)) {
    payload.email = annonceur.email
  }

  return payload
}

export function buildPrefillAccountUpdatePayload(
  annonceur: Annonceur,
  onboardingStarted?: boolean
): Stripe.AccountUpdateParams {
  const payload = buildSafeAccountUpdatePayload(annonceur, onboardingStarted)

  payload.company = buildCompanyPayload(annonceur) as Stripe.AccountUpdateParams.Company

  return payload
}
