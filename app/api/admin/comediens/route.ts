import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUser, getAdminProfile } from '@/app/lib/supabase'

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

    // Service Role Key pour contourner les politiques RLS sur la table comediens
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Configuration manquante : SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('comediens')
      .select('id, nom, prenom, email, photo_url, lien_demo, preferences_opportunites, email_verifie, created_at', { count: 'exact' })
      .order('nom', { ascending: true })
      .order('prenom', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Erreur Supabase:', error)
      return NextResponse.json({ error: 'Impossible de récupérer la liste des comédiens' }, { status: 500 })
    }

    return NextResponse.json({
      comediens: data,
      total: count,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des comédiens:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des comédiens' },
      { status: 500 }
    )
  }
}
