import { NextResponse } from 'next/server'
import { requireAdvertiser } from '@/app/server/auth'
import { getReadableStripeError, getStripeErrorParam, getStripeErrorStatus } from '@/lib/stripe-error-message'
import { getStripe } from '@/lib/stripe'
import {
  StripeConnectSyncError,
  syncStripeConnectForAnnonceur,
} from '@/lib/stripe-connect'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const auth = await requireAdvertiser()
    if (!auth.ok) return auth.response
    const { supabase, profile: annonceur } = auth
    const stripe = getStripe()
    const { snapshot } = await syncStripeConnectForAnnonceur(supabase, stripe, annonceur, {
      allowCreate: true,
      persist: true,
    })

    return NextResponse.json({
      connected: snapshot.connected,
      stripe_account_id: snapshot.stripe_account_id,
      stripe_onboarding_complete: snapshot.stripe_onboarding_complete,
      stripe_charges_enabled: snapshot.stripe_charges_enabled,
      stripe_payouts_enabled: snapshot.stripe_payouts_enabled,
      stripe_details_submitted: snapshot.stripe_details_submitted,
    })
  } catch (error) {
    console.error('Erreur creation/sync compte Stripe Connect:', error)
    if (error instanceof StripeConnectSyncError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
    return NextResponse.json(
      { error: getReadableStripeError(error), param: getStripeErrorParam(error) },
      { status: getStripeErrorStatus(error) }
    )
  }
}
