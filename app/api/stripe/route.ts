import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { getStripe } from '@/app/lib/stripe'
import { extractStripeAccountStatus } from '@/app/lib/stripe-connect'
import { sendMail } from '@/app/lib/mailer'

export const runtime = 'nodejs'

type SupabaseAdmin = ReturnType<typeof createClient>

function getSupabaseAdminClient(): SupabaseAdmin {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuration manquante Supabase admin')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function registerStripeEvent(
  supabase: SupabaseAdmin,
  event: Stripe.Event
): Promise<{ inserted: boolean }> {
  const { error } = await supabase
    .from('stripe_events')
    .insert({
      event_id: event.id,
      event_type: event.type,
      payload: event as unknown as never,
    } as unknown as never)

  if (!error) return { inserted: true }
  if (error.code === '23505') {
    return { inserted: false }
  }

  throw error
}

async function markStripeEventProcessed(
  supabase: SupabaseAdmin,
  eventId: string
) {
  await supabase
    .from('stripe_events')
    .update({ processed_at: new Date().toISOString(), processing_error: null } as unknown as never)
    .eq('event_id', eventId)
}

async function markStripeEventError(
  supabase: SupabaseAdmin,
  eventId: string,
  errorMessage: string
) {
  await supabase
    .from('stripe_events')
    .update({ processing_error: errorMessage } as unknown as never)
    .eq('event_id', eventId)
}

function getAchatIdFromSession(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.achat_id || session.client_reference_id || null
}

function getPaymentIntentIdFromSession(session: Stripe.Checkout.Session): string | null {
  if (typeof session.payment_intent === 'string') return session.payment_intent
  return session.payment_intent?.id || null
}

function formatReceiptReference(achatId: string): string {
  return `SCN-${achatId.replace(/-/g, '').slice(0, 12).toUpperCase()}`
}

async function sendPurchaseConfirmationEmail(
  supabase: SupabaseAdmin,
  achatId: string
) {
  const { data, error } = await supabase
    .from('achats')
    .select(`
      id,
      prix_paye,
      created_at,
      opportunite:opportunites(
        titre,
        date_evenement,
        contact_email,
        annonceur:annonceurs(nom_formation)
      ),
      comedien:comediens(
        prenom,
        nom,
        email
      )
    `)
    .eq('id', achatId)
    .maybeSingle()

  if (error || !data) {
    console.warn('Impossible de charger les donnees email achat:', error)
    return
  }

  const achat = data as {
    id: string
    prix_paye: number
    created_at: string
    opportunite: {
      titre: string
      date_evenement: string
      contact_email: string
      annonceur: { nom_formation: string } | null
    } | null
    comedien: {
      prenom: string
      nom: string
      email: string
    } | null
  }

  if (!achat.comedien?.email || !achat.opportunite) {
    return
  }

  const eventDate = new Date(achat.opportunite.date_evenement)
  const bookingDate = new Date(achat.created_at)
  const receiptReference = formatReceiptReference(achat.id)
  const organizer = achat.opportunite.annonceur?.nom_formation || 'Organisme'
  const comedianName = [achat.comedien.prenom, achat.comedien.nom].filter(Boolean).join(' ').trim()

  const subject = `Votre ticket Scenio - ${achat.opportunite.titre}`
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
      <h1 style="font-size:20px;margin-bottom:16px">Reservation confirmee</h1>
      <p>Bonjour ${comedianName || '},'}</p>
      <p>Votre reservation a bien ete confirmee sur Scenio.</p>
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Ticket / recu :</strong> ${receiptReference}</p>
        <p style="margin:0 0 8px"><strong>Opportunite :</strong> ${achat.opportunite.titre}</p>
        <p style="margin:0 0 8px"><strong>Organisme :</strong> ${organizer}</p>
        <p style="margin:0 0 8px"><strong>Date :</strong> ${eventDate.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <p style="margin:0 0 8px"><strong>Heure :</strong> ${eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p style="margin:0 0 8px"><strong>Montant paye :</strong> ${achat.prix_paye.toFixed(2)} EUR</p>
        <p style="margin:0 0 8px"><strong>Date d'achat :</strong> ${bookingDate.toLocaleDateString('fr-FR')} ${bookingDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p style="margin:0"><strong>Contact :</strong> ${achat.opportunite.contact_email}</p>
      </div>
      <p>Vous retrouvez egalement ce ticket dans votre espace comedien, onglet Mes Places.</p>
    </div>
  `

  const text = [
    'Reservation confirmee',
    `Ticket / recu : ${receiptReference}`,
    `Opportunite : ${achat.opportunite.titre}`,
    `Organisme : ${organizer}`,
    `Date : ${eventDate.toLocaleDateString('fr-FR')} ${eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
    `Montant paye : ${achat.prix_paye.toFixed(2)} EUR`,
    `Contact : ${achat.opportunite.contact_email}`,
  ].join('\n')

  try {
    await sendMail({
      to: achat.comedien.email,
      subject,
      html,
      text,
    })
  } catch (mailError) {
    console.warn('Email de confirmation achat non envoye:', mailError)
  }
}

async function handleCheckoutCompleted(
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

async function handleCheckoutCancelled(
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

async function handleChargeRefunded(
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

async function handleAccountUpdated(
  supabase: SupabaseAdmin,
  account: Stripe.Account
) {
  const stripeStatus = extractStripeAccountStatus(account)
  await supabase
    .from('annonceurs')
    .update(stripeStatus as unknown as never)
    .eq('stripe_account_id', account.id)
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdminClient()

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Configuration manquante : STRIPE_WEBHOOK_SECRET' }, { status: 500 })
    }

    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Signature Stripe absente' }, { status: 400 })
    }

    const stripe = getStripe()
    const payload = await request.text()
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)

    const { inserted } = await registerStripeEvent(supabase, event)
    if (!inserted) {
      // Event déjà traité (idempotence).
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded': {
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutCompleted(supabase, stripe, session, event.id)
          break
        }
        case 'checkout.session.expired':
        case 'checkout.session.async_payment_failed': {
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutCancelled(supabase, session, event.id)
          break
        }
        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge
          await handleChargeRefunded(supabase, charge, event.id)
          break
        }
        case 'account.updated': {
          const account = event.data.object as Stripe.Account
          await handleAccountUpdated(supabase, account)
          break
        }
        default:
          break
      }

      await markStripeEventProcessed(supabase, event.id)
      return NextResponse.json({ received: true }, { status: 200 })
    } catch (processingError) {
      const errorMessage = processingError instanceof Error
        ? processingError.message
        : 'Erreur inconnue de traitement webhook'
      await markStripeEventError(supabase, event.id, errorMessage)
      throw processingError
    }
  } catch (error) {
    console.error('Erreur webhook Stripe:', error)
    return NextResponse.json({ error: 'Webhook invalide ou traitement echoue' }, { status: 400 })
  }
}
