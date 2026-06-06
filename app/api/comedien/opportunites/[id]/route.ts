import { NextRequest, NextResponse } from 'next/server'
import { requireComedian } from '@/app/server/auth'
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
    const auth = await requireComedian()
    if (!auth.ok) return auth.response
    const { supabase, profile: comedienTyped } = auth


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
