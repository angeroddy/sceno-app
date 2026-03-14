import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { reconcileOpportunityPlaces } from '@/app/lib/opportunity-availability'
import type { Annonceur, Database } from '@/app/types'
import { createOpportunitySchema } from '@/app/lib/opportunity-validation'

type OpportunitesTableInsert = {
  insert: (
    values: Database["public"]["Tables"]["opportunites"]["Insert"]
  ) => Promise<{ error: { message?: string } | null }>
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { data: annonceurData, error: annonceurError } = await supabase
      .from('annonceurs')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (annonceurError || !annonceurData) {
      return NextResponse.json({ error: 'Profil annonceur introuvable' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const statut = searchParams.get('statut')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('opportunites')
      .select('*', { count: 'exact' })
      .eq('annonceur_id', (annonceurData as { id: string }).id)

    if (statut && statut !== 'all') {
      query = query.eq('statut', statut)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Erreur lors de la recuperation des opportunites annonceur:', error)
      return NextResponse.json({ error: 'Impossible de recuperer les opportunites' }, { status: 500 })
    }

    const opportunites = await Promise.all(
      (data || []).map(async (opportunite) => {
        const currentOpportunity = opportunite as Record<string, unknown> & { id: string }
        const reconciledOpportunity = await reconcileOpportunityPlaces(
          supabase as never,
          currentOpportunity.id
        )

        if (!reconciledOpportunity) {
          return currentOpportunity
        }

        return {
          ...currentOpportunity,
          places_restantes: reconciledOpportunity.places_restantes,
        }
      })
    )

    return NextResponse.json({
      opportunites,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Erreur serveur interne annonceur opportunites:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { data: annonceurData, error: annonceurError } = await supabase
      .from('annonceurs')
      .select('id, identite_verifiee, stripe_onboarding_complete, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
      .eq('auth_user_id', user.id)
      .single()

    if (annonceurError || !annonceurData) {
      return NextResponse.json({ error: 'Profil annonceur introuvable' }, { status: 404 })
    }

    const annonceur = annonceurData as Pick<
      Annonceur,
      | 'id'
      | 'identite_verifiee'
      | 'stripe_onboarding_complete'
      | 'stripe_account_id'
      | 'stripe_charges_enabled'
      | 'stripe_payouts_enabled'
    >

    if (!annonceur.identite_verifiee) {
      return NextResponse.json(
        { error: 'Votre compte doit etre verifie avant de publier des opportunites' },
        { status: 403 }
      )
    }

    if (!annonceur.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: 'Finalisez le onboarding Stripe avant de creer une opportunite' },
        { status: 403 }
      )
    }

    if (
      !annonceur.stripe_account_id ||
      !annonceur.stripe_charges_enabled ||
      !annonceur.stripe_payouts_enabled
    ) {
      return NextResponse.json(
        { error: 'Votre compte Stripe Connect doit etre entierement active avant de publier des opportunites' },
        { status: 403 }
      )
    }

    const rawBody = await request.json()
    const parsedBody = createOpportunitySchema.safeParse(rawBody)

    if (!parsedBody.success) {
      const firstIssue = parsedBody.error.issues[0]
      return NextResponse.json(
        { error: firstIssue?.message || "Le formulaire contient des données invalides" },
        { status: 400 }
      )
    }

    const insertPayload = {
      ...parsedBody.data,
      places_restantes: parsedBody.data.nombre_places,
      statut: 'en_attente' as const,
    }

    const opportunitesTable = supabase.from('opportunites') as unknown as OpportunitesTableInsert
    const { error: insertError } = await opportunitesTable.insert({
      ...insertPayload,
      annonceur_id: annonceur.id,
    })

    if (insertError) {
      return NextResponse.json(
        { error: "Impossible de publier l'opportunite. Veuillez verifier vos informations et reessayer" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
