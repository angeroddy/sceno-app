import { NextRequest, NextResponse } from 'next/server'
import { requireAdvertiser } from '@/server/auth'
import { getReadableStripeError, getStripeErrorParam, getStripeErrorStatus } from '@/lib/stripe-error-message'
import { getStripe } from '@/lib/stripe'
import {
  markStripeOnboardingStarted,
  StripeConnectSyncError,
  syncStripeConnectForAnnonceur,
} from '@/lib/stripe-connect'

export const runtime = 'nodejs'

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  return request.nextUrl.origin.replace(/\/$/, '')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdvertiser()
    if (!auth.ok) return auth.response
    const { supabase, profile: annonceur } = auth
    const stripe = getStripe()

    let stripeAccountId = annonceur.stripe_account_id

    if (!stripeAccountId) {
      const { snapshot } = await syncStripeConnectForAnnonceur(supabase, stripe, annonceur, {
        allowCreate: true,
        persist: true,
      })
      stripeAccountId = snapshot.stripe_account_id
    }

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Impossible de trouver ou créer le compte Stripe' },
        { status: 500 }
      )
    }

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
    const createAccountLink = (accountId: string) =>
      stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        return_url: `${baseUrl}${returnPath}`,
        refresh_url: `${baseUrl}${refreshPath}`,
      })

    let accountLink
    try {
      accountLink = await createAccountLink(stripeAccountId)
    } catch (error) {
      if (!annonceur.stripe_account_id) {
        throw error
      }

      const { snapshot } = await syncStripeConnectForAnnonceur(supabase, stripe, annonceur, {
        allowCreate: true,
        persist: true,
      })

      if (!snapshot.stripe_account_id) {
        throw error
      }

      stripeAccountId = snapshot.stripe_account_id
      accountLink = await createAccountLink(stripeAccountId)
    }
    await markStripeOnboardingStarted(stripe, stripeAccountId, annonceur)

    return NextResponse.json({
      url: accountLink.url,
      stripe_account_id: stripeAccountId,
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
