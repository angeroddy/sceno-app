import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { Annonceur, Achat } from '@/app/types'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    // Récupérer le profil annonceur
    const { data: annonceurData, error: annonceurError } = await supabase
      .from('annonceurs')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (annonceurError || !annonceurData) {
      return NextResponse.json(
        { error: 'Profil annonceur introuvable' },
        { status: 404 }
      )
    }

    const annonceur = annonceurData as Annonceur

    // Récupérer les paramètres
    const { id } = await context.params

    console.log('Récupération de l\'opportunité avec ID:', id)

    // Récupérer l'opportunité (doit appartenir à cet annonceur)
    const { data: opportunite, error: opportuniteError } = await supabase
      .from('opportunites')
      .select('*')
      .eq('id', id)
      .eq('annonceur_id', annonceur.id)
      .single()

    if (opportuniteError) {
      console.error('Erreur Supabase:', opportuniteError)
      return NextResponse.json(
        { error: 'Opportunité introuvable', details: opportuniteError.message },
        { status: 404 }
      )
    }

    if (!opportunite) {
      return NextResponse.json(
        { error: 'Opportunité introuvable ou vous n\'avez pas les droits d\'accès' },
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
      { error: 'Erreur serveur interne', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
