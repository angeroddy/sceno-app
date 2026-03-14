import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { getStripe } from '@/app/lib/stripe'
import { extractStripeAccountStatus } from '@/app/lib/stripe-connect'
import type { Annonceur } from '@/app/types'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
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
    if (!annonceur.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        stripe_account_id: null,
        stripe_onboarding_complete: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        stripe_details_submitted: false,
      })
    }

    const refresh = request.nextUrl.searchParams.get('refresh') !== 'false'
    if (!refresh) {
      return NextResponse.json({
        connected: true,
        stripe_account_id: annonceur.stripe_account_id,
        stripe_onboarding_complete: annonceur.stripe_onboarding_complete,
        stripe_charges_enabled: annonceur.stripe_charges_enabled,
        stripe_payouts_enabled: annonceur.stripe_payouts_enabled,
        stripe_details_submitted: annonceur.stripe_details_submitted,
      })
    }

    const stripe = getStripe()
    const stripeAccount = await stripe.accounts.retrieve(annonceur.stripe_account_id)
    const stripeStatus = extractStripeAccountStatus(stripeAccount)

    await supabase
      .from('annonceurs')
      .update(stripeStatus as unknown as never)
      .eq('id', annonceur.id)

    return NextResponse.json({
      connected: true,
      stripe_account_id: annonceur.stripe_account_id,
      ...stripeStatus,
    })
  } catch (error) {
    console.error('Erreur recuperation statut Stripe Connect:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
