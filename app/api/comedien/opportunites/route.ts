import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { Comedien } from '@/app/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Verifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    // Recuperer le profil du comedien avec ses preferences
    const { data: comedienDataRaw, error: comedienError } = await supabase
      .from('comediens')
      .select('id, preferences_opportunites')
      .eq('auth_user_id', user.id)
      .single()

    const comedienData = comedienDataRaw as Pick<Comedien, 'id' | 'preferences_opportunites'> | null

    if (comedienError || !comedienData) {
      return NextResponse.json({ error: 'Profil comedien introuvable' }, { status: 404 })
    }

    // Recuperer les annonceurs bloques par le comedien
    const { data: blockedRows, error: blockedError } = await supabase
      .from('annonceurs_bloques')
      .select('annonceur_id')
      .eq('comedien_id', comedienData.id)

    if (blockedError) {
      console.error('Erreur lors de la recuperation des annonceurs bloques:', blockedError)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des opportunites' }, { status: 500 })
    }

    const blockedRowsTyped = blockedRows as Array<{ annonceur_id: string }> | null
    const blockedAnnonceurIds = (blockedRowsTyped || [])
      .map((row) => row.annonceur_id)
      .filter(Boolean)

    // Recuperer les parametres de pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Construire la requete de base
    let query = supabase
      .from('opportunites')
      .select('*, annonceur:annonceurs(nom_formation, email)', { count: 'exact' })
      .eq('statut', 'validee')
      .gt('places_restantes', 0)
      .gt('date_evenement', new Date().toISOString())

    // Filtrer par preferences du comedien si elles sont configurees
    if (comedienData.preferences_opportunites && comedienData.preferences_opportunites.length > 0) {
      query = query.in('type', comedienData.preferences_opportunites)
    }

    // Exclure les opportunites des annonceurs bloques
    if (blockedAnnonceurIds.length > 0) {
      query = query.not('annonceur_id', 'in', `(${blockedAnnonceurIds.join(',')})`)
    }

    // Appliquer la pagination et le tri
    const { data: opportunites, error: opportunitesError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (opportunitesError) {
      console.error('Erreur lors de la recuperation des opportunites:', opportunitesError)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des opportunites' }, { status: 500 })
    }

    return NextResponse.json({
      opportunites: opportunites || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      preferences: comedienData.preferences_opportunites || [],
    })
  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
