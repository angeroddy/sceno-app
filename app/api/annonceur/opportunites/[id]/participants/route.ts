import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/app/lib/supabase"
import { createAdminSupabaseClient } from "@/app/lib/supabase-admin"
import type { Annonceur, Comedien } from "@/app/types"

type ParticipantRow = {
  id: string
  comedien_id: string
  created_at: string
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { data: annonceurData, error: annonceurError } = await supabase
      .from("annonceurs")
      .select("*")
      .eq("auth_user_id", user.id)
      .single()

    if (annonceurError || !annonceurData) {
      return NextResponse.json({ error: "Profil annonceur introuvable" }, { status: 404 })
    }

    const annonceur = annonceurData as Annonceur
    const { id } = await context.params

    const { data: opportunite, error: opportuniteError } = await supabase
      .from("opportunites")
      .select("id, titre")
      .eq("id", id)
      .eq("annonceur_id", annonceur.id)
      .single()

    if (opportuniteError || !opportunite) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 })
    }

    const adminSupabase = createAdminSupabaseClient()
    const { data: achatsData, error: achatsError } = await adminSupabase
      .from("achats")
      .select("id, comedien_id, created_at")
      .eq("opportunite_id", id)
      .eq("statut", "confirmee")
      .order("created_at", { ascending: false })

    if (achatsError) {
      console.error("Erreur récupération participants:", achatsError)
      return NextResponse.json({ error: "Impossible de récupérer les participants" }, { status: 500 })
    }

    const achats = (achatsData || []) as ParticipantRow[]
    const comedienIds = Array.from(new Set(achats.map((achat) => achat.comedien_id).filter(Boolean)))

    let comediensById = new Map<
      string,
      Pick<Comedien, "id" | "nom" | "prenom" | "photo_url" | "lien_demo" | "compte_supprime" | "date_naissance" | "genre">
    >()

    if (comedienIds.length > 0) {
      const { data: comediensData, error: comediensError } = await adminSupabase
        .from("comediens")
        .select("id, nom, prenom, photo_url, lien_demo, compte_supprime, date_naissance, genre")
        .in("id", comedienIds)

      if (comediensError) {
        console.error("Erreur récupération comédiens participants:", comediensError)
        return NextResponse.json({ error: "Impossible de récupérer les profils des participants" }, { status: 500 })
      }

      comediensById = new Map(
        ((comediensData || []) as Array<
          Pick<Comedien, "id" | "nom" | "prenom" | "photo_url" | "lien_demo" | "compte_supprime" | "date_naissance" | "genre">
        >).map((comedien) => [comedien.id, comedien])
      )
    }

    const participants = achats.map((achat) => {
      const comedien = comediensById.get(achat.comedien_id)

      return {
        achat_id: achat.id,
        purchased_at: achat.created_at,
        comedien: comedien
          ? {
              id: comedien.id,
              nom: comedien.compte_supprime ? "Compte" : comedien.nom,
              prenom: comedien.compte_supprime ? "supprimé" : comedien.prenom,
              photo_url: comedien.compte_supprime ? null : comedien.photo_url,
              lien_demo: comedien.compte_supprime ? null : comedien.lien_demo,
              date_naissance: comedien.compte_supprime ? null : comedien.date_naissance,
              genre: comedien.compte_supprime ? null : comedien.genre,
              compte_supprime: Boolean(comedien.compte_supprime),
            }
          : {
              id: achat.comedien_id,
              nom: "Profil",
              prenom: "indisponible",
              photo_url: null,
              lien_demo: null,
              date_naissance: null,
              genre: null,
              compte_supprime: true,
            },
      }
    })

    return NextResponse.json({
      opportunite,
      participants,
    })
  } catch (error) {
    console.error("Erreur serveur participants opportunité:", error)
    return NextResponse.json(
      { error: "Une erreur s'est produite. Si le problème persiste, contactez le support" },
      { status: 500 }
    )
  }
}
