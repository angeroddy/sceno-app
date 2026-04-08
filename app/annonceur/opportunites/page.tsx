"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AppModal } from "@/components/ui/app-modal"
import {
  Calendar,
  Users,
  Euro,
  Search,
  PlusCircle,
  Eye,
  Trash2,
  Pencil
} from "lucide-react"
import type { Opportunite } from "@/app/types"
import { OPPORTUNITY_TYPE_LABELS } from "@/app/types"
import { buildRenderableImageSrc, IMAGE_RETRY_LIMIT } from "@/app/lib/renderable-image"

export default function MesOpportunitesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [opportunites, setOpportunites] = useState<Opportunite[]>([])
  const [filteredOpportunites, setFilteredOpportunites] = useState<Opportunite[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("statut") || "all")
  const [opportuniteToDelete, setOpportuniteToDelete] = useState<Opportunite | null>(null)
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
  const [imageRetryKeys, setImageRetryKeys] = useState<Record<string, number>>({})
  const [imageRetryCounts, setImageRetryCounts] = useState<Record<string, number>>({})
  const [imageLoadFailed, setImageLoadFailed] = useState<Record<string, boolean>>({})
  const imageRetryTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    fetchOpportunites()
  }, [])

  useEffect(() => {
    const statut = searchParams.get("statut") || "all"
    setStatusFilter(statut)
  }, [searchParams])

  useEffect(() => {
    const retryTimeouts = imageRetryTimeoutsRef.current

    return () => {
      Object.values(retryTimeouts).forEach((timeout) => clearTimeout(timeout))
    }
  }, [])

  const filterOpportunites = useCallback(() => {
    let filtered = [...opportunites]

    if (searchTerm) {
      filtered = filtered.filter(opp =>
        opp.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.resume.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(opp => opp.statut === statusFilter)
    }

    setFilteredOpportunites(filtered)
  }, [opportunites, searchTerm, statusFilter])

  useEffect(() => {
    filterOpportunites()
  }, [filterOpportunites])

  const fetchOpportunites = async () => {
    try {
      const response = await fetch('/api/annonceur/opportunites?limit=100')
      if (!response.ok) {
        throw new Error('Impossible de charger les opportunités')
      }

      const data = await response.json()
      const opportunitesData = (data.opportunites || []) as Opportunite[]

      if (opportunitesData) {
        setOpportunites(opportunitesData)
        setFilteredOpportunites(opportunitesData)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des opportunités:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/annonceur/opportunites/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Suppression impossible")
      }

      setOpportunites(prev => prev.map((opp) => (
        opp.id === id ? { ...opp, statut: 'supprimee' } : opp
      )))
      setOpportuniteToDelete(null)
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      setFeedbackModal({
        open: true,
        title: "Suppression impossible",
        description: "Une erreur s'est produite lors de la suppression de cette opportunité.",
        tone: "error",
      })
    }
  }

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
      case 'supprimee':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Supprimée</Badge>
      default:
        return <Badge>{statut}</Badge>
    }
  }

  const handleImageLoad = (id: string) => {
    if (imageRetryTimeoutsRef.current[id]) {
      clearTimeout(imageRetryTimeoutsRef.current[id])
      delete imageRetryTimeoutsRef.current[id]
    }

    setImageLoadFailed((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
    setImageRetryCounts((prev) => ({ ...prev, [id]: 0 }))
  }

  const handleImageError = (id: string, source: string) => {
    if (!source || source.startsWith("blob:") || source.startsWith("data:")) {
      setImageLoadFailed((prev) => ({ ...prev, [id]: true }))
      return
    }

    const currentRetryCount = imageRetryCounts[id] ?? 0
    if (currentRetryCount >= IMAGE_RETRY_LIMIT) {
      setImageLoadFailed((prev) => ({ ...prev, [id]: true }))
      return
    }

    if (imageRetryTimeoutsRef.current[id]) {
      clearTimeout(imageRetryTimeoutsRef.current[id])
    }

    setImageRetryCounts((prev) => ({ ...prev, [id]: currentRetryCount + 1 }))
    imageRetryTimeoutsRef.current[id] = setTimeout(() => {
      setImageRetryKeys((prev) => ({ ...prev, [id]: Date.now() }))
    }, 350)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E63832]"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Mes opportunités
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Gérez toutes vos opportunités publiées
            </p>
          </div>
          <Button
            className="bg-[#E63832] hover:bg-[#E63832]/90 w-full sm:w-auto shrink-0"
            onClick={() => router.push('/annonceur/publier')}
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Nouvelle opportunité</span>
            <span className="sm:hidden">Nouvelle</span>
          </Button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher une opportunité..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63832]"
              >
                <option value="all">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="validee">Validée</option>
                <option value="refusee">Refusée</option>
                <option value="expiree">Expirée</option>
                <option value="complete">Complète</option>
                <option value="supprimee">Supprimée</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des opportunités */}
      {filteredOpportunites.length > 0 ? (
        <div className="space-y-4">
          {filteredOpportunites.map((opportunite) => {
            const renderableImageSrc = opportunite.image_url
              ? buildRenderableImageSrc(opportunite.image_url, imageRetryKeys[opportunite.id] ?? 0)
              : ""
            const canRenderImage = Boolean(opportunite.image_url) && !imageLoadFailed[opportunite.id]

            return (
              <Card key={opportunite.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    {/* Image */}
                    <div className="relative w-full sm:w-40 md:w-48 aspect-video rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {canRenderImage ? (
                        <Image
                          src={renderableImageSrc}
                          alt={opportunite.titre}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 192px"
                          onLoad={() => handleImageLoad(opportunite.id)}
                          onError={() => handleImageError(opportunite.id, opportunite.image_url || "")}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#E6DAD0] to-[#F5F0EB] px-3 text-center text-sm font-medium text-gray-500">
                          {opportunite.titre}
                        </div>
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-bold text-lg sm:text-xl break-words">{opportunite.titre}</h3>
                            {getStatusBadge(opportunite.statut)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span className="truncate">{new Date(opportunite.date_evenement).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4 shrink-0" />
                          <span>{opportunite.places_restantes}/{opportunite.nombre_places} places</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Euro className="w-4 h-4 shrink-0" />
                          <span className="truncate">{opportunite.prix_reduit}€ (-{Math.floor(opportunite.reduction_pourcentage)}%)</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <Badge variant="outline">{OPPORTUNITY_TYPE_LABELS[opportunite.type]}</Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-1 sm:flex sm:flex-row sm:flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto justify-start sm:justify-center"
                          onClick={() => router.push(`/annonceur/opportunites/${opportunite.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto justify-start sm:justify-center"
                          onClick={() => router.push(`/annonceur/opportunites/${opportunite.id}/modifier`)}
                          disabled={opportunite.statut === 'supprimee'}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                        {opportunite.statut !== 'supprimee' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto justify-start sm:justify-center text-red-600 hover:text-red-700"
                            onClick={() => setOpportuniteToDelete(opportunite)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Aucune opportunité ne correspond à vos critères"
                  : "Vous n'avez pas encore publié d'opportunités"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button
                  className="bg-[#E63832] hover:bg-[#E63832]/90"
                  onClick={() => router.push('/annonceur/publier')}
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Créer votre première opportunité
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AppModal
        open={Boolean(opportuniteToDelete)}
        onClose={() => setOpportuniteToDelete(null)}
        title="Supprimer cette opportunité ?"
        description={opportuniteToDelete ? `Cette action est définitive pour “${opportuniteToDelete.titre}”.` : undefined}
        tone="warning"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpportuniteToDelete(null)}>
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => opportuniteToDelete && handleDelete(opportuniteToDelete.id)}
            >
              Supprimer
            </Button>
          </>
        }
      />

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
