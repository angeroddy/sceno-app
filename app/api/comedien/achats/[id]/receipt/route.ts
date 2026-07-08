import { NextRequest, NextResponse } from 'next/server'
import { requireComedian } from '@/server/auth'
import { buildReceiptPdf, formatReceiptReference } from '@/lib/pdf-receipt'
import type { Achat } from '@/types'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireComedian()
    if (!auth.ok) return auth.response
    const { supabase, profile: comedien } = auth
    const { id: achatId } = await context.params

    const { data: achatData, error: achatError } = await supabase
      .from('achats')
      .select(`
        id,
        prix_paye,
        statut,
        created_at,
        opportunite:opportunites(
          titre,
          image_url,
          date_evenement,
          contact_email,
          annonceur:annonceurs(nom_formation)
        )
      `)
      .eq('id', achatId)
      .eq('comedien_id', comedien.id)
      .in('statut', ['confirmee', 'remboursee'])
      .maybeSingle()

    if (achatError || !achatData) {
      return NextResponse.json({ error: 'Achat introuvable' }, { status: 404 })
    }

    const achat = achatData as Pick<Achat, 'id' | 'prix_paye' | 'statut' | 'created_at'> & {
      opportunite: {
        titre: string
        image_url: string | null
        date_evenement: string
        contact_email: string
        annonceur: { nom_formation: string } | null
      } | null
    }

    if (!achat.opportunite) {
      return NextResponse.json({ error: 'Opportunite introuvable pour cet achat' }, { status: 404 })
    }

    const receiptReference = formatReceiptReference(achat.id)
    const pdf = await buildReceiptPdf({
      receiptReference,
      comedianName: [comedien.prenom, comedien.nom].filter(Boolean).join(' ').trim(),
      comedianEmail: comedien.email,
      opportunityTitle: achat.opportunite.titre,
      organizer: achat.opportunite.annonceur?.nom_formation || 'Organisme',
      eventDate: new Date(achat.opportunite.date_evenement).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris',
      }),
      purchaseDate: new Date(achat.created_at).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris',
      }),
      amount: `${achat.prix_paye.toFixed(2)} EUR`,
      status: achat.statut === 'confirmee' ? 'Confirmee' : 'Remboursee',
      contactEmail: achat.opportunite.contact_email,
      eventImageUrl: achat.opportunite.image_url,
    })

    const filename = `recu-formations-artistiques-${receiptReference.toLowerCase()}.pdf`

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Erreur generation recu PDF:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
