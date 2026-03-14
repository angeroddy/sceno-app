type OpportunityViewClient = {
  from: (table: 'opportunite_vues') => {
    upsert: (
      values: {
        opportunite_id: string
        comedien_id: string
        last_viewed_at: string
        updated_at: string
      },
      options: { onConflict: string; ignoreDuplicates: boolean }
    ) => Promise<{ error: unknown }>
    select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => {
      eq: (column: string, value: string) => Promise<{ count: number | null; error: unknown }>
      in: (column: string, value: string[]) => Promise<{ count: number | null; error: unknown }>
    }
  }
}

export async function trackOpportunityView(
  supabase: OpportunityViewClient,
  opportunityId: string,
  comedienId: string
) {
  const timestamp = new Date().toISOString()

  await supabase
    .from('opportunite_vues')
    .upsert(
      {
        opportunite_id: opportunityId,
        comedien_id: comedienId,
        last_viewed_at: timestamp,
        updated_at: timestamp,
      },
      {
        onConflict: 'opportunite_id,comedien_id',
        ignoreDuplicates: false,
      }
    )
}

export async function countOpportunityViews(
  supabase: OpportunityViewClient,
  opportunityId: string
) {
  const { count, error } = await supabase
    .from('opportunite_vues')
    .select('id', { count: 'exact', head: true })
    .eq('opportunite_id', opportunityId)

  if (error) {
    return 0
  }

  return count || 0
}

export async function countOpportunityViewsForIds(
  supabase: OpportunityViewClient,
  opportunityIds: string[]
) {
  if (opportunityIds.length === 0) {
    return 0
  }

  const { count, error } = await supabase
    .from('opportunite_vues')
    .select('id', { count: 'exact', head: true })
    .in('opportunite_id', opportunityIds)

  if (error) {
    return 0
  }

  return count || 0
}
