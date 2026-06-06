import type Stripe from 'stripe'
import type { Annonceur } from '@/app/types'

export const STRIPE_ONBOARDING_STARTED_METADATA_KEY = 'scenio_onboarding_started'
export const EVENT_TICKETING_MCC = '7922'

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

export type StripeStatusPersistence = Pick<
  Annonceur,
  | 'stripe_account_id'
  | 'stripe_onboarding_complete'
  | 'stripe_charges_enabled'
  | 'stripe_payouts_enabled'
  | 'stripe_details_submitted'
>

export type StripeAnnonceurUpdater = {
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

export interface SyncExpressAccountForAnnonceurOptions {
  syncKycPrefill?: boolean
  onboardingStarted?: boolean
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
