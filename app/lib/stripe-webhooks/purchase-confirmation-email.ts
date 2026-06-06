import { sendMail } from '@/app/lib/mailer'
import { sendAdvertiserPurchaseEmail } from '@/app/lib/email-notifications'
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

  const eventDate = new Date(achat.opportunite.date_evenement)
  const bookingDate = new Date(achat.created_at)
  const receiptReference = formatReceiptReference(achat.id)
  const organizer = achat.opportunite.annonceur?.nom_formation || 'Organisme'
  const comedianName = [achat.comedien.prenom, achat.comedien.nom].filter(Boolean).join(' ').trim()

  const subject = `Votre ticket formations-artistiques.fr - ${achat.opportunite.titre}`
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
      <h1 style="font-size:20px;margin-bottom:16px">Reservation confirmee</h1>
      <p>Bonjour ${comedianName || '},'}</p>
      <p>Votre reservation a bien ete confirmee sur formations-artistiques.fr.</p>
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Ticket / recu :</strong> ${receiptReference}</p>
        <p style="margin:0 0 8px"><strong>Opportunite :</strong> ${achat.opportunite.titre}</p>
        <p style="margin:0 0 8px"><strong>Organisme :</strong> ${organizer}</p>
        <p style="margin:0 0 8px"><strong>Date :</strong> ${eventDate.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <p style="margin:0 0 8px"><strong>Heure :</strong> ${eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p style="margin:0 0 8px"><strong>Montant paye :</strong> ${achat.prix_paye.toFixed(2)} EUR</p>
        <p style="margin:0 0 8px"><strong>Date d'achat :</strong> ${bookingDate.toLocaleDateString('fr-FR')} ${bookingDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p style="margin:0"><strong>Contact :</strong> ${achat.opportunite.contact_email}</p>
      </div>
      <p>Vous retrouvez egalement ce ticket dans votre espace comedien, onglet Mes Places.</p>
    </div>
  `

  const text = [
    'Reservation confirmee',
    `Ticket / recu : ${receiptReference}`,
    `Opportunite : ${achat.opportunite.titre}`,
    `Organisme : ${organizer}`,
    `Date : ${eventDate.toLocaleDateString('fr-FR')} ${eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
    `Montant paye : ${achat.prix_paye.toFixed(2)} EUR`,
    `Contact : ${achat.opportunite.contact_email}`,
  ].join('\n')

  try {
    await sendMail({
      to: achat.comedien.email,
      subject,
      html,
      text,
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
