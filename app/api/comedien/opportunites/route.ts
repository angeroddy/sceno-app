import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { Comedien, Opportunite, OpportunityType } from '@/app/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer le profil du comédien avec ses préférences
    const { data: comedienDataRaw, error: comedienError } = await supabase
      .from('comediens')
      .select('id, preferences_opportunites')
      .eq('auth_user_id', user.id)
      .single()

    const comedienData = comedienDataRaw as Pick<Comedien, 'id' | 'preferences_opportunites'> | null

    if (comedienError || !comedienData) {
      return NextResponse.json(
        { error: 'Profil comédien introuvable' },
        { status: 404 }
      )
    }

    // Récupérer les paramètres de pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Construire la requête de base
    let query = supabase
      .from('opportunites')
      .select('*, annonceur:annonceurs(nom_formation, email)', { count: 'exact' })
      .eq('statut', 'validee')
      .gt('places_restantes', 0)
      .gt('date_limite', new Date().toISOString())

    // Filtrer par préférences si elles existent
    if (comedienData.preferences_opportunites && comedienData.preferences_opportunites.length > 0) {
      query = query.in('type', comedienData.preferences_opportunites as OpportunityType[])
    }

    // Appliquer la pagination et le tri
    const { data: opportunites, error: opportunitesError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (opportunitesError) {
      console.error('Erreur lors de la récupération des opportunités:', opportunitesError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des opportunités' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      opportunites: opportunites || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      preferences: comedienData.preferences_opportunites || []
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
