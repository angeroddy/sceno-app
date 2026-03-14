import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { getStripe } from '@/app/lib/stripe'
import { reconcileOpportunityPlaces } from '@/app/lib/opportunity-availability'
import type { Achat, Annonceur, Comedien, Opportunite } from '@/app/types'

export const runtime = 'nodejs'

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  return request.nextUrl.origin.replace(/\/$/, '')
}

function getPlatformFeePercent(): number {
  const raw = process.env.STRIPE_PLATFORM_FEE_PERCENT || '0'
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error('Configuration invalide: STRIPE_PLATFORM_FEE_PERCENT doit être entre 0 et 100')
  }
  return value
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const stripe = getStripe()

  try {
    const body = await request.json() as { opportuniteId?: string }
    const opportuniteId = body.opportuniteId
    if (!opportuniteId) {
      return NextResponse.json({ error: 'opportuniteId est requis' }, { status: 400 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { data: comedienData, error: comedienError } = await supabase
      .from('comediens')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (comedienError || !comedienData) {
      return NextResponse.json({ error: 'Profil comedien introuvable' }, { status: 404 })
    }
    const comedien = comedienData as Pick<Comedien, 'id'>

    const { data: opportuniteData, error: opportuniteError } = await supabase
      .from('opportunites')
      .select('id, annonceur_id, titre, prix_reduit, prix_base, places_restantes, date_evenement, statut')
      .eq('id', opportuniteId)
      .eq('statut', 'validee')
      .single()

    if (opportuniteError || !opportuniteData) {
      return NextResponse.json({ error: 'Opportunite indisponible' }, { status: 404 })
    }

    const opportunite = opportuniteData as Pick<
      Opportunite,
      'id' | 'annonceur_id' | 'titre' | 'prix_reduit' | 'prix_base' | 'places_restantes' | 'date_evenement'
    >

    const { data: blockedAnnonceur } = await supabase
      .from('annonceurs_bloques')
      .select('annonceur_id')
      .eq('comedien_id', comedien.id)
      .eq('annonceur_id', opportunite.annonceur_id)
      .maybeSingle()

    if (blockedAnnonceur) {
      return NextResponse.json({ error: 'Opportunite indisponible' }, { status: 404 })
    }

    const reconciledOpportunity = await reconcileOpportunityPlaces(supabase as never, opportunite.id)
    if (reconciledOpportunity) {
      opportunite.places_restantes = reconciledOpportunity.places_restantes
    }

    if (opportunite.places_restantes <= 0) {
      return NextResponse.json({ error: 'Cette opportunite est complete' }, { status: 409 })
    }
    if (new Date(opportunite.date_evenement) <= new Date()) {
      return NextResponse.json({ error: 'Cette opportunite est expiree' }, { status: 409 })
    }

    const { data: annonceurData, error: annonceurError } = await supabase
      .from('annonceurs')
      .select('id, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
      .eq('id', opportunite.annonceur_id)
      .single()

    if (annonceurError || !annonceurData) {
      return NextResponse.json({ error: 'Annonceur introuvable' }, { status: 404 })
    }

    const annonceur = annonceurData as Pick<
      Annonceur,
      'id' | 'stripe_account_id' | 'stripe_charges_enabled' | 'stripe_payouts_enabled'
    >

    if (!annonceur.stripe_account_id) {
      return NextResponse.json(
        { error: "L'annonceur n'a pas encore activé Stripe Connect" },
        { status: 409 }
      )
    }
    if (!annonceur.stripe_charges_enabled || !annonceur.stripe_payouts_enabled) {
      return NextResponse.json(
        { error: "Le compte Stripe de l'annonceur n'est pas encore prêt" },
        { status: 409 }
      )
    }

    const { data: confirmedPurchase } = await supabase
      .from('achats')
      .select('id')
      .eq('comedien_id', comedien.id)
      .eq('opportunite_id', opportunite.id)
      .eq('statut', 'confirmee')
      .maybeSingle()

    if (confirmedPurchase) {
      return NextResponse.json({ error: 'Vous avez deja reserve cette opportunite' }, { status: 409 })
    }

    const { data: pendingPurchases } = await supabase
      .from('achats')
      .select('id, stripe_checkout_session_id, statut')
      .eq('comedien_id', comedien.id)
      .eq('opportunite_id', opportunite.id)
      .eq('statut', 'en_attente')
      .order('created_at', { ascending: false })
      .limit(5)

    for (const pending of pendingPurchases || []) {
      const pendingAchat = pending as Pick<Achat, 'id' | 'stripe_checkout_session_id' | 'statut'>
      if (!pendingAchat.stripe_checkout_session_id) {
        await supabase
          .from('achats')
          .update({ statut: 'annulee' } as unknown as never)
          .eq('id', pendingAchat.id)
          .eq('statut', 'en_attente')
        continue
      }

      try {
        const existingSession = await stripe.checkout.sessions.retrieve(pendingAchat.stripe_checkout_session_id)
        if (existingSession.status === 'open' && existingSession.url) {
          return NextResponse.json({ url: existingSession.url, achatId: pendingAchat.id }, { status: 200 })
        }
      } catch (sessionError) {
        console.warn('Session Stripe introuvable/expirée, achat annulé:', sessionError)
      }

      await supabase
        .from('achats')
        .update({ statut: 'annulee' } as unknown as never)
        .eq('id', pendingAchat.id)
        .eq('statut', 'en_attente')
    }

    const prixEuros = opportunite.prix_reduit > 0 ? opportunite.prix_reduit : opportunite.prix_base
    const amount = Math.round(prixEuros * 100)
    if (amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide pour cette opportunite' }, { status: 400 })
    }

    const commissionPercent = getPlatformFeePercent()
    const applicationFeeAmount = Math.round((amount * commissionPercent) / 100)

    const recyclablePurchaseResult = await supabase
      .from('achats')
      .select('id, statut')
      .eq('comedien_id', comedien.id)
      .eq('opportunite_id', opportunite.id)
      .in('statut', ['remboursee', 'annulee'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const recyclablePurchase = recyclablePurchaseResult.data as Pick<Achat, 'id' | 'statut'> | null

    let achatData: { id: string } | null = null
    let achatError: { message?: string } | null = null

    if (recyclablePurchase?.id) {
      const { data: updatedPurchase, error: updatedPurchaseError } = await supabase
        .from('achats')
        .update({
          prix_paye: prixEuros,
          statut: 'en_attente',
          stripe_payment_id: null,
          stripe_checkout_session_id: null,
          stripe_payment_intent_id: null,
          stripe_refund_id: null,
          application_fee_amount: applicationFeeAmount,
          transfer_destination: annonceur.stripe_account_id,
          last_stripe_event_id: null,
        } as unknown as never)
        .eq('id', recyclablePurchase.id)
        .select('id')
        .single()

      achatData = updatedPurchase as { id: string } | null
      achatError = updatedPurchaseError as { message?: string } | null
    } else {
      const { data: insertedPurchase, error: insertedPurchaseError } = await supabase
        .from('achats')
        .insert({
          comedien_id: comedien.id,
          opportunite_id: opportunite.id,
          prix_paye: prixEuros,
          statut: 'en_attente',
          stripe_payment_id: null,
          stripe_checkout_session_id: null,
          stripe_payment_intent_id: null,
          stripe_refund_id: null,
          application_fee_amount: applicationFeeAmount,
          transfer_destination: annonceur.stripe_account_id,
          last_stripe_event_id: null,
        } as unknown as never)
        .select('id')
        .single()

      achatData = insertedPurchase as { id: string } | null
      achatError = insertedPurchaseError as { message?: string } | null
    }

    if (achatError || !achatData) {
      console.error('Erreur creation achat:', achatError)
      return NextResponse.json({ error: "Impossible d'initialiser la reservation" }, { status: 500 })
    }

    const achat = achatData as Pick<Achat, 'id'>
    const baseUrl = getBaseUrl(request)

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: achat.id,
        success_url: `${baseUrl}/dashboard?checkout=success&achat=${achat.id}`,
        cancel_url: `${baseUrl}/dashboard/opportunites/${opportunite.id}?checkout=cancel`,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: opportunite.titre,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          achat_id: achat.id,
          opportunite_id: opportunite.id,
          comedien_id: comedien.id,
        },
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: annonceur.stripe_account_id,
          },
          metadata: {
            achat_id: achat.id,
            opportunite_id: opportunite.id,
            comedien_id: comedien.id,
          },
        },
      })

      await supabase
        .from('achats')
        .update({
          stripe_checkout_session_id: session.id,
        } as unknown as never)
        .eq('id', achat.id)

      return NextResponse.json({ url: session.url, achatId: achat.id }, { status: 200 })
    } catch (stripeError) {
      await supabase
        .from('achats')
        .update({ statut: 'annulee' } as unknown as never)
        .eq('id', achat.id)
        .eq('statut', 'en_attente')

      throw stripeError
    }
  } catch (error) {
    console.error('Erreur checkout session:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
