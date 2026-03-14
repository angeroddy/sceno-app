import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUser, getAdminProfile } from '@/app/lib/supabase'
import { getStripe } from '@/app/lib/stripe'

export const runtime = 'nodejs'

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuration manquante Supabase admin')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const admin = await getAdminProfile()
    if (!admin) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    const { id: achatId } = await context.params
    if (!achatId) {
      return NextResponse.json({ error: 'Identifiant achat manquant' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const { data: achatData, error: achatError } = await supabase
      .from('achats')
      .select('id, statut, stripe_payment_intent_id, stripe_payment_id, stripe_refund_id')
      .eq('id', achatId)
      .single()

    if (achatError || !achatData) {
      return NextResponse.json({ error: 'Achat introuvable' }, { status: 404 })
    }

    if (achatData.statut === 'remboursee') {
      return NextResponse.json({ error: 'Achat deja rembourse' }, { status: 409 })
    }
    if (achatData.statut !== 'confirmee') {
      return NextResponse.json({ error: "Seuls les achats confirmes peuvent etre rembourses" }, { status: 409 })
    }

    const paymentIntentId = achatData.stripe_payment_intent_id || achatData.stripe_payment_id
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'PaymentIntent introuvable pour cet achat' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({})) as { reason?: string }
    const stripe = getStripe()
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      metadata: {
        achat_id: achatId,
        source: 'admin_api',
        reason: body.reason || 'non_precise',
      },
    })

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'mark_purchase_refunded' as never,
      {
        p_achat_id: achatId,
        p_refund_id: refund.id,
        p_last_event_id: `admin_refund_${refund.id}`,
      } as never
    )

    if (rpcError) {
      console.error('Erreur RPC mark_purchase_refunded:', rpcError)
      return NextResponse.json({ error: 'Remboursement Stripe effectue mais mise a jour locale echouee' }, { status: 500 })
    }

    const rpcResult = Array.isArray(rpcData) ? rpcData[0] : null
    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      achat_id: achatId,
      update_result: rpcResult || null,
    })
  } catch (error) {
    console.error('Erreur remboursement admin:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
