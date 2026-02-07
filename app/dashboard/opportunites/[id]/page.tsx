"use client"

import { useEffect, useState } from "react"
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
  Euro,
  Clock,
  Phone,
  Mail,
  ExternalLink,
  ChevronLeft,
  Star,
  Heart,
  Info,
  Contact,
  Loader2,
  AlertCircle,
  Tag,
  Building2
} from "lucide-react"
import { OpportuniteWithAnnonceur, OPPORTUNITY_MODEL_LABELS, OPPORTUNITY_TYPE_LABELS, OpportunityType } from "@/app/types"

export default function OpportuniteDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [opportunite, setOpportunite] = useState<OpportuniteWithAnnonceur | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mainImage, setMainImage] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [opportuniteId, setOpportuniteId] = useState<string | null>(null)
  const [blockError, setBlockError] = useState<string | null>(null)
  const [blockSuccess, setBlockSuccess] = useState<string | null>(null)

  // Extraire l'ID des params
  useEffect(() => {
    const extractId = async () => {
      if (params?.id) {
        const id = typeof params.id === 'string' ? params.id : params.id[0]
        console.log('ID de l\'opportunité:', id)
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
      console.log('Appel API pour opportunité:', opportuniteId)
      const response = await fetch(`/api/comedien/opportunites/${opportuniteId}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Erreur API:', errorData)
        throw new Error(errorData.error || 'Opportunité introuvable')
      }

      const data = await response.json()
      console.log('Données reçues:', data)
      setOpportunite(data)
      setMainImage(data.image_url)
    } catch (err) {
      console.error('Erreur:', err)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleBlockAnnonceur = async () => {
    if (!opportunite?.annonceur_id) return
    setBlockError(null)
    setBlockSuccess(null)
    try {
      const response = await fetch("/api/comedien/annonceurs-bloques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annonceur_id: opportunite.annonceur_id }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erreur lors du blocage")
      }
      setBlockSuccess("Organisme bloqué. Vous ne recevrez plus ses opportunités.")
    } catch (err) {
      console.error("Erreur blocage:", err)
      setBlockError(err instanceof Error ? err.message : "Erreur lors du blocage")
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
              onClick={() => router.push('/dashboard')}
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F0EB] to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Bouton retour */}
        <Button
          variant="ghost"
          className="mb-6 hover:bg-[#E6DAD0]"
          onClick={() => router.push('/dashboard')}
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
                <div className="relative h-[400px] md:h-[500px] bg-gray-200">
                  {mainImage ? (
                    <Image
                      src={mainImage}
                      alt={opportunite.titre}
                      fill
                      className="object-cover cursor-pointer"
                      unoptimized
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

                  {/* Bouton favori */}
                  <button
                    className="absolute top-4 right-4 z-10 bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
                    onClick={() => setIsFavorite(!isFavorite)}
                  >
                    <Heart
                      className={`w-6 h-6 ${isFavorite ? 'fill-[#E63832] text-[#E63832]' : 'text-gray-600'}`}
                    />
                  </button>
                </div>
              </div>
            </Card>

            {/* Onglets d'informations */}
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="informations" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#E6DAD0]/50">
                    <TabsTrigger value="informations" className="flex items-center gap-2 cursor-pointer">
                      <Info className="w-4 h-4" />
                      <span className="hidden sm:inline">Informations</span>
                    </TabsTrigger>
                    <TabsTrigger value="contact" className="flex items-center gap-2 cursor-pointer">
                      <Contact className="w-4 h-4" />
                      <span className="hidden sm:inline">Contact</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB: Informations */}
                  <TabsContent value="informations" className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold mb-4 text-gray-900">
                        Informations importantes
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Type d'opportunité */}
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

                        {/* Modèle */}
                        <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                          <div className="bg-white p-2 rounded-lg">
                            <Star className="w-5 h-5 text-[#E63832]" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Modèle</p>
                            <p className="font-semibold text-gray-900">
                              {opportunite.modele === 'derniere_minute' ? 'Dernière minute' : 'Pré-vente'}
                            </p>
                          </div>
                        </div>

                        {/* Capacité */}
                        <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                          <div className="bg-white p-2 rounded-lg">
                            <Users className="w-5 h-5 text-[#E63832]" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Places</p>
                            <p className="font-semibold text-gray-900">
                              Nombre de places : {opportunite.nombre_places}
                            </p>
                          </div>
                        </div>

                        {/* Organisateur */}
                        <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                          <div className="bg-white p-2 rounded-lg">
                            <Building2 className="w-5 h-5 text-[#E63832]" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Organisateur</p>
                            <p className="font-semibold text-gray-900">
                              {opportunite.annonceur?.nom_formation || 'Non spécifié'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Places restantes — clarifier restantes vs total */}
                    <div className="p-4 bg-[#F5F0EB] rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Places disponibles
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-[#E63832]">
                          {opportunite.places_restantes}
                        </p>
                        <p className="text-sm text-gray-500">
                          sur {opportunite.nombre_places} au total
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {opportunite.nombre_places - opportunite.places_restantes} réservées
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-[#E63832] h-2 rounded-full transition-all"
                          style={{ width: `${pourcentageRemplissage}%` }}
                        />
                      </div>
                    </div>

                    {/* Description inlinée — plus de tab séparée */}
                    <div className="pt-2">
                      <h3 className="text-xl font-bold mb-3 text-gray-900">
                        À propos de cette opportunité
                      </h3>
                      <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: opportunite.resume }} />

                      {opportunite.lien_infos && (
                        <div className="mt-4">
                          <a
                            href={opportunite.lien_infos}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[#E63832] hover:underline font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            En savoir plus
                          </a>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* TAB: Contact */}
                  <TabsContent value="contact" className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold mb-4 text-gray-900">
                        Informations de contact
                      </h3>

                      <div className="space-y-4">
                        {/* Email */}
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

                        {/* Téléphone */}
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

                        {/* Organisateur */}
                        <div className="flex items-center gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                          <Building2 className="w-5 h-5 text-[#E63832]" />
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Structure</p>
                            <p className="font-medium text-gray-900">
                              {opportunite.annonceur?.nom_formation || 'Non spécifié'}
                            </p>
                            {opportunite.annonceur?.email && (
                              <a
                                href={`mailto:${opportunite.annonceur.email}`}
                                className="text-sm text-[#E63832] hover:underline"
                              >
                                {opportunite.annonceur.email}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Résumé et réservation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 shadow-lg">
              <CardContent className="p-6 space-y-6">
                {/* Titre */}
                <div>
                  <Badge className="bg-[#E6DAD0] text-gray-900 hover:bg-[#E6DAD0] mb-3">
                    {OPPORTUNITY_TYPE_LABELS[opportunite.type as OpportunityType]}
                  </Badge>
                  <Badge
                    className={
                      opportunite.modele === "derniere_minute"
                        ? "bg-[#E63832] text-white hover:bg-[#E63832]"
                        : "bg-green-100 text-green-700 hover:bg-green-100"
                    }
                  >
                    {OPPORTUNITY_MODEL_LABELS[opportunite.modele]}
                  </Badge>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {opportunite.titre}
                  </h1>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm">{opportunite.annonceur?.nom_formation || 'Non spécifié'}</span>
                  </div>
                </div>

                {/* Prix */}
                <div className="border-t border-b border-gray-200 py-4">
                  {opportunite.reduction_pourcentage > 0 ? (
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-bold text-[#E63832]">
                          {opportunite.prix_reduit}€
                        </span>
                        <span className="text-lg text-gray-400 line-through">
                          {opportunite.prix_base}€
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Économisez {(opportunite.prix_base - opportunite.prix_reduit).toFixed(2)}€ !
                      </p>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-gray-900">
                      {opportunite.prix_base}€
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Location à partir de
                  </p>
                </div>

                {/* Informations clés */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">France</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{dateFormatted}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">À {timeFormatted}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">
                      {opportunite.places_restantes} place(s) restante(s)
                    </span>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="space-y-3 pt-4">
                  <Button
                    size="lg"
                    className="w-full bg-[#E63832] hover:bg-[#E63832]/90 text-white font-semibold text-lg py-6"
                    disabled={opportunite.places_restantes === 0}
                  >
                    {opportunite.places_restantes > 0 ? 'Réserver ma place' : 'Complet'}
                  </Button>

                  {opportunite.lien_infos && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <a href={opportunite.lien_infos} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Voir le site
                      </a>
                    </Button>
                  )}

                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-[#E63832] text-[#E63832] hover:bg-[#E63832]/10"
                    onClick={handleBlockAnnonceur}
                  >
                    Ne plus recevoir d'infos de cet organisme
                  </Button>
                </div>

                {/* Informations complémentaires */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">Réponse rapide garantie</p>
                      <p className="text-blue-700">
                        L&apos;organisateur s&apos;engage à vous répondre dans les 24 heures
                      </p>
                    </div>
                  </div>
                </div>

                {blockSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    {blockSuccess}
                  </div>
                )}
                {blockError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                    {blockError}
                  </div>
                )}

                {/* Statistiques supplémentaires */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                  <div className="text-center p-3 bg-[#F5F0EB] rounded-lg">
                    <p className="text-2xl font-bold text-[#E63832]">
                      {opportunite.nombre_places - opportunite.places_restantes}
                    </p>
                    <p className="text-xs text-gray-600">Déjà intéressés</p>
                  </div>
                  <div className="text-center p-3 bg-[#F5F0EB] rounded-lg">
                    <p className="text-2xl font-bold text-[#E63832]">
                      {Math.round(pourcentageRemplissage)}%
                    </p>
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
