import type Stripe from 'stripe'
import type { Annonceur } from '@/app/types'
import {
  StripeConnectSyncError,
  type StripeAccountRequirementsSummary,
  type StripeAccountStatus,
  type StripeAnnonceurUpdater,
  type StripeConnectSnapshot,
  type StripeStatusPersistence,
} from './types'

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
