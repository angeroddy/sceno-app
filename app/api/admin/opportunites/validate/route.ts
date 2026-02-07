import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getUser, getAdminProfile } from '@/app/lib/supabase'
import { sendMail } from '@/app/lib/mailer'
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

    // Envoyer un email aux comédiens concernés lorsque l'opportunité est validée
    if (action === 'valider') {
      try {
        const opportunityType = opportunite.type
        const annonceurId = opportunite.annonceur_id
        const annonceurNom = opportunite.annonceur?.nom_formation || 'Un organisme'
        const appUrl = process.env.APP_URL || 'http://localhost:3000'

        const { data: comediens } = await supabase
          .from('comediens')
          .select('id, email, preferences_opportunites')
          .contains('preferences_opportunites', [opportunityType])

        const comedienIds = (comediens || []).map((c: any) => c.id)

        const { data: blockedRows } = await supabase
          .from('annonceurs_bloques')
          .select('comedien_id')
          .eq('annonceur_id', annonceurId)
          .in('comedien_id', comedienIds.length > 0 ? comedienIds : ['00000000-0000-0000-0000-000000000000'])

        const blockedSet = new Set((blockedRows || []).map((r: any) => r.comedien_id))

        const recipients = (comediens || []).filter((c: any) => !blockedSet.has(c.id))

        const opportunityUrl = `${appUrl}/dashboard/opportunites/${opportunite.id}`
        const dateLabel = opportunite.date_evenement
          ? new Date(opportunite.date_evenement).toLocaleString('fr-FR')
          : ''

        for (const recipient of recipients) {
          const subject = `Nouvelle opportunité ${opportunite.modele === 'derniere_minute' ? 'Dernière minute' : 'Pré-vente'} : ${opportunite.titre}`
          const html = `
            <div style="font-family: Arial, sans-serif; color: #111;">
              <h2 style="margin: 0 0 12px;">${opportunite.titre}</h2>
              <p style="margin: 0 0 8px;">Nouvelle opportunité publiée par <strong>${annonceurNom}</strong>.</p>
              <p style="margin: 0 0 8px;"><strong>Date:</strong> ${dateLabel}</p>
              <p style="margin: 0 0 16px;"><strong>Prix:</strong> ${opportunite.prix_reduit}€ (au lieu de ${opportunite.prix_base}€)</p>
              <a href="${opportunityUrl}" style="display: inline-block; padding: 10px 16px; background: #E63832; color: #fff; text-decoration: none; border-radius: 6px;">Voir l'opportunité</a>
            </div>
          `
          await sendMail({
            to: recipient.email,
            subject,
            html,
            text: `${opportunite.titre} - ${opportunityUrl}`,
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
