import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getUser, getAdminProfile } from '@/app/lib/supabase'
import type { Annonceur, Opportunite, Achat } from '@/app/types'

export async function GET() {
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

    // Récupérer les statistiques des annonceurs
    const { data: annonceursData } = await supabase
      .from('annonceurs')
      .select('identite_verifiee')

    const annonceurs = annonceursData as Pick<Annonceur, 'identite_verifiee'>[] | null

    const annonceursTotal = annonceurs?.length || 0
    const annonceursEnAttente = annonceurs?.filter(a => !a.identite_verifiee).length || 0
    const annonceursValides = annonceurs?.filter(a => a.identite_verifiee).length || 0

    // Récupérer les statistiques des opportunités
    const { data: opportunitesData } = await supabase
      .from('opportunites')
      .select('statut')

    const opportunites = opportunitesData as Pick<Opportunite, 'statut'>[] | null

    const opportunitesTotal = opportunites?.length || 0
    const opportunitesEnAttente = opportunites?.filter(o => o.statut === 'en_attente').length || 0
    const opportunitesValidees = opportunites?.filter(o => o.statut === 'validee').length || 0
    const opportunitesRefusees = opportunites?.filter(o => o.statut === 'refusee').length || 0
    const opportunitesExpirees = opportunites?.filter(o => o.statut === 'expiree').length || 0

    // Récupérer les statistiques des achats
    const { data: achatsData } = await supabase
      .from('achats')
      .select('prix_paye, statut')
      .eq('statut', 'confirmee')

    const achats = achatsData as Pick<Achat, 'prix_paye' | 'statut'>[] | null

    const achatsTotal = achats?.length || 0
    const montantTotal = achats?.reduce((sum, achat) => sum + achat.prix_paye, 0) || 0

    // Récupérer le nombre total de comédiens
    const { count: comediensCount } = await supabase
      .from('comediens')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      annonceurs: {
        total: annonceursTotal,
        enAttente: annonceursEnAttente,
        valides: annonceursValides,
      },
      opportunites: {
        total: opportunitesTotal,
        enAttente: opportunitesEnAttente,
        validees: opportunitesValidees,
        refusees: opportunitesRefusees,
        expirees: opportunitesExpirees,
      },
      achats: {
        total: achatsTotal,
        montantTotal: montantTotal,
      },
      comediens: {
        total: comediensCount || 0,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}
