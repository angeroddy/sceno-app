import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getUser, getAdminProfile } from '@/app/lib/supabase'

export async function PATCH(
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
    const body = await request.json()
    const { statut } = body

    // Valider le statut
    const statutsValides = ['en_attente', 'validee', 'refusee', 'expiree', 'complete']
    if (!statut || !statutsValides.includes(statut)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      )
    }

    console.log(`Admin - Mise à jour du statut de l'opportunité ${id} vers: ${statut}`)

    // Mettre à jour le statut de l'opportunité
    const { data: opportunite, error: updateError } = await supabase
      .from('opportunites')
      .update({ statut })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Erreur Supabase:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour', details: updateError.message },
        { status: 500 }
      )
    }

    if (!opportunite) {
      return NextResponse.json(
        { error: 'Opportunité introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      opportunite
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
