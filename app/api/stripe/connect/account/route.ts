import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { getReadableStripeError, getStripeErrorParam, getStripeErrorStatus } from '@/app/lib/stripe-error-message'
import { getStripe } from '@/app/lib/stripe'
import {
  StripeConnectSyncError,
  syncStripeConnectForAnnonceur,
} from '@/app/lib/stripe-connect'
import type { Annonceur } from '@/app/types'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { data: annonceurData, error: annonceurError } = await supabase
      .from('annonceurs')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (annonceurError || !annonceurData) {
      return NextResponse.json({ error: 'Profil annonceur introuvable' }, { status: 404 })
    }

    const annonceur = annonceurData as Annonceur
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
