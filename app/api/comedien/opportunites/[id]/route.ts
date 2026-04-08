import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { reconcileOpportunityPlaces } from '@/app/lib/opportunity-availability'
import {
  deriveOpportunityStatus,
  isOpportunityConsultableByComedian,
  isOpportunityVisibleToComedian,
} from '@/app/lib/opportunity-status'
import { trackOpportunityView } from '@/app/lib/opportunity-views'

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
      .select('id, compte_supprime')
      .eq('auth_user_id', user.id)
      .single()

    const comedienTyped = comedien as { id: string; compte_supprime?: boolean } | null

    if (comedienError || !comedienTyped) {
      return NextResponse.json({ error: 'Profil comedien introuvable' }, { status: 404 })
    }
    if (comedienTyped.compte_supprime) {
      return NextResponse.json({ error: 'Compte supprimé' }, { status: 403 })
    }
    

    // Recuperer les parametres
    const { id } = await context.params

    // Recuperer l'opportunite avec les informations de l'annonceur
    const { data: opportunite, error: opportuniteError } = await supabase
      .from('opportunites')
      .select('*, annonceur:annonceurs(nom_formation, email)')
      .eq('id', id)
      .single()

    if (opportuniteError || !opportunite) {
      return NextResponse.json(
        { error: "Cette opportunite n'existe pas ou n'est plus disponible" },
        { status: 404 }
      )
    }
    const opportuniteTyped = opportunite as {
      annonceur_id: string
      places_restantes: number
      date_evenement: string
      statut: string
    }

    if (!isOpportunityVisibleToComedian(opportuniteTyped.statut as never)) {
      return NextResponse.json(
        { error: "Cette opportunite n'existe pas ou n'est plus disponible" },
        { status: 404 }
      )
    }

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

    const reconciledOpportunity = await reconcileOpportunityPlaces(supabase as never, id)
    const nextPlacesRestantes = reconciledOpportunity?.places_restantes ?? opportuniteTyped.places_restantes
    opportuniteTyped.places_restantes = nextPlacesRestantes
    opportuniteTyped.statut = deriveOpportunityStatus({
      statut: opportuniteTyped.statut as never,
      date_evenement: opportuniteTyped.date_evenement,
      places_restantes: nextPlacesRestantes,
    })

    if (!isOpportunityConsultableByComedian(opportuniteTyped.statut as never)) {
      return NextResponse.json(
        { error: "Cette opportunité a été supprimée et ne peut plus être consultée." },
        { status: 410 }
      )
    }

    await trackOpportunityView(supabase as never, id, comedienTyped.id)

    return NextResponse.json(opportuniteTyped)
  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { error: "Une erreur s'est produite. Si le probleme persiste, contactez le support" },
      { status: 500 }
    )
  }
}
