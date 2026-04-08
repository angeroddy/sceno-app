import Stripe from 'stripe'
import type { Annonceur } from '@/app/types'
import {
  isValidFrenchBusinessId,
  normalizeBusinessId,
  normalizeCountry,
  normalizeHumanText,
  normalizePostalCode,
} from '@/app/lib/signup-validation'

const STRIPE_ONBOARDING_STARTED_METADATA_KEY = 'scenio_onboarding_started'

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

export interface StripeConnectSnapshot
  extends StripeAccountStatus,
    StripeAccountRequirementsSummary {
  connected: boolean
  stripe_account_id: string | null
  stripe_dashboard_ready: boolean
}

type StripeStatusPersistence = Pick<
  Annonceur,
  | 'stripe_account_id'
  | 'stripe_onboarding_complete'
  | 'stripe_charges_enabled'
  | 'stripe_payouts_enabled'
  | 'stripe_details_submitted'
>

type StripeAnnonceurUpdater = {
  from: (table: 'annonceurs') => {
    update: (payload: unknown) => {
      eq: (column: string, value: string) => PromiseLike<{ error: { message?: string } | null }>
    }
  }
}

export interface SyncStripeConnectForAnnonceurOptions {
  allowCreate?: boolean
  persist?: boolean
}

export interface SyncStripeConnectForAnnonceurResult {
  account: Stripe.Account | null
  snapshot: StripeConnectSnapshot
  created: boolean
}

export class StripeConnectSyncError extends Error {
  code: string
  cause?: unknown

  constructor(code: string, message: string, cause?: unknown) {
    super(message)
    this.name = 'StripeConnectSyncError'
    this.code = code
    this.cause = cause
  }
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

export function getDisconnectedStripeConnectSnapshot(): StripeConnectSnapshot {
  return {
    connected: false,
    stripe_account_id: null,
    stripe_onboarding_complete: false,
    stripe_charges_enabled: false,
    stripe_payouts_enabled: false,
    stripe_details_submitted: false,
    stripe_requirements_currently_due: [],
    stripe_requirements_pending_verification: [],
    stripe_requirements_eventually_due: [],
    stripe_requirements_disabled_reason: null,
    stripe_has_pending_representative_verification: false,
    stripe_dashboard_ready: false,
  }
}

export function buildStripeConnectSnapshot(
  accountId: string | null,
  account: Stripe.Account | null
): StripeConnectSnapshot {
  if (!accountId || !account) {
    return getDisconnectedStripeConnectSnapshot()
  }

  const status = extractStripeAccountStatus(account)
  const requirements = extractStripeAccountRequirementsSummary(account)

  return {
    connected: true,
    stripe_account_id: accountId,
    ...status,
    ...requirements,
    stripe_dashboard_ready:
      status.stripe_onboarding_complete &&
      status.stripe_charges_enabled &&
      status.stripe_payouts_enabled,
  }
}

export function buildStoredStripeConnectSnapshot(
  annonceur: Pick<
    Annonceur,
    | 'stripe_account_id'
    | 'stripe_onboarding_complete'
    | 'stripe_charges_enabled'
    | 'stripe_payouts_enabled'
    | 'stripe_details_submitted'
  >
): StripeConnectSnapshot {
  if (!annonceur.stripe_account_id) {
    return getDisconnectedStripeConnectSnapshot()
  }

  return {
    connected: true,
    stripe_account_id: annonceur.stripe_account_id,
    stripe_onboarding_complete: annonceur.stripe_onboarding_complete,
    stripe_charges_enabled: annonceur.stripe_charges_enabled,
    stripe_payouts_enabled: annonceur.stripe_payouts_enabled,
    stripe_details_submitted: annonceur.stripe_details_submitted,
    stripe_requirements_currently_due: [],
    stripe_requirements_pending_verification: [],
    stripe_requirements_eventually_due: [],
    stripe_requirements_disabled_reason: null,
    stripe_has_pending_representative_verification: false,
    stripe_dashboard_ready:
      annonceur.stripe_onboarding_complete &&
      annonceur.stripe_charges_enabled &&
      annonceur.stripe_payouts_enabled,
  }
}

function getPersistedStripeStatus(snapshot: StripeConnectSnapshot): StripeStatusPersistence {
  return {
    stripe_account_id: snapshot.stripe_account_id,
    stripe_onboarding_complete: snapshot.stripe_onboarding_complete,
    stripe_charges_enabled: snapshot.stripe_charges_enabled,
    stripe_payouts_enabled: snapshot.stripe_payouts_enabled,
    stripe_details_submitted: snapshot.stripe_details_submitted,
  }
}

export async function persistStripeConnectSnapshot(
  supabase: StripeAnnonceurUpdater,
  annonceurId: string,
  snapshot: StripeConnectSnapshot
): Promise<void> {
  const { error } = await supabase
    .from('annonceurs')
    .update(getPersistedStripeStatus(snapshot) as unknown as never)
    .eq('id', annonceurId)

  if (error) {
    throw new StripeConnectSyncError(
      'stripe_status_persist_failed',
      'Impossible de sauvegarder le statut Stripe',
      error
    )
  }
}

function isStripeMissingAccountError(error: unknown): boolean {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return false
  }

