"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AppModal } from "@/components/ui/app-modal"
import {
  Calendar,
  Ticket,
  Loader2,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { deriveOpportunityStatus } from "@/lib/opportunity-status"
import {
  OpportuniteWithAnnonceur,
  OPPORTUNITY_TYPE_LABELS,
  OpportunityType,
  OpportunityModel,
} from "@/types"
import type { DisplayOpportunity, PurchasedTicket } from "./_lib/types"
import { OpportunityCard } from "./_components/opportunity-card"
import { TicketRow } from "./_components/ticket-row"

const TICKET_TIME_ZONE = "Europe/Paris"

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

  useEffect(() => {
    const resetCheckoutLoading = () => {
      setBookingOpportunityId(null)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetCheckoutLoading()
      }
    }

    window.addEventListener("pageshow", resetCheckoutLoading)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("pageshow", resetCheckoutLoading)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

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
        throw new Error("Erreur lors de la récupération des opportunités.")
      }

      const data = await response.json()

      if (!data.preferences || data.preferences.length === 0) {
        setHasPreferences(false)
      } else {
        setHasPreferences(true)
      }

      const transformedOpportunities: DisplayOpportunity[] = data.opportunites.map((opp: OpportuniteWithAnnonceur) => {
        const dateObj = new Date(opp.date_evenement)
        const status = deriveOpportunityStatus({
          statut: opp.statut,
          date_evenement: opp.date_evenement,
          places_restantes: opp.places_restantes,
        })

        return {
          id: opp.id,
          annonceurId: opp.annonceur_id,
          type: OPPORTUNITY_TYPE_LABELS[opp.type as OpportunityType],
          model: opp.modele as OpportunityModel,
          title: opp.titre,
          organizer: opp.annonceur?.nom_formation || "Non spécifié",
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
          contactEmail: opp.contact_email,
          status,
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
        throw new Error(data?.error || "Erreur lors de la récupération de vos places.")
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
          contact_telephone: string | null
          annonceur?: { nom_formation?: string }
        } | null
      }) => {
        const eventDate = achat.opportunite?.date_evenement
          ? new Date(achat.opportunite.date_evenement)
          : new Date()
        const organizer = achat.opportunite?.annonceur?.nom_formation || "Organisme"

        return {
          id: achat.id,
          opportunityId: achat.opportunite?.id || "",
          receiptReference: formatReceiptReference(achat.id),
          title: achat.opportunite?.titre || "Opportunité",
          organizer,
          image: achat.opportunite?.image_url || null,
          date: eventDate.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: TICKET_TIME_ZONE,
          }),
          dateDay: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: TICKET_TIME_ZONE }).format(eventDate),
          dateMonth: new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: TICKET_TIME_ZONE })
            .format(eventDate)
            .replace(".", "")
            .toUpperCase(),
          time: eventDate.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: TICKET_TIME_ZONE,
          }),
          location: organizer,
          price: `${achat.prix_paye.toFixed(2)}€`,
          contactEmail: achat.opportunite?.contact_email || "",
          contactPhone: achat.opportunite?.contact_telephone || "",
          status: achat.statut
        }
      })

      setPurchasedTickets(transformedTickets)
    } catch (err) {
      console.error("Erreur places achetées:", err)
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
            Espace Comédien
          </h1>
          <p className="text-gray-600 text-lg">
            Découvrez et gérez vos opportunités.
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
              {checkoutMessage.tone === "success" ? (
                <>
                  Réservation confirmée. Votre place apparaît maintenant dans{" "}
                  <button
                    type="button"
                    className="font-medium underline underline-offset-2 hover:text-green-800"
                    onClick={() => setActiveTab("tickets")}
                  >
                    Mes Places
                  </button>
                  .
                </>
              ) : (
                checkoutMessage.text
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#E6DAD0]/50">
            <TabsTrigger value="opportunities" className="flex items-center gap-2 cursor-pointer">
              <Calendar className="w-4 h-4" />
              <span>Opportunités</span>
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
                <p className="text-gray-600">Chargement des opportunités...</p>
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
                      Configurez vos préférences pour personnaliser vos opportunités.
                    </p>
                  </div>
                  <Link href="/comedien/preferences">
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
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      imageHasError={imageErrors.has(opportunity.id)}
                      onImageError={handleImageError}
                      isConfirmed={confirmedOpportunityIds.has(opportunity.id)}
                      isBooking={bookingOpportunityId === opportunity.id}
                      isBlocking={blockingAnnonceurId === opportunity.annonceurId}
                      onBlock={handleBlockAnnonceur}
                      onCheckout={handleCheckout}
                    />
                  ))}
                </div>

                {opportunities.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg font-medium mb-2">
                      Aucune opportunité disponible pour le moment !
                    </p>
                    <p className="text-gray-400 text-sm">
                      Les opportunités correspondant à vos préférences apparaîtront ici.
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
                        <TicketRow key={ticket.id} ticket={ticket} />
                      ))}
                    </div>

                    {purchasedTickets.length === 0 && (
                      <div className="text-center py-12">
                        <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg">
                          Vous n&apos;avez pas encore acheté de places
                        </p>
                        <Button
                          className="mt-4 bg-[#E63832] hover:bg-[#E63832]/90"
                          onClick={() => setActiveTab("opportunities")}
                        >
                          Découvrir les opportunités
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
