import type Stripe from 'stripe'
import type { ServerSupabaseClient } from '@/app/server/auth'
import {
  deriveOpportunityStatus,
  isOpportunityReservableByComedian,
  isOpportunityVisibleToComedian,
} from '@/lib/opportunity-status'
import { reconcileOpportunityPlaces } from '@/lib/opportunity-availability'
import { toStripeCents, calculatePlatformFee } from '@/lib/pricing'
import type { Achat, Annonceur, Opportunite } from '@/app/types'

export interface CreateCheckoutSessionParams {
  supabase: ServerSupabaseClient
  stripe: Stripe
  comedienId: string
  opportuniteId: string
  baseUrl: string
  platformFeePercent: number
}

export type CreateCheckoutSessionResult =
  | { ok: true; url: string | null; achatId: string }
  | { ok: false; status: number; error: string }

/**
 * Logique métier de création (ou recyclage) d'une réservation et de la session
 * Stripe Checkout associée. Renvoie un résultat typé que la route HTTP traduit en
 * réponse JSON. Extraite de app/api/checkout/session/route.ts pour la rendre testable
 * et garder la route comme simple orchestrateur.
 */
export async function createCheckoutSession({
  supabase,
  stripe,
  comedienId,
  opportuniteId,
  baseUrl,
  platformFeePercent,
}: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResult> {
  const { data: opportuniteData, error: opportuniteError } = await supabase
    .from('opportunites')
    .select('id, annonceur_id, titre, prix_reduit, prix_base, places_restantes, date_evenement, statut')
    .eq('id', opportuniteId)
    .single()

  if (opportuniteError || !opportuniteData) {
    return { ok: false, status: 404, error: 'Opportunite indisponible' }
  }

  const opportunite = opportuniteData as Pick<
    Opportunite,
    'id' | 'annonceur_id' | 'titre' | 'prix_reduit' | 'prix_base' | 'places_restantes' | 'date_evenement' | 'statut'
  >

  const { data: blockedAnnonceur } = await supabase
    .from('annonceurs_bloques')
    .select('annonceur_id')
    .eq('comedien_id', comedienId)
    .eq('annonceur_id', opportunite.annonceur_id)
    .maybeSingle()

  if (blockedAnnonceur) {
    return { ok: false, status: 404, error: 'Opportunite indisponible' }
  }

  if (!isOpportunityVisibleToComedian(opportunite.statut)) {
    return { ok: false, status: 404, error: 'Opportunite indisponible' }
  }

  const reconciledOpportunity = await reconcileOpportunityPlaces(supabase as never, opportunite.id)
  if (reconciledOpportunity) {
    opportunite.places_restantes = reconciledOpportunity.places_restantes
  }

  const derivedStatus = deriveOpportunityStatus({
    statut: opportunite.statut,
    date_evenement: opportunite.date_evenement,
    places_restantes: opportunite.places_restantes,
  })

  if (!isOpportunityReservableByComedian(derivedStatus)) {
    if (derivedStatus === 'supprimee') {
      return { ok: false, status: 404, error: 'Opportunité indisponible' }
    }
    if (derivedStatus === 'complete') {
      return { ok: false, status: 409, error: 'Cette opportunité est complète' }
    }
    if (derivedStatus === 'expiree') {
      return { ok: false, status: 409, error: 'Cette opportunité est expirée' }
    }
  }

  if (opportunite.places_restantes <= 0) {
    return { ok: false, status: 409, error: 'Cette opportunité est complète' }
  }
  if (new Date(opportunite.date_evenement) <= new Date()) {
    return { ok: false, status: 409, error: 'Cette opportunité est expirée' }
  }

  const { data: annonceurData, error: annonceurError } = await supabase
    .from('annonceurs')
    .select('id, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
    .eq('id', opportunite.annonceur_id)
    .single()

  if (annonceurError || !annonceurData) {
    return { ok: false, status: 404, error: 'Annonceur introuvable' }
  }

  const annonceur = annonceurData as Pick<
    Annonceur,
    'id' | 'stripe_account_id' | 'stripe_charges_enabled' | 'stripe_payouts_enabled'
  >

  if (!annonceur.stripe_account_id) {
    return { ok: false, status: 409, error: "L'annonceur n'a pas encore activé Stripe Connect" }
  }
  if (!annonceur.stripe_charges_enabled || !annonceur.stripe_payouts_enabled) {
    return { ok: false, status: 409, error: "Le compte Stripe de l'annonceur n'est pas encore prêt" }
  }

  const { data: confirmedPurchase } = await supabase
    .from('achats')
    .select('id')
    .eq('comedien_id', comedienId)
    .eq('opportunite_id', opportunite.id)
    .eq('statut', 'confirmee')
    .maybeSingle()

  if (confirmedPurchase) {
    return { ok: false, status: 409, error: 'Vous avez déjà réservé cette opportunité' }
  }

  const { data: pendingPurchases } = await supabase
    .from('achats')
    .select('id, stripe_checkout_session_id, statut')
    .eq('comedien_id', comedienId)
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
        return { ok: true, url: existingSession.url, achatId: pendingAchat.id }
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
  const amount = toStripeCents(prixEuros)
  if (amount <= 0) {
    return { ok: false, status: 400, error: 'Montant invalide pour cette opportunite' }
  }

  const applicationFeeAmount = calculatePlatformFee(amount, platformFeePercent)

  const recyclablePurchaseResult = await supabase
    .from('achats')
    .select('id, statut')
    .eq('comedien_id', comedienId)
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
        comedien_id: comedienId,
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
    return { ok: false, status: 500, error: "Impossible d'initialiser la reservation" }
  }

  const achat = achatData as Pick<Achat, 'id'>

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: achat.id,
      success_url: `${baseUrl}/comedien?checkout=success&achat=${achat.id}`,
      cancel_url: `${baseUrl}/comedien/opportunites/${opportunite.id}?checkout=cancel`,
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
        comedien_id: comedienId,
      },
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: annonceur.stripe_account_id,
        },
        metadata: {
          achat_id: achat.id,
          opportunite_id: opportunite.id,
          comedien_id: comedienId,
        },
      },
    })

    await supabase
      .from('achats')
      .update({
        stripe_checkout_session_id: session.id,
      } as unknown as never)
      .eq('id', achat.id)

    return { ok: true, url: session.url, achatId: achat.id }
  } catch (stripeError) {
    await supabase
      .from('achats')
      .update({ statut: 'annulee' } as unknown as never)
      .eq('id', achat.id)
      .eq('statut', 'en_attente')

    throw stripeError
  }
}
