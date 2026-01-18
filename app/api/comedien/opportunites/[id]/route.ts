import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'

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

    // Récupérer les paramètres
    const { id } = await context.params

    console.log('Récupération de l\'opportunité avec ID:', id)

    // Récupérer l'opportunité avec les informations de l'annonceur
    const { data: opportunite, error: opportuniteError } = await supabase
      .from('opportunites')
      .select('*, annonceur:annonceurs(nom_formation, email)')
      .eq('id', id)
      .eq('statut', 'validee')
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
        { error: 'Opportunité introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json(opportunite)

  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
