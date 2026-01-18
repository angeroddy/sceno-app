import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getUser, getAdminProfile } from '@/app/lib/supabase'

export async function GET(request: Request) {
  try {
    // Vérifier l'authentification et les permissions admin
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = await getAdminProfile()
    if (!admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut') // 'en_attente' | 'validee' | 'refusee' | 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Construire la requête avec jointure sur annonceur
    let query = supabase
      .from('opportunites')
      .select(`
        *,
        annonceur:annonceurs(id, nom_formation, email, identite_verifiee)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Appliquer les filtres
    if (statut && statut !== 'all') {
      query = query.eq('statut', statut)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Erreur Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      opportunites: data,
      total: count,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des opportunités:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des opportunités' },
      { status: 500 }
    )
  }
}
