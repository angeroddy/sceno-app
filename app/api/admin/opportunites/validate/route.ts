import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getUser, getAdminProfile } from '@/app/lib/supabase'
import type { Opportunite, Admin } from '@/app/types'

export async function POST(request: Request) {
  try {
    // Vérifier l'authentification et les permissions admin
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const adminProfile = await getAdminProfile()
    if (!adminProfile) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const admin = adminProfile as Admin

    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const { opportuniteId, action, raison } = body

    if (!opportuniteId || !action) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      )
    }

    if (action !== 'valider' && action !== 'refuser') {
      return NextResponse.json(
        { error: 'Action invalide' },
        { status: 400 }
      )
    }

    // Récupérer l'opportunité avec l'annonceur
    const { data: opportuniteData, error: opportuniteError } = await supabase
      .from('opportunites')
      .select('*, annonceur:annonceurs(email, nom_formation)')
      .eq('id', opportuniteId)
      .single()

    const opportunite = opportuniteData as any

    if (opportuniteError || !opportunite) {
      return NextResponse.json(
        { error: 'Opportunité introuvable' },
        { status: 404 }
      )
    }

    // Mettre à jour le statut de l'opportunité
    const nouveauStatut = action === 'valider' ? 'validee' : 'refusee'

    const { error: updateError } = await supabase
      .from('opportunites')
      // @ts-expect-error - Supabase type inference issue
      .update({ statut: nouveauStatut })
      .eq('id', opportuniteId)

    if (updateError) {
      console.error('Erreur lors de la mise à jour:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      )
    }

    // Insérer dans la table moderations
    const { error: moderationError } = await supabase
      .from('moderations')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        admin_id: admin.id,
        type: 'opportunite',
        entity_id: opportuniteId,
        action: action === 'valider' ? 'validee' : 'refusee',
        raison_refus: raison || null,
      })

    if (moderationError) {
      console.error('Erreur lors de l\'insertion de la modération:', moderationError)
      // On continue même si l'insertion échoue
    }

    // TODO: Envoyer un email de notification à l'annonceur
    // Email: opportunite.annonceur.email
    // Sujet: action === 'valider' ? 'Votre opportunité "{titre}" est en ligne' : 'Votre opportunité "{titre}" n\'a pas été validée'

    return NextResponse.json({
      success: true,
      message: action === 'valider'
        ? 'Opportunité validée avec succès'
        : 'Opportunité refusée avec succès',
      opportunite: {
        ...opportunite,
        statut: nouveauStatut,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la validation:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la validation' },
      { status: 500 }
    )
  }
}
