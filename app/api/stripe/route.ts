import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: 'Stripe webhook endpoint' }, { status: 200 })
}
