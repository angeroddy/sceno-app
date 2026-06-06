import type Stripe from 'stripe'
import {
  buildStripeConnectSnapshot,
  persistStripeConnectSnapshot,
} from '@/app/lib/stripe-connect'
import type { SupabaseAdmin } from './events'
import { sendPurchaseConfirmationEmail } from './purchase-confirmation-email'

function getAchatIdFromSession(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.achat_id || session.client_reference_id || null
}

function getPaymentIntentIdFromSession(session: Stripe.Checkout.Session): string | null {
  if (typeof session.payment_intent === 'string') return session.payment_intent
  return session.payment_intent?.id || null
}

export async function handleCheckoutCompleted(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const achatId = getAchatIdFromSession(session)
  if (!achatId) {
    throw new Error('checkout.session.completed sans achat_id')
  }

  const paymentIntentId = getPaymentIntentIdFromSession(session)
  const checkoutSessionId = session.id

  const { data, error } = await supabase.rpc(
    'confirm_checkout_purchase' as never,
    {
      p_achat_id: achatId,
      p_checkout_session_id: checkoutSessionId,
      p_payment_intent_id: paymentIntentId,
      p_last_event_id: eventId,
    } as never
  )

  if (error) {
    throw new Error(`Echec RPC confirm_checkout_purchase: ${error.message}`)
  }

  const result = (Array.isArray(data) ? data[0] : null) as
    | { success: boolean; code: string; message: string }
    | null

  if (!result) {
    throw new Error('Réponse RPC vide lors de la confirmation achat')
  }

  if (!result.success && (
    result.code === 'NO_SPOTS_LEFT' ||
    result.code === 'DUPLICATE_CONFIRMED_PURCHASE'
  )) {
    if (!paymentIntentId) {
      throw new Error(`${result.code} sans PaymentIntent: remboursement impossible`)
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      metadata: {
        achat_id: achatId,
        source: result.code === 'NO_SPOTS_LEFT'
          ? 'webhook_no_spots_left'
          : 'webhook_duplicate_confirmed_purchase',
      },
    })

    const { error: refundUpdateError } = await supabase
      .from('achats')
      .update({
        statut: 'remboursee',
        stripe_checkout_session_id: checkoutSessionId,
        stripe_payment_intent_id: paymentIntentId,
        stripe_payment_id: paymentIntentId,
        stripe_refund_id: refund.id,
        last_stripe_event_id: eventId,
      } as unknown as never)
      .eq('id', achatId)
      .eq('statut', 'annulee')

    if (refundUpdateError) {
      throw new Error(`Remboursement NO_SPOTS_LEFT effectué mais update locale échouée: ${refundUpdateError.message}`)
    }

    return
  }

  if (!result.success) {
    throw new Error(`Confirmation achat refusée: ${result.code} - ${result.message}`)
  }

  await sendPurchaseConfirmationEmail(supabase, achatId)
}

export async function handleCheckoutCancelled(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const achatId = getAchatIdFromSession(session)
  if (!achatId) return

  const paymentIntentId = getPaymentIntentIdFromSession(session)

  await supabase
    .from('achats')
    .update({
      statut: 'annulee',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_payment_id: paymentIntentId,
      last_stripe_event_id: eventId,
    } as unknown as never)
    .eq('id', achatId)
    .eq('statut', 'en_attente')
}

export async function handleChargeRefunded(
  supabase: SupabaseAdmin,
  charge: Stripe.Charge,
  eventId: string
) {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id || null
  if (!paymentIntentId) return

  const latestRefund = charge.refunds?.data?.[0]?.id || null
  const { data: achatRow } = await supabase
    .from('achats')
    .select('id')
    .or(`stripe_payment_intent_id.eq.${paymentIntentId},stripe_payment_id.eq.${paymentIntentId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const achatRecord = achatRow as { id: string } | null
  if (!achatRecord?.id) return

  const { error } = await supabase.rpc(
    'mark_purchase_refunded' as never,
    {
      p_achat_id: achatRecord.id,
      p_refund_id: latestRefund,
      p_last_event_id: eventId,
    } as never
  )

  if (error) {
    throw new Error(`Echec RPC mark_purchase_refunded: ${error.message}`)
  }
}

export async function handleAccountUpdated(
  supabase: SupabaseAdmin,
  account: Stripe.Account
) {
  const snapshot = buildStripeConnectSnapshot(account.id, account)

  const { data: annonceurData, error } = await supabase
    .from('annonceurs')
    .select('id')
    .eq('stripe_account_id', account.id)
    .maybeSingle()
  const annonceur = annonceurData as { id: string } | null

  if (error) {
    throw new Error(`Impossible de retrouver l'annonceur du compte Stripe: ${error.message}`)
  }

  if (!annonceur?.id) {
    throw new Error(`Aucun annonceur local pour le compte Stripe ${account.id}`)
  }

  await persistStripeConnectSnapshot(
    supabase as unknown as Parameters<typeof persistStripeConnectSnapshot>[0],
    annonceur.id,
    snapshot
  )
}
