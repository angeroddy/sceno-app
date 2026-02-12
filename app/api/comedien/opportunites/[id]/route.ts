import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    // Recuperer le comedien courant
    const { data: comedien, error: comedienError } = await supabase
      .from('comediens')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (comedienError || !comedien) {
      return NextResponse.json({ error: 'Profil comedien introuvable' }, { status: 404 })
    }
    const comedienTyped = comedien as { id: string }

    // Recuperer les parametres
    const { id } = await context.params

    // Recuperer l'opportunite avec les informations de l'annonceur
    const { data: opportunite, error: opportuniteError } = await supabase
      .from('opportunites')
      .select('*, annonceur:annonceurs(nom_formation, email)')
      .eq('id', id)
      .eq('statut', 'validee')
      .single()

    if (opportuniteError || !opportunite) {
      return NextResponse.json(
        { error: "Cette opportunite n'existe pas ou n'est plus disponible" },
        { status: 404 }
      )
    }
    const opportuniteTyped = opportunite as { annonceur_id: string }

    // Verifier si l'annonceur de cette opportunite est bloque par le comedien
    const { data: blockedRow, error: blockedError } = await supabase
      .from('annonceurs_bloques')
      .select('annonceur_id')
      .eq('comedien_id', comedienTyped.id)
      .eq('annonceur_id', opportuniteTyped.annonceur_id)
      .maybeSingle()

    if (blockedError) {
      console.error('Erreur verification annonceur bloque:', blockedError)
      return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
    }

    if (blockedRow) {
      return NextResponse.json(
        { error: "Cette opportunite n'existe pas ou n'est plus disponible" },
        { status: 404 }
      )
    }

    return NextResponse.json(opportunite)
  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { error: "Une erreur s'est produite. Si le probleme persiste, contactez le support" },
      { status: 500 }
    )
  }
}
