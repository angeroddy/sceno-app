import { NextRequest, NextResponse } from 'next/server'
import { requireComedian } from '@/app/server/auth'
import { reconcileOpportunityPlaces } from '@/app/lib/opportunity-availability'
import {
  deriveOpportunityStatus,
  isOpportunityVisibleToComedian,
  isQualifiedStatus,
  isWithinQualifiedStatusVisibilityWindow,
} from '@/app/lib/opportunity-status'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireComedian()
    if (!auth.ok) return auth.response
    const { supabase, profile: comedienData } = auth

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
      .in('statut', ['validee', 'expiree', 'complete', 'supprimee'])

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

    const opportunitesReconciled = await Promise.all(
      (opportunites || []).map(async (opportunite) => {
        const currentOpportunity = opportunite as Record<string, unknown> & {
          id: string
          statut: string
          date_evenement: string
          places_restantes?: number
          statut_qualifie_at?: string | null
          updated_at?: string | null
        }
        const reconciledOpportunity = await reconcileOpportunityPlaces(
          supabase as never,
          currentOpportunity.id
        )

        const nextPlacesRestantes = reconciledOpportunity?.places_restantes ?? currentOpportunity.places_restantes ?? 0
        const derivedStatus = deriveOpportunityStatus({
          statut: currentOpportunity.statut as never,
          date_evenement: currentOpportunity.date_evenement,
          places_restantes: nextPlacesRestantes,
        })

        return {
          ...currentOpportunity,
          places_restantes: nextPlacesRestantes,
          statut: derivedStatus,
          statut_qualifie_at: currentOpportunity.statut_qualifie_at,
        }
      })
    )

    const now = new Date()
    return NextResponse.json({
      opportunites: opportunitesReconciled.filter(
        (opportunite: { statut?: string; statut_qualifie_at?: string | null; updated_at?: string | null }) => {
          const status = (opportunite.statut || 'validee') as never

          if (!isOpportunityVisibleToComedian(status)) {
            return false
          }

          if (!isQualifiedStatus(status)) {
            return true
          }

          return isWithinQualifiedStatusVisibilityWindow(
            opportunite.statut_qualifie_at ?? opportunite.updated_at,
            now
          )
        }
      ),
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
