import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminProfile, getUser } from '@/lib/supabase'
import type { OpportunityType } from '@/types'
import { OPPORTUNITY_TYPE_LABELS } from '@/types'

type ComedienPreferenceRow = {
  preferences_opportunites: OpportunityType[] | null
}

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = await getAdminProfile()
    if (!admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Configuration manquante : SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('comediens')
      .select('preferences_opportunites')
      .eq('compte_supprime', false)

    if (error) {
      console.error('Erreur Supabase statistiques admin:', error)
      return NextResponse.json({ error: 'Impossible de récupérer les statistiques' }, { status: 500 })
    }

    const counts = Object.keys(OPPORTUNITY_TYPE_LABELS).reduce(
      (acc, type) => ({ ...acc, [type]: 0 }),
      {} as Record<OpportunityType, number>
    )

    let totalSelections = 0

    ;((data || []) as ComedienPreferenceRow[]).forEach((comedien) => {
      ;(comedien.preferences_opportunites || []).forEach((type) => {
        if (type in counts) {
          counts[type] += 1
          totalSelections += 1
        }
      })
    })

    const preferencesByType = Object.entries(OPPORTUNITY_TYPE_LABELS).map(([type, label]) => ({
      type,
      label,
      count: counts[type as OpportunityType],
    }))

    return NextResponse.json({
      preferencesByType,
      totalSelections,
    })
  } catch (error) {
    console.error('Erreur statistiques admin:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}
