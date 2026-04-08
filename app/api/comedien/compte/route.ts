import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/app/lib/supabase"
import { createAdminSupabaseClient } from "@/app/lib/supabase-admin"

type ComedienDeletionRecord = {
  id: string
  nom: string
  prenom: string
  email: string
  photo_url: string | null
  compte_supprime: boolean
}

function extractPublicStoragePath(publicUrl: string | null, bucket: string) {
  if (!publicUrl) return null

  try {
    const url = new URL(publicUrl)
    const publicPrefix = `/storage/v1/object/public/${bucket}/`
    const prefixIndex = url.pathname.indexOf(publicPrefix)

    if (prefixIndex === -1) return null

    return decodeURIComponent(url.pathname.slice(prefixIndex + publicPrefix.length))
  } catch {
    return null
  }
}

function buildAnonymizedEmail(comedienId: string) {
  const suffix = comedienId.replace(/-/g, "").slice(0, 12)
  return `deleted-comedian-${suffix}@scenio.invalid`
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

    const { data: comedien, error: comedienError } = await supabase
      .from("comediens")
      .select("id, nom, prenom, email, photo_url, compte_supprime")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    if (comedienError) {
      console.error("Erreur récupération profil comédien:", comedienError)
      return NextResponse.json({ error: "Impossible de charger votre profil." }, { status: 500 })
    }

    const comedienRecord = comedien as ComedienDeletionRecord | null
    if (!comedienRecord) {
      return NextResponse.json({ error: "Profil comédien introuvable." }, { status: 404 })
    }

    if (comedienRecord.compte_supprime) {
      const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(user.id)

      if (deleteAuthError) {
        console.error("Erreur suppression Auth sur compte déjà supprimé:", deleteAuthError)
        return NextResponse.json(
          { error: "Le compte a été anonymisé, mais l'adresse e-mail n'a pas encore été libérée." },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    const anonymizedEmail = buildAnonymizedEmail(comedienRecord.id)
    const photoPath = extractPublicStoragePath(comedienRecord.photo_url, "photos")

    const { error: auditError } = await adminSupabase
      .from("account_deletions")
      .insert({
        auth_user_id: user.id,
        profile_type: "comedian",
        profile_id: comedienRecord.id,
        deleted_by: "self",
        reason: "user_requested_self_delete",
        metadata: {
          original_email: comedienRecord.email,
          original_nom: comedienRecord.nom,
          original_prenom: comedienRecord.prenom,
          had_photo: Boolean(comedienRecord.photo_url),
        },
      } as never)

    if (auditError) {
      console.error("Erreur audit suppression compte:", auditError)
      return NextResponse.json({ error: "Impossible d'enregistrer la suppression du compte." }, { status: 500 })
    }

    const { error: cleanupNotificationsError } = await adminSupabase
      .from("notifications_email")
      .delete()
      .eq("comedien_id", comedienRecord.id)

    if (cleanupNotificationsError) {
      console.error("Erreur suppression notifications comédien:", cleanupNotificationsError)
      return NextResponse.json({ error: "Impossible de nettoyer les notifications du compte." }, { status: 500 })
    }

    const { error: cleanupBlockedError } = await adminSupabase
      .from("annonceurs_bloques")
      .delete()
      .eq("comedien_id", comedienRecord.id)

    if (cleanupBlockedError) {
      console.error("Erreur suppression annonceurs bloqués:", cleanupBlockedError)
      return NextResponse.json({ error: "Impossible de nettoyer les préférences du compte." }, { status: 500 })
    }

    const { error: cleanupViewsError } = await adminSupabase
      .from("opportunite_vues")
      .delete()
      .eq("comedien_id", comedienRecord.id)

    if (cleanupViewsError) {
      console.error("Erreur suppression vues opportunités:", cleanupViewsError)
      return NextResponse.json({ error: "Impossible de nettoyer l'historique du compte." }, { status: 500 })
    }

    const { error: anonymizeError } = await adminSupabase
      .from("comediens")
      .update({
        nom: "Compte",
        prenom: "supprimé",
        email: anonymizedEmail,
        email_anonymise: comedienRecord.email,
        photo_url: null,
        lien_demo: null,
        date_naissance: null,
        preferences_opportunites: [],
        genre: null,
        compte_supprime: true,
        compte_supprime_at: new Date().toISOString(),
        compte_supprime_par: "self",
      } as never)
      .eq("id", comedienRecord.id)

    if (anonymizeError) {
      console.error("Erreur anonymisation profil comédien:", anonymizeError)
      return NextResponse.json({ error: "Impossible d'anonymiser votre profil." }, { status: 500 })
    }

    if (photoPath) {
      const { error: storageError } = await adminSupabase.storage
        .from("photos")
        .remove([photoPath])

      if (storageError) {
        console.warn("Suppression photo profil comédien impossible:", storageError)
      }
    }

    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(user.id)

    if (deleteAuthError) {
      console.error("Erreur suppression compte Auth comédien:", deleteAuthError)
      return NextResponse.json(
        { error: "Le profil a été fermé, mais l'adresse e-mail n'a pas encore été libérée." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur suppression logique compte comédien:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la suppression du compte." },
      { status: 500 }
    )
  }
}
