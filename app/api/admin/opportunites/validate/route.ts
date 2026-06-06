import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getUser, getAdminProfile } from '@/lib/supabase'
import { sendOpportunityAlertEmail } from '@/lib/email-notifications'
import type { Admin, Annonceur, Opportunite } from '@/app/types'

type OpportuniteForValidation = Opportunite & {
  annonceur: Pick<
    Annonceur,
    | 'email'
    | 'nom_formation'
    | 'stripe_account_id'
    | 'stripe_charges_enabled'
    | 'stripe_payouts_enabled'
  > | null
}

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
      .select('*, annonceur:annonceurs(email, nom_formation, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled)')
      .eq('id', opportuniteId)
      .single()

    const opportunite = opportuniteData as OpportuniteForValidation | null

    if (opportuniteError || !opportunite) {
      return NextResponse.json(
        { error: 'Opportunité introuvable' },
        { status: 404 }
      )
    }

    // Mettre à jour le statut de l'opportunité
    const nouveauStatut = action === 'valider' ? 'validee' : 'refusee'

    if (opportunite.statut === nouveauStatut) {
      return NextResponse.json({
        success: true,
        message: action === 'valider'
          ? 'Opportunité déjà validée'
          : 'Opportunité déjà refusée',
        opportunite,
      })
    }

    if (opportunite.statut !== 'en_attente') {
      return NextResponse.json(
        { error: "Seules les opportunités en attente peuvent être modérées" },
        { status: 409 }
      )
    }

    if (
      action === 'valider' &&
      (!opportunite.annonceur?.stripe_account_id ||
        !opportunite.annonceur.stripe_charges_enabled ||
        !opportunite.annonceur.stripe_payouts_enabled)
    ) {
      return NextResponse.json(
        {
          error: "Impossible de valider cette opportunité tant que Stripe Connect n'est pas actif pour l'annonceur",
        },
        { status: 409 }
      )
    }

    const { error: updateError } = await supabase
      .from('opportunites')
      .update({ statut: nouveauStatut } as unknown as never)
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
      .insert({
        admin_id: admin.id,
        type: 'opportunite',
        entity_id: opportuniteId,
        action: action === 'valider' ? 'validee' : 'refusee',
        raison_refus: raison || null,
      } as unknown as never)

    if (moderationError) {
      console.error('Erreur lors de l\'insertion de la modération:', moderationError)
      // On continue même si l'insertion échoue
    }

    // Envoyer un email aux comédiens concernés lorsque l'opportunité est validée
    if (action === 'valider') {
      try {
        const opportunityType = opportunite.type
        const annonceurId = opportunite.annonceur_id
        const annonceurNom = opportunite.annonceur?.nom_formation || 'Un organisme'

        const { data: comediens } = await supabase
          .from('comediens')
          .select('id, email, preferences_opportunites, email_verifie, compte_supprime')
          .contains('preferences_opportunites', [opportunityType])

        type ComedienRow = {
          id: string
          email: string
          preferences_opportunites: string[]
          email_verifie?: boolean
          compte_supprime?: boolean
        }
        const comediensList = ((comediens || []) as ComedienRow[])
          .filter((comedien) => comedien.email_verifie !== false && !comedien.compte_supprime)
        const comedienIds = comediensList.map((c) => c.id)

        const { data: blockedRows } = await supabase
          .from('annonceurs_bloques')
          .select('comedien_id')
          .eq('annonceur_id', annonceurId)
          .in('comedien_id', comedienIds.length > 0 ? comedienIds : ['00000000-0000-0000-0000-000000000000'])

        type BlockedRow = { comedien_id: string }
        const blockedSet = new Set((blockedRows || [] as BlockedRow[]).map((r) => r.comedien_id))

        const recipients = comediensList.filter((c) => !blockedSet.has(c.id))

        for (const recipient of recipients) {
          await sendOpportunityAlertEmail(recipient.email, {
            id: opportunite.id,
            titre: opportunite.titre,
            type: opportunite.type,
            modele: opportunite.modele,
            prix_base: opportunite.prix_base,
            prix_reduit: opportunite.prix_reduit,
            reduction_pourcentage: opportunite.reduction_pourcentage,
            date_evenement: opportunite.date_evenement,
            annonceurNom,
          })
        }
      } catch (emailError) {
        console.error("Erreur envoi email:", emailError)
      }
    }

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
