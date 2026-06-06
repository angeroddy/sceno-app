import type Stripe from 'stripe'
import type { createAdminSupabaseClient } from '@/lib/supabase-admin'

export type SupabaseAdmin = ReturnType<typeof createAdminSupabaseClient>

/**
 * Enregistre l'événement Stripe pour garantir l'idempotence du webhook.
 * Renvoie `{ inserted: false }` si l'événement a déjà été reçu (conflit d'unicité).
 */
export async function registerStripeEvent(
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

export async function markStripeEventProcessed(
  supabase: SupabaseAdmin,
  eventId: string
) {
  await supabase
    .from('stripe_events')
    .update({ processed_at: new Date().toISOString(), processing_error: null } as unknown as never)
    .eq('event_id', eventId)
}

export async function markStripeEventError(
  supabase: SupabaseAdmin,
  eventId: string,
  errorMessage: string
) {
  await supabase
    .from('stripe_events')
    .update({ processing_error: errorMessage } as unknown as never)
    .eq('event_id', eventId)
}
