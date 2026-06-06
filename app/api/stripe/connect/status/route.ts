import { NextRequest, NextResponse } from 'next/server'
import { requireAdvertiser } from '@/server/auth'
import { getReadableStripeError } from '@/lib/stripe-error-message'
import { getStripe } from '@/lib/stripe'
import {
  buildStoredStripeConnectSnapshot,
  getDisconnectedStripeConnectSnapshot,
  StripeConnectSyncError,
  syncStripeConnectForAnnonceur,
} from '@/lib/stripe-connect'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdvertiser()
    if (!auth.ok) return auth.response
    const { supabase, profile: annonceur } = auth
    if (!annonceur.stripe_account_id) {
      return NextResponse.json(getDisconnectedStripeConnectSnapshot())
    }

    const refresh = request.nextUrl.searchParams.get('refresh') !== 'false'
    if (!refresh) {
      return NextResponse.json(buildStoredStripeConnectSnapshot(annonceur))
    }

    const stripe = getStripe()
    const { snapshot } = await syncStripeConnectForAnnonceur(supabase, stripe, annonceur, {
      allowCreate: false,
      persist: true,
    })

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('Erreur recuperation statut Stripe Connect:', error)
    if (error instanceof StripeConnectSyncError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
    return NextResponse.json(
      { error: getReadableStripeError(error) },
      { status: 500 }
    )
  }
}
