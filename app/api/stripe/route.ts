import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  markStripeEventError,
  markStripeEventProcessed,
  registerStripeEvent,
} from '@/lib/stripe-webhooks/events'
import {
  handleAccountUpdated,
  handleChargeRefunded,
  handleCheckoutCancelled,
  handleCheckoutCompleted,
} from '@/lib/stripe-webhooks/handlers'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = createAdminSupabaseClient()

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
