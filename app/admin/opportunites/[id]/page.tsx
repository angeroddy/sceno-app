"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Opportunite } from "@/app/types"
import { AppModal } from "@/components/ui/app-modal"
import { OpportuniteDetailTabs } from "./_components/opportunite-detail-tabs"
import { AdminOpportuniteSidebar } from "./_components/admin-opportunite-sidebar"

export default function AdminOpportuniteDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [opportunite, setOpportunite] = useState<Opportunite | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mainImage, setMainImage] = useState<string | null>(null)
  const [opportuniteId, setOpportuniteId] = useState<string | null>(null)
  const [feedbackModal, setFeedbackModal] = useState<{
    open: boolean
    title: string
    description: string
    tone: "success" | "error"
  }>({
    open: false,
    title: "",
    description: "",
    tone: "success",
  })
  const [stats, setStats] = useState({
    vues: 0,
    reservations: 0,
    revenu: 0
  })

  // Extraire l'ID des params
  useEffect(() => {
    const extractId = async () => {
      if (params?.id) {
        const id = typeof params.id === 'string' ? params.id : params.id[0]
        setOpportuniteId(id)
      }
    }
    extractId()
  }, [params])

  // Récupérer les détails une fois l'ID extrait
  useEffect(() => {
    if (opportuniteId) {
      fetchOpportuniteDetails()
    }
  }, [opportuniteId])

  const fetchOpportuniteDetails = async () => {
    if (!opportuniteId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/opportunites/${opportuniteId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Opportunité introuvable')
      }

      const data = await response.json()
      setOpportunite(data.opportunite)
      setStats(data.stats || { vues: 0, reservations: 0, revenu: 0 })
      setMainImage(data.opportunite.image_url)
    } catch (err) {
      console.error('Erreur:', err)
      // Ne jamais afficher le message d'erreur brut, utiliser un message générique
      setError('Impossible de charger cette opportunité. Elle n\'existe peut-être pas ou a été supprimée')
    } finally {
      setLoading(false)
    }
  }

  const handleValidation = async (action: 'valider' | 'refuser') => {
    if (!opportuniteId) return

    try {
      setValidating(true)
      const response = await fetch('/api/admin/opportunites/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportuniteId,
          action,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la validation')
      }

      // Rafraîchir les données
      await fetchOpportuniteDetails()
      setFeedbackModal({
        open: true,
        title: `Opportunité ${action === 'valider' ? 'validée' : 'refusée'}`,
        description: `Le statut de “${opportunite?.titre || "cette opportunité"}” a bien été mis à jour.`,
        tone: "success",
      })
    } catch (err) {
      console.error(err)
      setFeedbackModal({
        open: true,
        title: "Validation impossible",
        description: err instanceof Error ? err.message : "Une erreur s'est produite lors de la validation.",
        tone: "error",
      })
    } finally {
      setValidating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#E63832]" />
          <p className="text-gray-600">Chargement des détails...</p>
        </div>
      </div>
    )
  }

  if (error || !opportunite) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold mb-1">Erreur</h3>
                <p className="text-sm">{error || 'Opportunité introuvable'}</p>
              </div>
            </div>
            <Button
              className="mt-4 bg-[#E63832] hover:bg-[#E63832]/90"
              onClick={() => router.push('/admin/opportunites')}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Retour aux opportunités
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const dateObj = new Date(opportunite.date_evenement)
  const dateFormatted = dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const timeFormatted = dateObj.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const placesOccupees = opportunite.nombre_places - opportunite.places_restantes
  const pourcentageRemplissage = (placesOccupees / opportunite.nombre_places) * 100

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'validee':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Validée</Badge>
      case 'en_attente':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">En attente</Badge>
      case 'refusee':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Refusée</Badge>
      case 'expiree':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Expirée</Badge>
      case 'complete':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Complète</Badge>
      default:
        return <Badge>{statut}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F0EB] to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Bouton retour */}
        <Button
          variant="ghost"
          className="mb-6 hover:bg-[#E6DAD0]"
          onClick={() => router.push('/admin/opportunites')}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Retour aux opportunités
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne gauche - Galerie et informations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Galerie d'images */}
            <Card className="overflow-hidden">
              <div className="relative">
                {/* Image principale */}
                <div
                  className="relative w-full bg-gray-200"
                  style={{ aspectRatio: "16 / 9", minHeight: "200px" }}
                >
                  {mainImage ? (
                    <Image
                      src={mainImage}
                      alt={opportunite.titre}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E6DAD0] to-[#F5F0EB]">
                      <Calendar className="w-24 h-24 text-gray-400" />
                    </div>
                  )}

                  {/* Badge réduction */}
                  {opportunite.reduction_pourcentage > 0 && (
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-[#E63832] text-white text-lg px-4 py-2 hover:bg-[#E63832]">
                        -{Math.floor(opportunite.reduction_pourcentage)}% de réduction
                      </Badge>
                    </div>
                  )}

                  {/* Badge statut */}
                  <div className="absolute top-4 right-4 z-10">
                    {getStatusBadge(opportunite.statut)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Onglets d'informations */}
            <Card>
              <CardContent className="p-6">
                <OpportuniteDetailTabs
                  opportunite={opportunite}
                  stats={stats}
                  placesOccupees={placesOccupees}
                  pourcentageRemplissage={pourcentageRemplissage}
                />
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Résumé et actions ADMIN */}
          <AdminOpportuniteSidebar
            opportunite={opportunite}
            statusBadge={getStatusBadge(opportunite.statut)}
            validating={validating}
            dateFormatted={dateFormatted}
            timeFormatted={timeFormatted}
            placesOccupees={placesOccupees}
            pourcentageRemplissage={pourcentageRemplissage}
            onValidate={handleValidation}
          />
        </div>
      </div>

      <AppModal
        open={feedbackModal.open}
        onClose={() => setFeedbackModal((prev) => ({ ...prev, open: false }))}
        title={feedbackModal.title}
        description={feedbackModal.description}
        tone={feedbackModal.tone}
      />
    </div>
  )
}
