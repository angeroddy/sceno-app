import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getUser, getAdminProfile } from '@/app/lib/supabase'
import { Achat } from '@/app/types'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    // Récupérer les paramètres
    const { id } = await context.params

    console.log('Admin - Récupération de l\'opportunité avec ID:', id)

    // Récupérer l'opportunité (admin peut voir toutes les opportunités)
    const { data: opportunite, error: opportuniteError } = await supabase
      .from('opportunites')
      .select('*')
      .eq('id', id)
      .single()

    if (opportuniteError) {
      console.error('Erreur Supabase:', opportuniteError)
      return NextResponse.json(
        { error: 'Cette opportunité n\'existe pas ou a été supprimée' },
        { status: 404 }
      )
    }

    if (!opportunite) {
      return NextResponse.json(
        { error: 'Opportunité introuvable' },
        { status: 404 }
      )
    }

    // Récupérer les statistiques de l'opportunité
    const { data: achatsData } = await supabase
      .from('achats')
      .select('prix_paye')
      .eq('opportunite_id', id)
      .eq('statut', 'confirmee')

    const achats = achatsData as Pick<Achat, 'prix_paye'>[] | null

    const stats = {
      vues: 0, // À implémenter avec un système de tracking
      reservations: achats?.length || 0,
      revenu: achats?.reduce((sum, achat) => sum + achat.prix_paye, 0) || 0
    }

    return NextResponse.json({
      opportunite,
      stats
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { error: 'Une erreur s\'est produite. Si le problème persiste, contactez le support' },
      { status: 500 }
    )
  }
}
