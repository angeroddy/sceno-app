import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { getReadableStripeError } from '@/app/lib/stripe-error-message'
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
      allowCreate: false,
      persist: true,
    })

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
