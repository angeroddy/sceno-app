import { NextRequest, NextResponse } from 'next/server'
import { requireComedian } from '@/app/server/auth'
import { getStripe } from '@/lib/stripe'
import { createCheckoutSession } from '@/lib/checkout/create-checkout-session'

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
  try {
    const body = await request.json() as { opportuniteId?: string }
    const opportuniteId = body.opportuniteId
    if (!opportuniteId) {
      return NextResponse.json({ error: 'opportuniteId est requis' }, { status: 400 })
    }

    const auth = await requireComedian()
    if (!auth.ok) return auth.response
    const { supabase, profile: comedien } = auth

    const result = await createCheckoutSession({
      supabase,
      stripe: getStripe(),
      comedienId: comedien.id,
      opportuniteId,
      baseUrl: getBaseUrl(request),
      platformFeePercent: getPlatformFeePercent(),
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ url: result.url, achatId: result.achatId }, { status: 200 })
  } catch (error) {
    console.error('Erreur checkout session:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
