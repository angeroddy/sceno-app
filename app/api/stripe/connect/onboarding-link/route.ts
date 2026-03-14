import { NextRequest, NextResponse } from 'next/server'
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

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  return request.nextUrl.origin.replace(/\/$/, '')
}

export async function POST(request: NextRequest) {
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

    let stripeAccountId = annonceur.stripe_account_id
    let stripeAccount

    if (stripeAccountId) {
      await syncExpressAccountForAnnonceur(stripe, stripeAccountId, annonceur)
      stripeAccount = await stripe.accounts.retrieve(stripeAccountId)
    } else {
      stripeAccount = await createExpressAccountForAnnonceur(stripe, annonceur)
      stripeAccountId = stripeAccount.id
    }

    const stripeStatus = extractStripeAccountStatus(stripeAccount)
    await supabase
      .from('annonceurs')
      .update({
        stripe_account_id: stripeAccountId,
        ...stripeStatus,
      } as unknown as never)
      .eq('id', annonceur.id)

    let returnPath = '/annonceur/parametres?stripe=return'
    let refreshPath = '/annonceur/parametres?stripe=refresh'
    try {
      const body = await request.json() as { returnPath?: string; refreshPath?: string }
      if (body.returnPath) returnPath = body.returnPath
      if (body.refreshPath) refreshPath = body.refreshPath
    } catch {
      // Body optionnel.
    }

    const baseUrl = getBaseUrl(request)
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId!,
      type: 'account_onboarding',
      return_url: `${baseUrl}${returnPath}`,
      refresh_url: `${baseUrl}${refreshPath}`,
    })

    return NextResponse.json({
      url: accountLink.url,
      stripe_account_id: stripeAccountId,
    })
  } catch (error) {
    console.error('Erreur creation lien onboarding Stripe:', error)
    return NextResponse.json(
      { error: getReadableStripeError(error) },
      { status: 500 }
    )
  }
}
