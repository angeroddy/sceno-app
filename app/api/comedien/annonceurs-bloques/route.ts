import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/app/lib/supabase"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { data: comedien } = await supabase
      .from("comediens")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (!comedien) {
      return NextResponse.json({ error: "Profil comédien introuvable" }, { status: 404 })
    }

    const { data: rows, error } = await supabase
      .from("annonceurs_bloques")
      .select("annonceur_id, annonceur:annonceurs(nom_formation, email)")
      .eq("comedien_id", comedien.id)

    if (error) {
      return NextResponse.json({ error: "Erreur chargement" }, { status: 500 })
    }

    return NextResponse.json({ annonceurs: rows || [] })
  } catch (error) {
    console.error("Erreur API bloque:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { annonceur_id } = body
    if (!annonceur_id) {
      return NextResponse.json({ error: "annonceur_id requis" }, { status: 400 })
    }

    const { data: comedien } = await supabase
      .from("comediens")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (!comedien) {
      return NextResponse.json({ error: "Profil comédien introuvable" }, { status: 404 })
    }

    const { error: insertError } = await supabase
      .from("annonceurs_bloques")
      .insert({ comedien_id: comedien.id, annonceur_id })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur API bloque:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { annonceur_id } = await request.json()
    if (!annonceur_id) {
      return NextResponse.json({ error: "annonceur_id requis" }, { status: 400 })
    }

    const { data: comedien } = await supabase
      .from("comediens")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (!comedien) {
      return NextResponse.json({ error: "Profil comédien introuvable" }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from("annonceurs_bloques")
      .delete()
      .eq("comedien_id", comedien.id)
      .eq("annonceur_id", annonceur_id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur API debloque:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
