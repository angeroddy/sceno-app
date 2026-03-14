import { reconcileOpportunityPlaces } from '@/app/lib/opportunity-availability'
import type { Annonceur, Opportunite } from '@/app/types'

export type PublicOpportunityDetails = Opportunite & {
  annonceur: Pick<Annonceur, 'nom_formation' | 'email'> | null
}

type PublicOpportunityClient = {
  from: (table: 'opportunites') => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        in: (column: string, values: string[]) => {
          maybeSingle: () => Promise<{ data: PublicOpportunityDetails | null; error: unknown }>
        }
      }
    }
  }
}

export async function getPublicOpportunityDetails(
  supabase: PublicOpportunityClient,
  opportunityId: string
) {
  const { data, error } = await supabase
    .from('opportunites')
    .select('*, annonceur:annonceurs(nom_formation, email)')
    .eq('id', opportunityId)
    .in('statut', ['validee', 'complete'])
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const reconciledOpportunity = await reconcileOpportunityPlaces(supabase as never, opportunityId)
  if (reconciledOpportunity) {
    data.places_restantes = reconciledOpportunity.places_restantes
  }

  return data
}
