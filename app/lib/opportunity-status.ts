import type { OpportunityStatus } from '@/app/types'

type OpportunityStatusInput = {
  statut: OpportunityStatus
  date_evenement: string
  places_restantes: number
}

export type ComedianOpportunityVisibleStatus =
  | 'validee'
  | 'expiree'
  | 'complete'
  | 'supprimee'

export function deriveOpportunityStatus(
  opportunity: OpportunityStatusInput,
  now = new Date()
): OpportunityStatus {
  if (opportunity.statut === 'supprimee') {
    return 'supprimee'
  }

  if (new Date(opportunity.date_evenement) <= now) {
    return 'expiree'
  }

  if ((opportunity.places_restantes ?? 0) <= 0) {
    return 'complete'
  }

  if (opportunity.statut === 'expiree' || opportunity.statut === 'complete') {
    return 'validee'
  }

  return opportunity.statut
}

export function isOpportunityVisibleToComedian(status: OpportunityStatus) {
  return status === 'validee' || status === 'expiree' || status === 'complete' || status === 'supprimee'
}

export function isOpportunityConsultableByComedian(status: OpportunityStatus) {
  return status !== 'supprimee'
}

export function isOpportunityReservableByComedian(status: OpportunityStatus) {
  return status === 'validee'
}
