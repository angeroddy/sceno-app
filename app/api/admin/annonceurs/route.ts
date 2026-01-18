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
    const statut = searchParams.get('statut') // 'en_attente' | 'valide' | 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Construire la requête
    let query = supabase
      .from('annonceurs')
      .select(`
        *,
        opportunites:opportunites(id)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Appliquer les filtres
    if (statut === 'en_attente') {
      query = query.eq('identite_verifiee', false)
    } else if (statut === 'valide') {
      query = query.eq('identite_verifiee', true)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Erreur Supabase:', error)
      return NextResponse.json({ error: 'Impossible de récupérer la liste des annonceurs' }, { status: 500 })
    }

    return NextResponse.json({
      annonceurs: data,
      total: count,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des annonceurs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des annonceurs' },
      { status: 500 }
    )
  }
}
