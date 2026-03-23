import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { getReadableStripeError, getStripeErrorParam, getStripeErrorStatus } from '@/app/lib/stripe-error-message'
import { getStripe } from '@/app/lib/stripe'
import {
  markStripeOnboardingStarted,
  StripeConnectSyncError,
  syncStripeConnectForAnnonceur,
} from '@/app/lib/stripe-connect'
import type { Annonceur } from '@/app/types'

export const runtime = 'nodejs'

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
    const { snapshot } = await syncStripeConnectForAnnonceur(supabase, stripe, annonceur, {
      allowCreate: true,
      persist: true,
    })

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
      account: snapshot.stripe_account_id!,
      type: 'account_onboarding',
      return_url: `${baseUrl}${returnPath}`,
      refresh_url: `${baseUrl}${refreshPath}`,
    })
    await markStripeOnboardingStarted(stripe, snapshot.stripe_account_id!, annonceur)

    return NextResponse.json({
      url: accountLink.url,
      stripe_account_id: snapshot.stripe_account_id,
    })
  } catch (error) {
    console.error('Erreur creation lien onboarding Stripe:', error)
    if (error instanceof StripeConnectSyncError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
    return NextResponse.json(
      { error: getReadableStripeError(error), param: getStripeErrorParam(error) },
      { status: getStripeErrorStatus(error) }
    )
  }
}
