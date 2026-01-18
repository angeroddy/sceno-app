import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getUser, getAdminProfile } from '@/app/lib/supabase'
import type { Annonceur } from '@/app/types'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    // Await params dans Next.js 16
    const { id } = await params

    // Récupérer l'annonceur avec toutes ses informations
    const { data, error } = await supabase
      .from('annonceurs')
      .select(`
        *,
        opportunites:opportunites(id, titre, statut, created_at)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erreur Supabase:', error)
      return NextResponse.json({ error: 'Impossible de récupérer les informations de l\'annonceur' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Annonceur non trouvé' }, { status: 404 })
    }

    const annonceur = data as unknown as Annonceur & {
      opportunites?: { id: string; titre: string; statut: string; created_at: string }[]
    }

    // Récupérer les URLs signées pour les pièces d'identité
    let pieceIdentiteUrl: string | null = null
    let representantPieceIdentiteUrl: string | null = null

    if (annonceur.piece_identite_url) {
      const { data: pieceData } = await supabase.storage
        .from('pieces-identite')
        .createSignedUrl(annonceur.piece_identite_url, 3600) // 1 heure

      pieceIdentiteUrl = pieceData?.signedUrl || null
    }

    if (annonceur.representant_piece_identite_url) {
      const { data: representantData } = await supabase.storage
        .from('pieces-identite')
        .createSignedUrl(annonceur.representant_piece_identite_url, 3600)

      representantPieceIdentiteUrl = representantData?.signedUrl || null
    }

    return NextResponse.json({
      annonceur,
      pieceIdentiteUrl,
      representantPieceIdentiteUrl,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'annonceur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'annonceur' },
      { status: 500 }
    )
  }
}
