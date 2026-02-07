import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUser, getAdminProfile } from '@/app/lib/supabase'

export async function GET(request: Request, context: { params?: { id?: string } }) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = await getAdminProfile()
    if (!admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Configuration manquante : SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const pathId = new URL(request.url).pathname.split('/').filter(Boolean).pop() || ""
    const comedienId = context.params?.id || pathId
    if (!comedienId) {
      return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
    }

    const { data: comedien, error: comedienError } = await supabase
      .from('comediens')
      .select('*')
      .eq('id', comedienId)
      .single()

    if (comedienError || !comedien) {
      return NextResponse.json({ error: 'Comédien introuvable' }, { status: 404 })
    }

    const { data: achats, error: achatsError } = await supabase
      .from('achats')
      .select('id, opportunite_id, prix_paye, statut, created_at')
      .eq('comedien_id', comedienId)
      .order('created_at', { ascending: false })

    if (achatsError) {
      console.error('Erreur achats:', achatsError)
    }

    const opportuniteIds = (achats || [])
      .map((achat) => achat.opportunite_id)
      .filter((id): id is string => Boolean(id))

    const { data: opportunites, error: opportunitesError } = opportuniteIds.length
      ? await supabase
        .from('opportunites')
        .select('id, titre, type, modele, image_url, prix_base, prix_reduit, date_evenement, annonceur_id')
        .in('id', opportuniteIds)
      : { data: [], error: null }

    if (opportunitesError) {
      console.error('Erreur opportunites:', opportunitesError)
    }

    const annonceurIds = (opportunites || [])
      .map((op) => op.annonceur_id)
      .filter((id): id is string => Boolean(id))

    const { data: annonceurs, error: annonceursError } = annonceurIds.length
      ? await supabase
        .from('annonceurs')
        .select('id, nom_formation, email')
        .in('id', annonceurIds)
      : { data: [], error: null }

    if (annonceursError) {
      console.error('Erreur annonceurs:', annonceursError)
    }

    const opportunitesById = new Map((opportunites || []).map((op) => [op.id, op]))
    const annonceursById = new Map((annonceurs || []).map((a) => [a.id, a]))

    const achatsEnrichis = (achats || []).map((achat) => {
      const opportunite = opportunitesById.get(achat.opportunite_id)
      const annonceur = opportunite ? annonceursById.get(opportunite.annonceur_id) : null
      return {
        ...achat,
        opportunite: opportunite || null,
        annonceur: annonceur || null,
      }
    })

    const { data: bloqueList, error: bloqueError } = await supabase
      .from('annonceurs_bloques')
      .select('id, annonceur_id, created_at')
      .eq('comedien_id', comedienId)
      .order('created_at', { ascending: false })

    if (bloqueError) {
      console.error('Erreur annonceurs_bloques:', bloqueError)
    }

    const bloqueAnnonceurIds = (bloqueList || [])
      .map((item) => item.annonceur_id)
      .filter((id): id is string => Boolean(id))

    const { data: bloqueAnnonceurs, error: bloqueAnnonceursError } = bloqueAnnonceurIds.length
      ? await supabase
        .from('annonceurs')
        .select('id, nom_formation, email')
        .in('id', bloqueAnnonceurIds)
      : { data: [], error: null }

    if (bloqueAnnonceursError) {
      console.error('Erreur annonceurs_bloques annonceurs:', bloqueAnnonceursError)
    }

    const bloqueAnnonceursById = new Map((bloqueAnnonceurs || []).map((a) => [a.id, a]))
    const annonceursBloques = (bloqueList || []).map((item) => ({
      ...item,
      annonceur: bloqueAnnonceursById.get(item.annonceur_id) || null,
    }))

    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications_email')
      .select('id, opportunite_id, objet, envoye, envoye_at, created_at')
      .eq('comedien_id', comedienId)
      .order('created_at', { ascending: false })

    if (notificationsError) {
      console.error('Erreur notifications_email:', notificationsError)
    }

    const notificationOpportuniteIds = (notifications || [])
      .map((notif) => notif.opportunite_id)
      .filter((id): id is string => Boolean(id))

    const { data: notifOpportunites, error: notifOppError } = notificationOpportuniteIds.length
      ? await supabase
        .from('opportunites')
        .select('id, titre, type, modele, date_evenement')
        .in('id', notificationOpportuniteIds)
      : { data: [], error: null }

    if (notifOppError) {
      console.error('Erreur notifications opportunites:', notifOppError)
    }

    const notifOppById = new Map((notifOpportunites || []).map((op) => [op.id, op]))
    const notificationsEnrichies = (notifications || []).map((notif) => ({
      ...notif,
      opportunite: notifOppById.get(notif.opportunite_id) || null,
    }))

    return NextResponse.json({
      comedien,
      achats: achatsEnrichis,
      annonceurs_bloques: annonceursBloques,
      notifications_email: notificationsEnrichies,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du comédien:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du comédien' },
      { status: 500 }
    )
  }
}
