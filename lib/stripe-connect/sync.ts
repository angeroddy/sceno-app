import Stripe from 'stripe'
import type { Annonceur } from '@/types'
import {
  StripeConnectSyncError,
  type SyncExpressAccountForAnnonceurOptions,
  type SyncStripeConnectForAnnonceurOptions,
  type SyncStripeConnectForAnnonceurResult,
  type StripeAnnonceurUpdater,
} from './types'
import { buildStripeConnectSnapshot, persistStripeConnectSnapshot } from './snapshot'
import {
  buildAccountPayload,
  buildPrefillAccountUpdatePayload,
  buildRepresentativePersonPayload,
  buildSafeAccountUpdatePayload,
  buildStripeMetadata,
  hasStripeOnboardingStarted,
  shouldAttemptKycPrefillSync,
} from './payload-builders'

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

async function updateStripeAccountWithFallbacks(
  stripe: Stripe,
  accountId: string,
  payload: Stripe.AccountUpdateParams
): Promise<void> {
  let nextPayload = payload

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await stripe.accounts.update(accountId, nextPayload)
      return
    } catch (error) {
      if (isStripeUnauthorizedEmailUpdateError(error) && typeof nextPayload.email !== 'undefined') {
        nextPayload = omitStripeAccountEmail(nextPayload)
        continue
      }

      throw error
    }
  }

  throw new StripeConnectSyncError(
    'stripe_account_update_retry_exhausted',
    'Impossible de synchroniser le compte Stripe apres plusieurs tentatives'
  )
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
    await updateStripeAccountWithFallbacks(stripe, accountId, accountPayload)

    if (syncKycPrefill) {
      await syncRepresentativePersonForAnnonceur(stripe, accountId, annonceur)
    }
  } catch (error) {
    if (!syncKycPrefill || !(error instanceof Stripe.errors.StripeError)) {
      throw error
    }

    await updateStripeAccountWithFallbacks(
      stripe,
      accountId,
      buildSafeAccountUpdatePayload(annonceur, onboardingStarted)
    )
  }

  return stripe.accounts.retrieve(accountId)
}
