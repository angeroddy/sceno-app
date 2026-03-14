import { MetadataRoute } from "next"
import { createAdminSupabaseClient } from "@/app/lib/supabase-admin"
import { createServerSupabaseClient } from "@/app/lib/supabase"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://scenio.fr"

async function getSupabase() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createAdminSupabaseClient()
  }
  return createServerSupabaseClient()
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await getSupabase()

  const { data: opportunites } = await supabase
    .from("opportunites")
    .select("id, updated_at")
    .in("statut", ["validee", "complete"])

  const opportuniteEntries: MetadataRoute.Sitemap = (opportunites ?? []).map(
    (opp: { id: string; updated_at: string }) => ({
      url: `${SITE_URL}/opportunite/${opp.id}`,
      lastModified: new Date(opp.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })
  )

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/connexion`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/inscription`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/inscription/annonceur`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...opportuniteEntries,
  ]
}
