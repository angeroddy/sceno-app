import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { reconcileOpportunityPlaces } from '@/app/lib/opportunity-availability'
import { countOpportunityViews } from '@/app/lib/opportunity-views'
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
        { error: 'Cette opportunité n\'existe pas ou vous n\'avez pas les droits d\'accès' },
        { status: 404 }
      )
    }

    if (!opportunite) {
      return NextResponse.json(
        { error: 'Opportunité introuvable ou vous n\'avez pas les droits d\'accès' },
        { status: 404 }
      )
    }

    const reconciledOpportunity = await reconcileOpportunityPlaces(supabase as never, id)
    if (reconciledOpportunity) {
      ;(opportunite as { places_restantes: number }).places_restantes = reconciledOpportunity.places_restantes
    }

    // Récupérer les statistiques de l'opportunité
    const { data: achatsData } = await supabase
      .from('achats')
      .select('prix_paye, application_fee_amount')
      .eq('opportunite_id', id)
      .eq('statut', 'confirmee')

    const achats = achatsData as Pick<Achat, 'prix_paye' | 'application_fee_amount'>[] | null

    const vues = await countOpportunityViews(supabase as never, id)

    const stats = {
      vues,
      reservations: achats?.length || 0,
      revenu: achats?.reduce(
        (sum, achat) => sum + achat.prix_paye - ((achat.application_fee_amount || 0) / 100),
        0
      ) || 0
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: annonceurData, error: annonceurError } = await supabase
      .from('annonceurs')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (annonceurError || !annonceurData) {
      return NextResponse.json({ error: 'Profil annonceur introuvable' }, { status: 404 })
    }

    const { id } = await context.params

    const { data: opportunite, error: opportuniteError } = await supabase
      .from('opportunites')
      .select('id, statut')
      .eq('id', id)
      .eq('annonceur_id', (annonceurData as { id: string }).id)
      .single()

    if (opportuniteError || !opportunite) {
      return NextResponse.json({ error: 'Opportunité introuvable' }, { status: 404 })
    }

    if ((opportunite as { statut: string }).statut === 'supprimee') {
      return NextResponse.json({ success: true })
    }

    const { error: updateError } = await supabase
      .from('opportunites')
      .update({ statut: 'supprimee' } as never)
      .eq('id', id)
      .eq('annonceur_id', (annonceurData as { id: string }).id)

    if (updateError) {
      console.error('Erreur suppression logique opportunité:', updateError)
      return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression opportunité:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
