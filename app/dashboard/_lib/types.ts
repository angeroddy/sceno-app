import type { OpportunityModel, OpportunityStatus } from "@/app/types"

export interface DisplayOpportunity {
  id: string
  annonceurId: string
  type: string
  model: OpportunityModel
  title: string
  organizer: string
  location: string
  date: string
  dateDay: string
  dateMonth: string
  time: string
  price: number
  reducedPrice: number
  discount: number
  placesLeft: number
  image: string | null
  category: string
  lienInfos: string
  contactEmail: string
  status: OpportunityStatus
}

export interface PurchasedTicket {
  id: string
  opportunityId: string
  receiptReference: string
  title: string
  organizer: string
  image: string | null
  date: string
  dateDay: string
  dateMonth: string
  time: string
  location: string
  price: string
  contactEmail: string
  contactPhone: string
  status: "confirmee" | "remboursee"
}
