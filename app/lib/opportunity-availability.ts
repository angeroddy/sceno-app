type OpportunityReadClient = {
  from: (table: 'opportunites' | 'achats') => {
    select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => {
      eq: (column: string, value: string) => {
        maybeSingle?: () => Promise<{
          data: { id: string; nombre_places: number; places_restantes: number } | null
          error: unknown
        }>
        eq?: (column: string, value: string) => Promise<{ count: number | null; error: unknown }>
      }
    }
  }
}

export async function reconcileOpportunityPlaces(
  supabase: OpportunityReadClient,
  opportunityId: string
) {
  const { data: opportunite, error: opportuniteError } = await supabase
    .from('opportunites')
    .select('id, nombre_places, places_restantes')
    .eq('id', opportunityId)
    .maybeSingle!()

  if (opportuniteError || !opportunite) {
    return null
  }

  const { count: confirmedCount, error: achatsError } = await supabase
    .from('achats')
    .select('id', { count: 'exact', head: true })
    .eq('opportunite_id', opportunityId)
    .eq!('statut', 'confirmee')

  if (achatsError) {
    return opportunite
  }

  return {
    ...opportunite,
    places_restantes: Math.max((opportunite.nombre_places ?? 0) - (confirmedCount ?? 0), 0),
  }
}
