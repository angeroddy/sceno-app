/**
 * Cron job — Gestion automatique des statuts d'opportunités
 *
 * Appel planifié : une fois par jour (ex : Vercel Cron ou GitHub Actions)
 *   curl -X POST https://votre-domaine/api/admin/cron
 *         -H "Authorization: Bearer <CRON_SECRET>"
 *
 * Actions effectuées :
 *   1. Retirer le statut "prévente" 28 jours avant l'événement
 *      → modele passe de 'pre_vente' à 'derniere_minute'
 *   2. Marquer les opportunités expirées (date_evenement dépassée)
 *      → statut passe à 'expiree'
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  // Sécurité : vérifier un secret pour éviter les appels non autorisés
  const authHeader = request.headers.get("Authorization")
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Configuration manquante : SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      )
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // Cron route: no cookies to set.
          },
        },
      }
    )
    const now = new Date()
    const results = { prevente_retirees: 0, expirees: 0 }

    // ─── 1. Retirer le statut prévente 28 jours avant l'événement ─────────
    // Toutes les opportunités avec modele = 'pre_vente' dont la date_evenement
    // est dans ≤ 28 jours (mais pas encore expirées)
    const cutoffDate28j = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)

    const { data: preventeRows } = await supabase
      .from("opportunites")
      .select("id, titre, date_evenement")
      .eq("modele", "pre_vente")
      .eq("statut", "validee")
      .lt("date_evenement", cutoffDate28j.toISOString())
      .gt("date_evenement", now.toISOString()) // pas encore expirée

    if (preventeRows && preventeRows.length > 0) {
      const ids = preventeRows.map((r) => r.id)
      await supabase
        .from("opportunites")
        .update({ modele: "derniere_minute" } as unknown as never)
        .in("id", ids)

      results.prevente_retirees = ids.length
      console.log(
        `[CRON] Statut prévente retiré pour ${ids.length} opportunité(s):`,
        preventeRows.map((r) => r.titre)
      )
    }

    // ─── 2. Marquer les opportunités expirées ──────────────────────────────
    const { data: expiredRows } = await supabase
      .from("opportunites")
      .select("id, titre")
      .eq("statut", "validee")
      .lt("date_evenement", now.toISOString())

    if (expiredRows && expiredRows.length > 0) {
      const ids = expiredRows.map((r) => r.id)
      await supabase
        .from("opportunites")
        .update({ statut: "expiree" } as unknown as never)
        .in("id", ids)

      results.expirees = ids.length
      console.log(
        `[CRON] Opportunités expirées: ${ids.length} →`,
        expiredRows.map((r) => r.titre)
      )
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    })
  } catch (error) {
    console.error("[CRON] Erreur:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'exécution du cron" },
      { status: 500 }
    )
  }
}
