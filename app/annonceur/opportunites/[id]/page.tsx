"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MapPin,
  Calendar,
  Users,
  Clock,
  Phone,
  Mail,
  ExternalLink,
  ChevronLeft,
  Star,
  Info,
  Contact,
  Loader2,
  AlertCircle,
  Tag,
  Building2,
  Edit,
  BarChart3,
  Eye,
  TrendingUp,
} from "lucide-react"
import { Opportunite, OPPORTUNITY_TYPE_LABELS, OpportunityType } from "@/app/types"
import { SafeRichText } from "@/components/safe-rich-text"

export default function AnnonceurOpportuniteDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [opportunite, setOpportunite] = useState<Opportunite | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mainImage, setMainImage] = useState<string | null>(null)
  const [opportuniteId, setOpportuniteId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    vues: 0,
    reservations: 0,
    revenu: 0,
  })

  useEffect(() => {
    const extractId = async () => {
      if (params?.id) {
        const id = typeof params.id === "string" ? params.id : params.id[0]
        setOpportuniteId(id)
      }
    }

    extractId()
  }, [params])

  const fetchOpportuniteDetails = useCallback(async () => {
    if (!opportuniteId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/annonceur/opportunites/${opportuniteId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Opportunité introuvable")
      }

      const data = await response.json()
      setOpportunite(data.opportunite)
      setStats(data.stats || { vues: 0, reservations: 0, revenu: 0 })
      setMainImage(data.opportunite.image_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }, [opportuniteId])

  useEffect(() => {
    if (opportuniteId) {
      void fetchOpportuniteDetails()
    }
  }, [opportuniteId, fetchOpportuniteDetails])

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
                <p className="text-sm">{error || "Opportunité introuvable"}</p>
              </div>
            </div>
            <Button
              className="mt-4 bg-[#E63832] hover:bg-[#E63832]/90"
              onClick={() => router.push("/annonceur/opportunites")}
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
  const dateFormatted = dateObj.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const timeFormatted = dateObj.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const placesOccupees = opportunite.nombre_places - opportunite.places_restantes
  const pourcentageRemplissage = opportunite.nombre_places > 0
    ? (placesOccupees / opportunite.nombre_places) * 100
    : 0

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "validee":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Validée</Badge>
      case "en_attente":
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">En attente</Badge>
      case "refusee":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Refusée</Badge>
      case "expiree":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Expirée</Badge>
      case "complete":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Complète</Badge>
      default:
        return <Badge>{statut}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-[#F5F0EB] to-white">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6 hover:bg-[#E6DAD0]"
          onClick={() => router.push("/annonceur/opportunites")}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Retour aux opportunités
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <div className="relative">
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
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-[#E6DAD0] to-[#F5F0EB]">
                      <Calendar className="w-24 h-24 text-gray-400" />
                    </div>
                  )}

                  {opportunite.reduction_pourcentage > 0 && (
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-[#E63832] text-white text-lg px-4 py-2 hover:bg-[#E63832]">
                        -{Math.floor(opportunite.reduction_pourcentage)}% de réduction
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="informations" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#E6DAD0]/50">
                    <TabsTrigger value="informations" className="flex items-center gap-2 cursor-pointer">
                      <Info className="w-4 h-4" />
                      <span className="hidden sm:inline">Informations</span>
                    </TabsTrigger>
                    <TabsTrigger value="contact" className="flex items-center gap-2 cursor-pointer">
                      <Contact className="w-4 h-4" />
                      <span className="hidden sm:inline">Contact</span>
                    </TabsTrigger>
                    <TabsTrigger value="statistiques" className="flex items-center gap-2 cursor-pointer">
                      <BarChart3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Statistiques</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="informations" className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        Informations importantes
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                          <div className="bg-white p-2 rounded-lg">
                            <Tag className="w-5 h-5 text-[#E63832]" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Type</p>
                            <p className="font-semibold text-gray-900">
                              {OPPORTUNITY_TYPE_LABELS[opportunite.type as OpportunityType]}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                          <div className="bg-white p-2 rounded-lg">
                            <Star className="w-5 h-5 text-[#E63832]" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Modèle</p>
                            <p className="font-semibold text-gray-900">
                              {opportunite.modele === "derniere_minute" ? "Dernière minute" : "Pré-vente"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                          <div className="bg-white p-2 rounded-lg">
                            <Users className="w-5 h-5 text-[#E63832]" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Places</p>
                            <p className="font-semibold text-gray-900">
                              {opportunite.nombre_places} places au total
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                          <div className="bg-white p-2 rounded-lg">
                            <Building2 className="w-5 h-5 text-[#E63832]" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Statut</p>
                            <div className="pt-1">{getStatusBadge(opportunite.statut)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        À propos de cette opportunité
                      </h3>
                      <SafeRichText html={opportunite.resume} className="prose max-w-none text-gray-700" />
                    </div>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        Contact
                      </h3>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                          <Mail className="w-5 h-5 text-[#E63832]" />
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Email</p>
                            <a
                              href={`mailto:${opportunite.contact_email}`}
                              className="font-medium text-gray-900 hover:text-[#E63832] transition-colors"
                            >
                              {opportunite.contact_email}
                            </a>
                          </div>
                        </div>

                        {opportunite.contact_telephone && (
                          <div className="flex items-center gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                            <Phone className="w-5 h-5 text-[#E63832]" />
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                              <a
                                href={`tel:${opportunite.contact_telephone}`}
                                className="font-medium text-gray-900 hover:text-[#E63832] transition-colors"
                              >
                                {opportunite.contact_telephone}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="statistiques" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <Eye className="w-5 h-5 text-blue-600" />
                          <p className="text-sm font-medium text-blue-900">Vues</p>
                        </div>
                        <p className="text-3xl font-bold text-blue-600">{stats.vues}</p>
                        <p className="text-xs text-blue-700 mt-1">Nombre de consultations</p>
                      </div>

                      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <Users className="w-5 h-5 text-green-600" />
                          <p className="text-sm font-medium text-green-900">Réservations</p>
                        </div>
                        <p className="text-3xl font-bold text-green-600">{stats.reservations}</p>
                        <p className="text-xs text-green-700 mt-1">Places réservées</p>
                      </div>

                      <div className="p-6 bg-[#FEE] border border-red-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <TrendingUp className="w-5 h-5 text-[#E63832]" />
                          <p className="text-sm font-medium text-red-900">Revenu</p>
                        </div>
                        <p className="text-3xl font-bold text-[#E63832]">{stats.revenu.toFixed(2)}€</p>
                        <p className="text-xs text-red-700 mt-1">Revenu généré</p>
                      </div>
                    </div>

                    <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                      <p>
                        <strong>Taux de conversion:</strong>{" "}
                        {stats.vues > 0 ? ((stats.reservations / stats.vues) * 100).toFixed(1) : 0}%
                      </p>
                      <p className="mt-1">
                        <strong>Prix moyen par place:</strong>{" "}
                        {stats.reservations > 0 ? (stats.revenu / stats.reservations).toFixed(2) : opportunite.prix_reduit}€
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-8 shadow-lg">
              <CardContent className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-[#E6DAD0] text-gray-900 hover:bg-[#E6DAD0]">
                      {OPPORTUNITY_TYPE_LABELS[opportunite.type as OpportunityType]}
                    </Badge>
                    {opportunite.modele === "derniere_minute" && (
                      <Badge className="bg-[#E63832] text-white hover:bg-[#E63832]">
                        Dernière minute
                      </Badge>
                    )}
                    {opportunite.modele === "pre_vente" && (
                      <Badge className="bg-[#E63832] text-white hover:bg-[#E63832]">
                        Pré-vente
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {opportunite.titre}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span>Créée le {new Date(opportunite.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>

                <div className="border-t border-b border-gray-200 py-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-[#E63832]">
                      {opportunite.prix_reduit}€
                    </span>
                    {opportunite.reduction_pourcentage > 0 && (
                      <span className="text-lg text-gray-400 line-through">
                        {opportunite.prix_base}€
                      </span>
                    )}
                  </div>
                  {opportunite.reduction_pourcentage > 0 && (
                    <p className="text-sm text-gray-600">
                      Réduction de {Math.floor(opportunite.reduction_pourcentage)}%
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Prix par place</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                    <span className="text-gray-700">France</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                    <span className="text-gray-700">{dateFormatted}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                    <span className="text-gray-700">À {timeFormatted}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-5 h-5 text-gray-400 shrink-0" />
                    <span className="text-gray-700">
                      {opportunite.places_restantes} place(s) restante(s)
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <Button
                    size="lg"
                    className="w-full bg-[#E63832] hover:bg-[#E63832]/90 text-white font-semibold text-lg py-6"
                    onClick={() => router.push(`/annonceur/opportunites/${opportunite.id}/modifier`)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier l&apos;opportunité
                  </Button>

                  {opportunite.lien_infos && (
                    <Button size="lg" variant="outline" className="w-full" asChild>
                      <a href={opportunite.lien_infos} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Voir le site
                      </a>
                    </Button>
                  )}
                </div>

                {opportunite.statut === "en_attente" && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-900">
                    <p className="font-semibold mb-1">En attente de validation</p>
                    <p className="text-orange-700">
                      Votre opportunité est en cours de vérification par notre équipe.
                    </p>
                  </div>
                )}

                {opportunite.statut === "validee" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900">
                    <p className="font-semibold mb-1">Opportunité validée</p>
                    <p className="text-green-700">
                      Votre opportunité est visible par tous les comédiens.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                  <div className="text-center p-3 bg-[#F5F0EB] rounded-lg">
                    <p className="text-2xl font-bold text-[#E63832]">{placesOccupees}</p>
                    <p className="text-xs text-gray-600">Réservées</p>
                  </div>
                  <div className="text-center p-3 bg-[#F5F0EB] rounded-lg">
                    <p className="text-2xl font-bold text-[#E63832]">{Math.round(pourcentageRemplissage)}%</p>
                    <p className="text-xs text-gray-600">Remplissage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
