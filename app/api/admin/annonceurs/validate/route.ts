import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getUser, getAdminProfile } from '@/lib/supabase'
import { sendAdvertiserValidatedEmail } from '@/lib/email-notifications'
import type { Annonceur, Admin } from '@/types'

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
    const { annonceurId, action, raison } = body

    if (!annonceurId || !action) {
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

    // Récupérer l'annonceur
    const { data: annonceurData, error: annonceurError } = await supabase
      .from('annonceurs')
      .select('*')
      .eq('id', annonceurId)
      .single()

    const annonceur = annonceurData as Annonceur | null

    if (annonceurError || !annonceur) {
      return NextResponse.json(
        { error: 'Annonceur introuvable' },
        { status: 404 }
      )
    }

    // Mettre à jour le statut de l'annonceur
    const identiteVerifiee = action === 'valider'

    const { error: updateError } = await supabase
      .from('annonceurs')
      // @ts-expect-error - Supabase type inference issue
      .update({ identite_verifiee: identiteVerifiee })
      .eq('id', annonceurId)

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
        type: 'annonceur',
        entity_id: annonceurId,
        action: action === 'valider' ? 'validee' : 'refusee',
        raison_refus: raison || null,
      })

    if (moderationError) {
      console.error('Erreur lors de l\'insertion de la modération:', moderationError)
      // On continue même si l'insertion échoue
    }

    if (action === 'valider') {
      try {
        await sendAdvertiserValidatedEmail(annonceur)
      } catch (emailError) {
        console.error('Erreur envoi email validation annonceur:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      message: action === 'valider'
        ? 'Annonceur validé avec succès'
        : 'Annonceur refusé avec succès',
      annonceur: {
        ...annonceur,
        identite_verifiee: identiteVerifiee,
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
