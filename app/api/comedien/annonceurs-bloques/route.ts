import { NextResponse } from "next/server"
import { requireComedian } from "@/app/server/auth"

export async function GET() {
  try {
    const auth = await requireComedian()
    if (!auth.ok) return auth.response
    const { supabase, profile: comedienTyped } = auth

    const { data: rows, error } = await supabase
      .from("annonceurs_bloques")
      .select("annonceur_id, annonceur:annonceurs(nom_formation, email)")
      .eq("comedien_id", comedienTyped.id)

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
    const auth = await requireComedian()
    if (!auth.ok) return auth.response
    const { supabase, profile: comedienTyped } = auth

    const body = await request.json()
    const { annonceur_id } = body
    if (!annonceur_id) {
      return NextResponse.json({ error: "annonceur_id requis" }, { status: 400 })
    }

    const { error: insertError } = await supabase
      .from("annonceurs_bloques")
      // @ts-expect-error - Supabase type inference issue
      .insert({ comedien_id: comedienTyped.id, annonceur_id })

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
    const auth = await requireComedian()
    if (!auth.ok) return auth.response
    const { supabase, profile: comedienTyped } = auth

    const { annonceur_id } = await request.json()
    if (!annonceur_id) {
      return NextResponse.json({ error: "annonceur_id requis" }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from("annonceurs_bloques")
      .delete()
      .eq("comedien_id", comedienTyped.id)
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
