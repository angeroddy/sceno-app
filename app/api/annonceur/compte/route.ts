import { NextResponse } from "next/server"

import { createAdminSupabaseClient } from "@/lib/supabase-admin"
import { createServerSupabaseClient } from "@/lib/supabase"

type AnnonceurDeletionRecord = {
  id: string
  email: string
  nom_formation: string
  nom_entreprise: string | null
  compte_supprime?: boolean | null
}

function buildAnonymizedEmail(annonceurId: string) {
  const suffix = annonceurId.replace(/-/g, "").slice(0, 12)
  return `deleted-advertiser-${suffix}@scenio.invalid`
}

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { data: annonceur, error: annonceurError } = await supabase
      .from("annonceurs")
      .select("id, email, nom_formation, nom_entreprise, compte_supprime")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    if (annonceurError) {
      console.error("Erreur récupération profil annonceur:", annonceurError)
      return NextResponse.json({ error: "Impossible de charger votre profil." }, { status: 500 })
    }

    const annonceurRecord = annonceur as AnnonceurDeletionRecord | null
    if (!annonceurRecord) {
      return NextResponse.json({ error: "Profil annonceur introuvable." }, { status: 404 })
    }

    if (annonceurRecord.compte_supprime) {
      const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(user.id)

      if (deleteAuthError) {
        console.error("Erreur suppression Auth sur annonceur déjà supprimé:", deleteAuthError)
        return NextResponse.json(
          { error: "Le compte a été anonymisé, mais l'adresse e-mail n'a pas encore été libérée." },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    const anonymizedEmail = buildAnonymizedEmail(annonceurRecord.id)

    const { error: auditError } = await adminSupabase
      .from("account_deletions")
      .insert({
        auth_user_id: user.id,
        profile_type: "advertiser",
        profile_id: annonceurRecord.id,
        deleted_by: "self",
        reason: "user_requested_self_delete",
        metadata: {
          original_email: annonceurRecord.email,
          original_nom_formation: annonceurRecord.nom_formation,
          original_nom_entreprise: annonceurRecord.nom_entreprise,
        },
      } as never)

    if (auditError) {
      console.error("Erreur audit suppression annonceur:", auditError)
      return NextResponse.json({ error: "Impossible d'enregistrer la suppression du compte." }, { status: 500 })
    }

    const now = new Date().toISOString()
    const { error: opportunitiesError } = await adminSupabase
      .from("opportunites")
      .update({
        statut: "supprimee",
        statut_qualifie_at: now,
      } as never)
      .eq("annonceur_id", annonceurRecord.id)
      .neq("statut", "supprimee")

    if (opportunitiesError) {
      console.error("Erreur suppression opportunités annonceur:", opportunitiesError)
      return NextResponse.json({ error: "Impossible de fermer les opportunités du compte." }, { status: 500 })
    }

    const { error: cleanupBlockedError } = await adminSupabase
      .from("annonceurs_bloques")
      .delete()
      .eq("annonceur_id", annonceurRecord.id)

    if (cleanupBlockedError) {
      console.error("Erreur nettoyage blocages annonceur:", cleanupBlockedError)
      return NextResponse.json({ error: "Impossible de nettoyer les préférences liées au compte." }, { status: 500 })
    }

    const { error: anonymizeError } = await adminSupabase
      .from("annonceurs")
      .update({
        nom_formation: "Compte supprimé",
        email: anonymizedEmail,
        email_anonymise: annonceurRecord.email,
        iban: null,
        nom_titulaire_compte: null,
        bic_swift: null,
        telephone: null,
        nom: null,
        prenom: null,
        date_naissance: null,
        adresse_rue: null,
        adresse_ville: null,
        adresse_code_postal: null,
        adresse_pays: null,
        piece_identite_url: null,
        nom_entreprise: null,
        site_internet: null,
        numero_legal: null,
        siege_rue: null,
        siege_ville: null,
        siege_code_postal: null,
        siege_pays: null,
        representant_nom: null,
        representant_prenom: null,
        representant_telephone: null,
        representant_date_naissance: null,
        representant_adresse_rue: null,
        representant_adresse_ville: null,
        representant_adresse_code_postal: null,
        representant_adresse_pays: null,
        representant_piece_identite_url: null,
        compte_supprime: true,
        compte_supprime_at: now,
        compte_supprime_par: "self",
      } as never)
      .eq("id", annonceurRecord.id)

    if (anonymizeError) {
      console.error("Erreur anonymisation profil annonceur:", anonymizeError)
      return NextResponse.json({ error: "Impossible d'anonymiser votre profil." }, { status: 500 })
    }

    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(user.id)

    if (deleteAuthError) {
      console.error("Erreur suppression compte Auth annonceur:", deleteAuthError)
      return NextResponse.json(
        { error: "Le profil a été fermé, mais l'adresse e-mail n'a pas encore été libérée." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur suppression logique compte annonceur:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la suppression du compte." },
      { status: 500 }
    )
  }
}
