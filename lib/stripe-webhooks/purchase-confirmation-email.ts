import {
  sendAdvertiserPurchaseEmail,
  sendComedianPurchaseEmail,
} from '@/lib/email-notifications'
import type { SupabaseAdmin } from './events'

function formatReceiptReference(achatId: string): string {
  return `SCN-${achatId.replace(/-/g, '').slice(0, 12).toUpperCase()}`
}

/**
 * Envoie les emails de confirmation (comédien + annonceur) après un achat confirmé.
 * Les échecs d'envoi sont seulement loggés : ils ne doivent pas faire échouer le webhook.
 */
export async function sendPurchaseConfirmationEmail(
  supabase: SupabaseAdmin,
  achatId: string
) {
  const { data, error } = await supabase
    .from('achats')
    .select(`
      id,
      prix_paye,
      created_at,
      opportunite:opportunites(
        titre,
        date_evenement,
        contact_email,
        annonceur:annonceurs(nom_formation, email)
      ),
      comedien:comediens(
        prenom,
        nom,
        email
      )
    `)
    .eq('id', achatId)
    .maybeSingle()

  if (error || !data) {
    console.warn('Impossible de charger les donnees email achat:', error)
    return
  }

  const achat = data as {
    id: string
    prix_paye: number
    created_at: string
    opportunite: {
      titre: string
      date_evenement: string
      contact_email: string
      annonceur: { nom_formation: string; email: string } | null
    } | null
    comedien: {
      prenom: string
      nom: string
      email: string
    } | null
  }

  if (!achat.comedien?.email || !achat.opportunite) {
    return
  }

  const receiptReference = formatReceiptReference(achat.id)
  const organizer = achat.opportunite.annonceur?.nom_formation || 'Organisme'
  const comedianName = [achat.comedien.prenom, achat.comedien.nom].filter(Boolean).join(' ').trim()

  try {
    await sendComedianPurchaseEmail({
      to: achat.comedien.email,
      comedianName,
      receiptReference,
      opportunityTitle: achat.opportunite.titre,
      organizer,
      eventDate: achat.opportunite.date_evenement,
      paidPrice: achat.prix_paye,
      purchaseDate: achat.created_at,
      contactEmail: achat.opportunite.contact_email,
    })
  } catch (mailError) {
    console.warn('Email de confirmation achat comédien non envoyé:', mailError)
  }

  try {
    if (achat.opportunite.annonceur?.email) {
      await sendAdvertiserPurchaseEmail({
        advertiserEmail: achat.opportunite.annonceur.email,
        advertiserName: organizer,
        opportunityTitle: achat.opportunite.titre,
        comedianName: comedianName || 'Un comédien',
        paidPrice: achat.prix_paye,
        purchaseDate: achat.created_at,
      })
    }
  } catch (mailError) {
    console.warn('Email achat annonceur non envoyé:', mailError)
  }
}
