"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AppModal } from "@/components/ui/app-modal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Calendar,
  Ticket,
  MapPin,
  Tag,
  Users,
  Clock,
  Loader2,
  AlertCircle,
  Ban,
  MoreHorizontal
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import {
  OpportuniteWithAnnonceur,
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_MODEL_LABELS,
  OpportunityType,
  OpportunityModel
} from "@/app/types"

interface DisplayOpportunity {
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
}

interface PurchasedTicket {
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
  purchasedAt: string
  contactEmail: string
  status: "confirmee" | "remboursee"
}

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("opportunities")
  const [opportunities, setOpportunities] = useState<DisplayOpportunity[]>([])
  const [purchasedTickets, setPurchasedTickets] = useState<PurchasedTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticketsError, setTicketsError] = useState<string | null>(null)
  const [hasPreferences, setHasPreferences] = useState(true)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [blockingAnnonceurId, setBlockingAnnonceurId] = useState<string | null>(null)
  const [bookingOpportunityId, setBookingOpportunityId] = useState<string | null>(null)
  const [checkoutMessage, setCheckoutMessage] = useState<{ tone: "success" | "warning" | "info"; text: string } | null>(null)
  const [feedbackModal, setFeedbackModal] = useState<{
    open: boolean
    title: string
    description: string
    tone: "error" | "warning" | "info" | "success"
  }>({
    open: false,
    title: "",
    description: "",
    tone: "info",
  })

  const formatReceiptReference = (achatId: string) => `SCN-${achatId.replace(/-/g, "").slice(0, 12).toUpperCase()}`

  const handleImageError = (opportunityId: string) => {
    setImageErrors((prev) => new Set(prev).add(opportunityId))
  }

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/comedien/opportunites?page=1&limit=50")
      if (!response.ok) {
        throw new Error("Erreur lors de la recuperation des opportunites")
      }

      const data = await response.json()

      if (!data.preferences || data.preferences.length === 0) {
        setHasPreferences(false)
      } else {
        setHasPreferences(true)
      }

      const transformedOpportunities: DisplayOpportunity[] = data.opportunites.map((opp: OpportuniteWithAnnonceur) => {
        const dateObj = new Date(opp.date_evenement)

        return {
          id: opp.id,
          annonceurId: opp.annonceur_id,
          type: OPPORTUNITY_TYPE_LABELS[opp.type as OpportunityType],
          model: opp.modele as OpportunityModel,
          title: opp.titre,
          organizer: opp.annonceur?.nom_formation || "Non specifie",
          location: "France",
          date: dateObj.toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          }),
          dateDay: dateObj.getDate().toString().padStart(2, "0"),
          dateMonth: dateObj.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase(),
          time: dateObj.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit"
          }),
          price: opp.prix_base,
          reducedPrice: opp.prix_reduit,
          discount: opp.reduction_pourcentage,
          placesLeft: opp.places_restantes,
          image: opp.image_url,
          category: OPPORTUNITY_TYPE_LABELS[opp.type as OpportunityType],
          lienInfos: opp.lien_infos,
          contactEmail: opp.contact_email
        }
      })

      setOpportunities(transformedOpportunities)
    } catch (err) {
      console.error("Erreur opportunites:", err)
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPurchasedTickets = useCallback(async () => {
    try {
      setTicketsLoading(true)
      setTicketsError(null)

      const response = await fetch("/api/comedien/achats")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Erreur lors de la recuperation de vos places")
      }

      const transformedTickets: PurchasedTicket[] = (data.achats || []).map((achat: {
        id: string
        prix_paye: number
        created_at: string
        statut: "confirmee" | "remboursee"
        opportunite: {
          id: string
          titre: string
          image_url: string | null
          date_evenement: string
          contact_email: string
          annonceur?: { nom_formation?: string }
        } | null
      }) => {
        const eventDate = achat.opportunite?.date_evenement
          ? new Date(achat.opportunite.date_evenement)
          : new Date()
        const organizer = achat.opportunite?.annonceur?.nom_formation || "Organisme"
        const purchaseDate = new Date(achat.created_at)

        return {
          id: achat.id,
          opportunityId: achat.opportunite?.id || "",
          receiptReference: formatReceiptReference(achat.id),
          title: achat.opportunite?.titre || "Opportunite",
          organizer,
          image: achat.opportunite?.image_url || null,
          date: eventDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
          dateDay: eventDate.getDate().toString().padStart(2, "0"),
          dateMonth: eventDate.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "").toUpperCase(),
          time: eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          location: organizer,
          price: `${achat.prix_paye.toFixed(2)}€`,
          purchasedAt: `${purchaseDate.toLocaleDateString("fr-FR")} ${purchaseDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
          contactEmail: achat.opportunite?.contact_email || "",
          status: achat.statut
        }
      })

      setPurchasedTickets(transformedTickets)
    } catch (err) {
      console.error("Erreur places achetees:", err)
      setTicketsError(err instanceof Error ? err.message : "Impossible de charger vos places")
    } finally {
      setTicketsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchOpportunities()
  }, [fetchOpportunities])

  useEffect(() => {
    void fetchPurchasedTickets()
  }, [fetchPurchasedTickets])

  const confirmedOpportunityIds = new Set(
    purchasedTickets
      .filter((ticket) => ticket.status === "confirmee" && ticket.opportunityId)
      .map((ticket) => ticket.opportunityId)
  )

  useEffect(() => {
    const checkoutState = searchParams.get("checkout")
    const achatId = searchParams.get("achat")

    if (checkoutState === "cancel") {
      setCheckoutMessage({
        tone: "warning",
        text: "Paiement annulé. Votre réservation n'a pas été finalisée.",
      })
      return
    }

    if (checkoutState !== "success" || !achatId) {
      return
    }

    let cancelled = false

    const pollCheckoutStatus = async () => {
      setCheckoutMessage({
        tone: "info",
        text: "Paiement reçu. Validation de votre réservation en cours...",
      })

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const response = await fetch(`/api/comedien/achats?achatId=${achatId}`)
        const data = await response.json()

        if (!response.ok) {
          break
        }

        const achat = data.achat as { statut?: string } | null
        if (!achat?.statut) {
          await new Promise((resolve) => setTimeout(resolve, 1500))
          continue
        }

        if (cancelled) return

        if (achat.statut === "confirmee") {
          setCheckoutMessage({
            tone: "success",
            text: "Réservation confirmée. Votre place apparaît maintenant dans Mes Places.",
          })
          await fetchPurchasedTickets()
          await fetchOpportunities()
          return
        }

        if (achat.statut === "remboursee") {
          setCheckoutMessage({
            tone: "warning",
            text: "Le paiement a été remboursé automatiquement car la place n'était plus disponible.",
          })
          await fetchPurchasedTickets()
          await fetchOpportunities()
          return
        }

        if (achat.statut === "annulee") {
          setCheckoutMessage({
            tone: "warning",
            text: "La réservation a été annulée. Aucun billet n'a été confirmé.",
          })
          await fetchOpportunities()
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 1500))
      }

      if (!cancelled) {
        setCheckoutMessage({
          tone: "info",
          text: "Le paiement est en cours de traitement. Rechargez la page dans quelques secondes si votre billet n'apparaît pas encore.",
        })
        await fetchPurchasedTickets()
      }
    }

    void pollCheckoutStatus()

    return () => {
      cancelled = true
    }
  }, [fetchOpportunities, fetchPurchasedTickets, searchParams])

  const handleBlockAnnonceur = async (annonceurId: string) => {
    try {
      setBlockingAnnonceurId(annonceurId)
      const response = await fetch("/api/comedien/annonceurs-bloques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annonceur_id: annonceurId })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Erreur lors du blocage")
      }

      setOpportunities((prev) => prev.filter((opp) => opp.annonceurId !== annonceurId))
    } catch (err) {
      console.error("Erreur blocage organisme:", err)
      setFeedbackModal({
        open: true,
        title: "Blocage impossible",
        description: "Impossible de bloquer cet organisme pour le moment.",
        tone: "error",
      })
    } finally {
      setBlockingAnnonceurId(null)
    }
  }

  const handleCheckout = async (opportuniteId: string) => {
    try {
      setBookingOpportunityId(opportuniteId)
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportuniteId })
      })

      const data = await response.json()
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Impossible de lancer le paiement")
      }

      window.location.href = data.url as string
    } catch (err) {
      console.error("Erreur checkout:", err)
      setFeedbackModal({
        open: true,
        title: "Paiement indisponible",
        description: err instanceof Error ? err.message : "Impossible de lancer le paiement.",
        tone: "error",
      })
      setBookingOpportunityId(null)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-[#F5F0EB] to-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Espace Comedien
          </h1>
          <p className="text-gray-600 text-lg">
            Decouvrez et gerez vos opportunites
          </p>
        </div>

        {checkoutMessage && (
          <Card
            className={
              checkoutMessage.tone === "success"
                ? "mb-6 border-green-200 bg-green-50"
                : checkoutMessage.tone === "warning"
                  ? "mb-6 border-orange-200 bg-orange-50"
                  : "mb-6 border-blue-200 bg-blue-50"
            }
          >
            <CardContent className="p-4 text-sm">
              {checkoutMessage.text}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#E6DAD0]/50">
            <TabsTrigger value="opportunities" className="flex items-center gap-2 cursor-pointer">
              <Calendar className="w-4 h-4" />
              <span>Opportunites</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2 cursor-pointer">
              <Ticket className="w-4 h-4" />
              <span>Mes Places</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities" className="space-y-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-[#E63832] mb-4" />
                <p className="text-gray-600">Chargement des opportunites...</p>
              </div>
            )}

            {error && !loading && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-red-800">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Erreur de chargement</h3>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!loading && !error && !hasPreferences && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                    <p className="text-sm text-orange-800">
                      Configurez vos preferences pour personnaliser vos opportunites.
                    </p>
                  </div>
                  <Link href="/dashboard/preferences">
                    <Button size="sm" className="bg-[#E63832] hover:bg-[#E63832]/90 whitespace-nowrap">
                      Configurer
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {!loading && !error && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {opportunities.map((opportunity) => (
                    <Card
                      key={opportunity.id}
                      className="overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => { window.location.href = `/dashboard/opportunites/${opportunity.id}` }}
                    >
                      <div className="relative">
                        <div className="absolute top-4 left-4 z-10 bg-white rounded-lg p-2 shadow-md">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{opportunity.dateDay}</div>
                            <div className="text-xs font-medium text-[#E63832]">{opportunity.dateMonth}</div>
                          </div>
                        </div>

                        <div className="relative overflow-hidden bg-gray-200" style={{ aspectRatio: "16 / 9" }}>
                          {opportunity.image && !imageErrors.has(opportunity.id) ? (
                            <Image
                              src={opportunity.image}
                              alt={opportunity.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              onError={() => handleImageError(opportunity.id)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-[#E6DAD0] to-[#F5F0EB]">
                              <Calendar className="w-16 h-16 text-gray-400" />
                            </div>
                          )}

                          <div className="absolute bottom-4 left-4 z-10">
                            <span className="text-white text-sm font-medium bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                              {opportunity.placesLeft} place{opportunity.placesLeft > 1 ? "s" : ""} restante{opportunity.placesLeft > 1 ? "s" : ""}
                            </span>
                          </div>

                          {opportunity.discount > 0 && (
                            <div className="absolute top-4 right-4 z-10">
                              <span className="text-white text-xs font-bold bg-[#E63832] px-2 py-1 rounded">
                                -{Math.floor(opportunity.discount)}%
                              </span>
                            </div>
                          )}

                        </div>
                      </div>

                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-[#E6DAD0] text-gray-900 hover:bg-[#E6DAD0]">
                            {opportunity.category}
                          </Badge>
                          <Badge
                            className={
                              opportunity.model === "derniere_minute"
                                ? "bg-[#E63832] text-white hover:bg-[#E63832]"
                                : "bg-green-100 text-green-700 hover:bg-green-100"
                            }
                          >
                            {OPPORTUNITY_MODEL_LABELS[opportunity.model]}
                          </Badge>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <h3 className="min-h-14 flex-1 font-bold text-lg line-clamp-2">
                            {opportunity.title}
                          </h3>
                          <Popover>
                            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="shrink-0 text-gray-500 hover:text-gray-900"
                                aria-label={`Actions pour ${opportunity.organizer}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              className="w-56 p-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                                disabled={blockingAnnonceurId === opportunity.annonceurId}
                                onClick={() => void handleBlockAnnonceur(opportunity.annonceurId)}
                              >
                                {blockingAnnonceurId === opportunity.annonceurId ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Blocage...</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-4 w-4" />
                                    <span>Bloquer cet organisme</span>
                                  </>
                                )}
                              </button>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <span className="truncate">{opportunity.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 shrink-0" />
                            <span className="truncate">{opportunity.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span>{opportunity.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 shrink-0" />
                            <div className="flex flex-col">
                              {opportunity.discount > 0 ? (
                                <>
                                  <span className="font-semibold text-[#E63832]">{opportunity.reducedPrice}€</span>
                                  <span className="text-xs line-through text-gray-400">{opportunity.price}€</span>
                                </>
                              ) : (
                                <span className="font-semibold text-gray-900">{opportunity.price}€</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 shrink-0" />
                            <span className="text-xs truncate">Par {opportunity.organizer}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Link href={`/dashboard/opportunites/${opportunity.id}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" className="w-full">
                              Voir details
                            </Button>
                          </Link>
                          <Button
                            className="flex-1 bg-[#E63832] hover:bg-[#E63832]/90"
                            disabled={bookingOpportunityId === opportunity.id || confirmedOpportunityIds.has(opportunity.id)}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirmedOpportunityIds.has(opportunity.id)) return
                              void handleCheckout(opportunity.id)
                            }}
                          >
                            {confirmedOpportunityIds.has(opportunity.id)
                              ? "Deja reserve"
                              : bookingOpportunityId === opportunity.id
                                ? "Paiement..."
                                : "Reserver"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {opportunities.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg font-medium mb-2">
                      Aucune opportunite disponible pour le moment
                    </p>
                    <p className="text-gray-400 text-sm">
                      Les opportunites correspondant a vos preferences apparaitront ici une fois validees.
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                {ticketsLoading && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-[#E63832] mb-3" />
                    <p className="text-sm text-gray-600">Chargement de vos places...</p>
                  </div>
                )}

                {ticketsError && !ticketsLoading && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 text-sm">
                    {ticketsError}
                  </div>
                )}

                {!ticketsLoading && !ticketsError && (
                  <>
                    <div className="space-y-4">
                      {purchasedTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-linear-to-r from-[#E6DAD0]/10 to-white"
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="border-[#E63832]/30 text-[#E63832]">
                                    Ticket {ticket.receiptReference}
                                  </Badge>
                                  <Badge
                                    className={
                                      ticket.status === "confirmee"
                                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                                    }
                                  >
                                    {ticket.status === "confirmee" ? "Confirmee" : "Remboursee"}
                                  </Badge>
                                </div>
                                <h3 className="font-bold text-lg">{ticket.title}</h3>
                                <p className="text-sm text-gray-600">{ticket.organizer}</p>
                              </div>
                              <div className="text-2xl font-bold text-[#E63832]">{ticket.price}</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{ticket.date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{ticket.time}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{ticket.location}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                <span>Recu du {ticket.purchasedAt}</span>
                              </div>
                            </div>

                            {ticket.contactEmail && (
                              <div className="text-sm text-gray-600">
                                Contact:{" "}
                                <a href={`mailto:${ticket.contactEmail}`} className="text-[#E63832] hover:underline">
                                  {ticket.contactEmail}
                                </a>
                              </div>
                            )}

                            <div>
                              <a
                                href={`/api/comedien/achats/${ticket.id}/receipt`}
                                className="inline-flex items-center rounded-md bg-[#E63832] px-4 py-2 text-sm font-medium text-white hover:bg-[#E63832]/90"
                              >
                                Telecharger le recu PDF
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {purchasedTickets.length === 0 && (
                      <div className="text-center py-12">
                        <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg">
                          Vous n&apos;avez pas encore achete de places
                        </p>
                        <Button
                          className="mt-4 bg-[#E63832] hover:bg-[#E63832]/90"
                          onClick={() => setActiveTab("opportunities")}
                        >
                          Decouvrir les opportunites
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AppModal
          open={feedbackModal.open}
          onClose={() => setFeedbackModal((prev) => ({ ...prev, open: false }))}
          title={feedbackModal.title}
          description={feedbackModal.description}
          tone={feedbackModal.tone}
        />
      </div>
    </div>
  )
}
