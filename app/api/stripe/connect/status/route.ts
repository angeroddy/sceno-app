import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { getReadableStripeError } from '@/app/lib/stripe-error-message'
import { getStripe } from '@/app/lib/stripe'
import {
  buildStoredStripeConnectSnapshot,
  getDisconnectedStripeConnectSnapshot,
  StripeConnectSyncError,
  syncStripeConnectForAnnonceur,
} from '@/app/lib/stripe-connect'
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
