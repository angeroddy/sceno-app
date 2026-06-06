import { NextRequest, NextResponse } from 'next/server'
import { requireComedian } from '@/app/server/auth'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'
import type { Achat } from '@/app/types'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireComedian()
    if (!auth.ok) return auth.response
    const { supabase, profile: comedien } = auth

    const achatId = request.nextUrl.searchParams.get('achatId')
    let achatsQuery = supabase
      .from('achats')
      .select(`
        id,
        prix_paye,
        statut,
        created_at,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        stripe_refund_id,
        opportunite:opportunites(
          id,
          titre,
          image_url,
          date_evenement,
          contact_email,
          contact_telephone,
          annonceur_id,
          annonceur:annonceurs(nom_formation, email)
        )
      `)
      .eq('comedien_id', comedien.id)

    if (achatId) {
      achatsQuery = achatsQuery.eq('id', achatId)
    } else {
      achatsQuery = achatsQuery.in('statut', ['confirmee', 'remboursee'])
    }

    const { data: achatsData, error: achatsError } = await achatsQuery.order('created_at', { ascending: false })

    if (achatsError) {
      console.error('Erreur récupération achats comédien:', achatsError)
      return NextResponse.json({ error: 'Impossible de récupérer les achats' }, { status: 500 })
    }

    const achats = (achatsData || []) as Array<
      Pick<Achat, 'id' | 'prix_paye' | 'statut' | 'created_at' | 'stripe_checkout_session_id' | 'stripe_payment_intent_id' | 'stripe_refund_id'> & {
        opportunite: {
          id: string
          titre: string
          image_url: string | null
          date_evenement: string
          contact_email: string
          contact_telephone: string | null
          annonceur_id: string
          annonceur: { nom_formation: string; email: string } | null
        } | null
      }
    >

    let achat = achatId ? achats[0] || null : null

    if (achatId && achat?.statut === 'en_attente' && achat.stripe_checkout_session_id) {
      try {
        const stripe = getStripe()
        const adminSupabase = createAdminSupabaseClient()
        const session = await stripe.checkout.sessions.retrieve(achat.stripe_checkout_session_id)
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null

        if (session.payment_status === 'paid') {
          const { data: confirmationData, error: confirmationError } = await adminSupabase.rpc(
            'confirm_checkout_purchase' as never,
            {
              p_achat_id: achat.id,
              p_checkout_session_id: session.id,
              p_payment_intent_id: paymentIntentId,
              p_last_event_id: `polling_recovery:${session.id}`,
            } as never
          )

          if (confirmationError) {
            throw new Error(`Echec RPC confirm_checkout_purchase: ${confirmationError.message}`)
          }

          const confirmationResult = (Array.isArray(confirmationData) ? confirmationData[0] : null) as
            | { success: boolean; code: string; message: string }
            | null

          if (confirmationResult?.success) {
            achat = {
              ...achat,
              statut: 'confirmee',
              stripe_payment_intent_id: paymentIntentId,
            }
          } else if (
            confirmationResult &&
            (confirmationResult.code === 'NO_SPOTS_LEFT' || confirmationResult.code === 'DUPLICATE_CONFIRMED_PURCHASE') &&
            paymentIntentId
          ) {
            const refund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
              metadata: {
                achat_id: achat.id,
                source: confirmationResult.code === 'NO_SPOTS_LEFT'
                  ? 'polling_recovery_no_spots_left'
                  : 'polling_recovery_duplicate_confirmed_purchase',
              },
            })

            await adminSupabase
              .from('achats')
              .update({
                statut: 'remboursee',
                stripe_checkout_session_id: session.id,
                stripe_payment_intent_id: paymentIntentId,
                stripe_payment_id: paymentIntentId,
                stripe_refund_id: refund.id,
                last_stripe_event_id: `polling_recovery:${session.id}`,
              } as unknown as never)
              .eq('id', achat.id)

            achat = {
              ...achat,
              statut: 'remboursee',
              stripe_payment_intent_id: paymentIntentId,
              stripe_refund_id: refund.id,
            }
          } else if (confirmationResult?.code === 'INVALID_STATUS') {
            const { data: refreshedAchat } = await adminSupabase
              .from('achats')
              .select('statut, stripe_payment_intent_id, stripe_refund_id')
              .eq('id', achat.id)
              .maybeSingle()
            const refreshedAchatRecord = refreshedAchat as Pick<
              Achat,
              'statut' | 'stripe_payment_intent_id' | 'stripe_refund_id'
            > | null

            if (refreshedAchatRecord) {
              achat = {
                ...achat,
                statut: refreshedAchatRecord.statut,
                stripe_payment_intent_id: refreshedAchatRecord.stripe_payment_intent_id,
                stripe_refund_id: refreshedAchatRecord.stripe_refund_id,
              }
            }
          }
        } else if (session.status === 'expired') {
          await adminSupabase
            .from('achats')
            .update({
              statut: 'annulee',
              stripe_payment_intent_id: paymentIntentId,
              stripe_payment_id: paymentIntentId,
              last_stripe_event_id: `polling_recovery:${session.id}`,
            } as unknown as never)
            .eq('id', achat.id)
            .eq('statut', 'en_attente')

          achat = {
            ...achat,
            statut: 'annulee',
            stripe_payment_intent_id: paymentIntentId,
          }
        }
      } catch (recoveryError) {
        console.error('Erreur récupération achat en attente:', recoveryError)
      }
    }

    return NextResponse.json({ achat, achats })
  } catch (error) {
    console.error('Erreur serveur achats comédien:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
