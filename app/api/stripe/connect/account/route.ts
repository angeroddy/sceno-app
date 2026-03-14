import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { getStripe } from '@/app/lib/stripe'
import {
  createExpressAccountForAnnonceur,
  extractStripeAccountStatus,
  syncExpressAccountForAnnonceur,
} from '@/app/lib/stripe-connect'
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
    const stripe = getStripe()

    let accountId = annonceur.stripe_account_id
    let stripeAccount

    if (accountId) {
      await syncExpressAccountForAnnonceur(stripe, accountId, annonceur)
      stripeAccount = await stripe.accounts.retrieve(accountId)
    } else {
      stripeAccount = await createExpressAccountForAnnonceur(stripe, annonceur)
      accountId = stripeAccount.id
    }

    const stripeStatus = extractStripeAccountStatus(stripeAccount)

    const { error: updateError } = await supabase
      .from('annonceurs')
      .update({
        stripe_account_id: accountId,
        ...stripeStatus,
      } as unknown as never)
      .eq('id', annonceur.id)

    if (updateError) {
      console.error('Erreur update annonceur stripe account:', updateError)
      return NextResponse.json({ error: 'Impossible de sauvegarder le compte Stripe' }, { status: 500 })
    }

    return NextResponse.json({
      connected: true,
      stripe_account_id: accountId,
      ...stripeStatus,
    })
  } catch (error) {
    console.error('Erreur creation/sync compte Stripe Connect:', error)
    return NextResponse.json(
      { error: getReadableStripeError(error) },
      { status: 500 }
    )
  }
}