  const raw =
    typeof error.raw === 'object' && error.raw !== null
      ? (error.raw as { code?: string; message?: string })
      : null

  return (
    error.code === 'resource_missing' ||
    raw?.code === 'resource_missing' ||
    error.statusCode === 404 ||
    /^No such account\b/i.test(error.message) ||
    /^No such account\b/i.test(raw?.message ?? '')
  )
}

function buildStripeMetadata(
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

function hasStripeOnboardingStarted(account: Stripe.Account): boolean {
  return (
    account.metadata?.[STRIPE_ONBOARDING_STARTED_METADATA_KEY] === 'true' ||
    Boolean(account.details_submitted)
  )
}

function shouldAttemptKycPrefillSync(account: Stripe.Account): boolean {
  return !hasStripeOnboardingStarted(account)
}

async function retrieveOrRecreateStripeAccount(
  stripe: Stripe,
  annonceur: Annonceur,
  allowCreate: boolean
): Promise<{ account: Stripe.Account | null; accountId: string | null; created: boolean }> {
  let accountId = annonceur.stripe_account_id
  let created = false

  if (!accountId) {
    if (!allowCreate) {
      return { account: null, accountId: null, created: false }
    }

    const createdAccount = await createExpressAccountForAnnonceur(stripe, annonceur)
    return { account: createdAccount, accountId: createdAccount.id, created: true }
  }

  try {
    let account: Stripe.Account = await stripe.accounts.retrieve(accountId)

    if (shouldAttemptKycPrefillSync(account)) {
      account = await syncExpressAccountForAnnonceur(stripe, accountId, annonceur, {
        syncKycPrefill: true,
        onboardingStarted: false,
      })
    } else {
      account = await syncExpressAccountForAnnonceur(stripe, accountId, annonceur, {
        syncKycPrefill: false,
        onboardingStarted: hasStripeOnboardingStarted(account),
      })
    }

    return { account, accountId, created }
  } catch (error) {
    if (!isStripeMissingAccountError(error) || !allowCreate) {
      throw error
    }

    const recreatedAccount = await createExpressAccountForAnnonceur(stripe, annonceur)
    accountId = recreatedAccount.id
    created = true
    return { account: recreatedAccount, accountId, created }
  }
}

export async function syncStripeConnectForAnnonceur(
  supabase: StripeAnnonceurUpdater,
  stripe: Stripe,
  annonceur: Annonceur,
  options: SyncStripeConnectForAnnonceurOptions = {}
): Promise<SyncStripeConnectForAnnonceurResult> {
  const { allowCreate = false, persist = true } = options

  const { account, accountId, created } = await retrieveOrRecreateStripeAccount(
    stripe,
    annonceur,
    allowCreate
  )
  const snapshot = buildStripeConnectSnapshot(accountId, account)

  if (persist) {
    await persistStripeConnectSnapshot(supabase, annonceur.id, snapshot)
  }

  return {
    account,
    snapshot,
    created,
  }
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

function buildRepresentativePersonPayload(
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

function buildAccountPayload(annonceur: Annonceur): Stripe.AccountCreateParams {
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
    business_profile: {
      name: cleanString(annonceur.nom_formation),
    },
    company: buildCompanyPayload(annonceur) as Stripe.AccountCreateParams.Company,
  }

  return payload
}

function shouldSyncStripeAccountEmail(onboardingStarted?: boolean): boolean {
  // Stripe can reject email edits once the connected account onboarding has started.
  return !onboardingStarted
}

function buildSafeAccountUpdatePayload(
  annonceur: Annonceur,
  onboardingStarted?: boolean
): Stripe.AccountUpdateParams {
  const payload: Stripe.AccountUpdateParams = {
    metadata: buildStripeMetadata(annonceur, onboardingStarted),
    business_profile: {
      name: cleanString(annonceur.nom_formation),
    },
  }

  if (shouldSyncStripeAccountEmail(onboardingStarted)) {
    payload.email = annonceur.email
  }

  return payload
}

function buildPrefillAccountUpdatePayload(
  annonceur: Annonceur,
  onboardingStarted?: boolean
): Stripe.AccountUpdateParams {
  const payload = buildSafeAccountUpdatePayload(annonceur, onboardingStarted)

  payload.company = buildCompanyPayload(annonceur) as Stripe.AccountUpdateParams.Company

  return payload
}

function isStripeUnauthorizedEmailUpdateError(error: unknown): boolean {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return false
  }

  const raw =
    typeof error.raw === 'object' && error.raw !== null
      ? (error.raw as { message?: string; param?: string })
      : null

  return (
    raw?.param === 'email' ||
    /not authorized to edit the parameter ['`"]email['`"]/i.test(error.message) ||
    /not authorized to edit the parameter ['`"]email['`"]/i.test(raw?.message ?? '')
  )
}

function omitStripeAccountEmail(
  payload: Stripe.AccountUpdateParams
): Stripe.AccountUpdateParams {
  const { email, ...payloadWithoutEmail } = payload
  if (typeof email === 'undefined') {
    return payload
  }
  return payloadWithoutEmail
}

async function updateStripeAccountWithEmailFallback(
  stripe: Stripe,
  accountId: string,
  payload: Stripe.AccountUpdateParams
): Promise<void> {
  try {
    await stripe.accounts.update(accountId, payload)
  } catch (error) {
    if (typeof payload.email === 'undefined' || !isStripeUnauthorizedEmailUpdateError(error)) {
      throw error
    }

    await stripe.accounts.update(accountId, omitStripeAccountEmail(payload))
  }
}

async function syncRepresentativePersonForAnnonceur(
  stripe: Stripe,
  accountId: string,
  annonceur: Annonceur
): Promise<void> {
  const representative = buildRepresentativePersonPayload(annonceur)
  const existingPersons = await stripe.accounts.listPersons(accountId, {
    limit: 1,
    relationship: {
      representative: true,
    },
  })
  const existingRepresentative = existingPersons.data[0]

  if (existingRepresentative?.id) {
    await stripe.accounts.updatePerson(
      accountId,
      existingRepresentative.id,
      representative as Stripe.AccountUpdatePersonParams
    )
    return
  }

  await stripe.accounts.createPerson(
    accountId,
    representative as Stripe.AccountCreatePersonParams
  )
}

export async function markStripeOnboardingStarted(
  stripe: Stripe,
  accountId: string,
  annonceur: Annonceur
): Promise<void> {
  await stripe.accounts.update(accountId, {
    metadata: buildStripeMetadata(annonceur, true),
  })
}

export async function createExpressAccountForAnnonceur(
  stripe: Stripe,
  annonceur: Annonceur
): Promise<Stripe.Account> {
  const account = await stripe.accounts.create(buildAccountPayload(annonceur))

  try {
    await syncRepresentativePersonForAnnonceur(stripe, account.id, annonceur)
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeError)) {
      throw error
    }

    console.warn(
      `Prefill Stripe du représentant impossible pour le compte ${account.id}: ${error.message}`
    )
  }

  return stripe.accounts.retrieve(account.id)
}

export interface SyncExpressAccountForAnnonceurOptions {
  syncKycPrefill?: boolean
  onboardingStarted?: boolean
}

export async function syncExpressAccountForAnnonceur(
  stripe: Stripe,
  accountId: string,
  annonceur: Annonceur,
  options: SyncExpressAccountForAnnonceurOptions = {}
): Promise<Stripe.Account> {
  const { syncKycPrefill = false, onboardingStarted = false } = options
  const accountPayload = syncKycPrefill
    ? buildPrefillAccountUpdatePayload(annonceur, onboardingStarted)
    : buildSafeAccountUpdatePayload(annonceur, onboardingStarted)

  try {
    await updateStripeAccountWithEmailFallback(stripe, accountId, accountPayload)

    if (syncKycPrefill) {
      await syncRepresentativePersonForAnnonceur(stripe, accountId, annonceur)
    }
  } catch (error) {
    if (!syncKycPrefill || !(error instanceof Stripe.errors.StripeError)) {
      throw error
    }

    await updateStripeAccountWithEmailFallback(
      stripe,
      accountId,
      buildSafeAccountUpdatePayload(annonceur, onboardingStarted)
    )
  }

  return stripe.accounts.retrieve(accountId)
}
