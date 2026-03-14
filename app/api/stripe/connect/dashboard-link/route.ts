import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { getStripe } from '@/app/lib/stripe'
import type { Annonceur } from '@/app/types'

export const runtime = 'nodejs'

function getReadableStripeError(error: unknown): string {
  if (error instanceof Stripe.errors.StripeError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Erreur serveur interne'
}

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

    if (
      !annonceur.stripe_account_id ||
      !annonceur.stripe_onboarding_complete ||
      !annonceur.stripe_charges_enabled ||
      !annonceur.stripe_payouts_enabled
    ) {
      return NextResponse.json(
        { error: "Le compte Stripe n'est pas encore pret pour acceder au dashboard" },
        { status: 409 }
      )
    }

    const stripe = getStripe()
    const loginLink = await stripe.accounts.createLoginLink(annonceur.stripe_account_id)

    return NextResponse.json({ url: loginLink.url })
  } catch (error) {
    console.error('Erreur creation login link Stripe:', error)
    return NextResponse.json(
      { error: getReadableStripeError(error) },
      { status: 500 }
    )
  }
}
