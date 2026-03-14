import { NextRequest, NextResponse } from 'next/server'
import { getUser, getAdminProfile } from '@/app/lib/supabase'

export async function PATCH(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const admin = await getAdminProfile()
  if (!admin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  return NextResponse.json(
    { error: 'Route obsolète. Utilisez /api/admin/opportunites/validate.' },
    { status: 410 }
  )
}
