import { NextResponse } from 'next/server'
import { requireAdvertiser } from '@/app/server/auth'
import { getReadableStripeError } from '@/app/lib/stripe-error-message'
import { getStripe } from '@/app/lib/stripe'
import {
  buildStoredStripeConnectSnapshot,
  StripeConnectSyncError,
  syncStripeConnectForAnnonceur,
} from '@/app/lib/stripe-connect'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const auth = await requireAdvertiser()
    if (!auth.ok) return auth.response
    const { supabase, profile: annonceur } = auth
    const stripe = getStripe()
    let snapshot = buildStoredStripeConnectSnapshot(annonceur)

    if (!snapshot.stripe_dashboard_ready) {
      const syncResult = await syncStripeConnectForAnnonceur(supabase, stripe, annonceur, {
        allowCreate: false,
        persist: true,
      })
      snapshot = syncResult.snapshot
    }

    if (
      !snapshot.stripe_account_id ||
      !snapshot.stripe_onboarding_complete ||
      !snapshot.stripe_charges_enabled ||
      !snapshot.stripe_payouts_enabled
    ) {
      return NextResponse.json(
        { error: "Le compte Stripe n'est pas encore pret pour acceder au dashboard" },
        { status: 409 }
      )
    }

    const loginLink = await stripe.accounts.createLoginLink(snapshot.stripe_account_id)

    return NextResponse.json({ url: loginLink.url })
  } catch (error) {
    console.error('Erreur creation login link Stripe:', error)
    if (error instanceof StripeConnectSyncError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
    return NextResponse.json(
      { error: getReadableStripeError(error) },
      { status: 500 }
    )
  }
}
