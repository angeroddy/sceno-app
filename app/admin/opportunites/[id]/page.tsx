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
  Info,
  FileText,
  Contact,
  Loader2,
  AlertCircle,
  Tag,
  Building2,
  BarChart3,
  Eye,
  TrendingUp,
  CheckCircle,
  XCircle
} from "lucide-react"
import { Opportunite, OPPORTUNITY_TYPE_LABELS, OpportunityType } from "@/app/types"

export default function AdminOpportuniteDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [opportunite, setOpportunite] = useState<Opportunite | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mainImage, setMainImage] = useState<string | null>(null)
  const [opportuniteId, setOpportuniteId] = useState<string | null>(null)
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
      const newStatus = action === 'valider' ? 'validee' : 'refusee'

      const response = await fetch(`/api/admin/opportunites/${opportuniteId}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la validation')
      }

      // Rafraîchir les données
      await fetchOpportuniteDetails()
      alert(`Opportunité ${action === 'valider' ? 'validée' : 'refusée'} avec succès`)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Une erreur s'est produite lors de la validation")
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
                <Tabs defaultValue="informations" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-6 bg-[#E6DAD0]/50">
                    <TabsTrigger value="informations" className="flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      <span className="hidden sm:inline">Informations</span>
                    </TabsTrigger>
                    <TabsTrigger value="description" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">Description</span>
                    </TabsTrigger>
                    <TabsTrigger value="contact" className="flex items-center gap-2">
                      <Contact className="w-4 h-4" />
                      <span className="hidden sm:inline">Contact</span>
                    </TabsTrigger>
                    <TabsTrigger value="statistiques" className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Stats</span>
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
                            <p className="text-sm text-gray-600">Capacité totale</p>
                            <p className="font-semibold text-gray-900">
                              {opportunite.nombre_places} place(s)
                            </p>
                          </div>
                        </div>

                        {/* Places restantes */}
                        <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                          <div className="bg-white p-2 rounded-lg">
                            <Building2 className="w-5 h-5 text-[#E63832]" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Places disponibles</p>
                            <p className="font-semibold text-gray-900">
                              {opportunite.places_restantes} place(s)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Barre de progression */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Places réservées
                        </span>
                        <span className="text-sm font-bold text-[#E63832]">
                          {placesOccupees} / {opportunite.nombre_places}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-[#E63832] h-3 rounded-full transition-all"
                          style={{ width: `${pourcentageRemplissage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {opportunite.places_restantes} place(s) restante(s)
                      </p>
                    </div>
                  </TabsContent>

                  {/* TAB: Description */}
                  <TabsContent value="description" className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold mb-4 text-gray-900">
                        Description de l&apos;opportunité
                      </h3>
                      <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: opportunite.resume }} />
                    </div>

                    {opportunite.lien_infos && (
                      <div className="mt-6">
                        <a
                          href={opportunite.lien_infos}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[#E63832] hover:underline font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Lien vers plus d&apos;informations
                        </a>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB: Contact */}
                  <TabsContent value="contact" className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold mb-4 text-gray-900">
                        Informations de contact
                      </h3>

                      <div className="space-y-4">
                        {/* Email */}
                        <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                          <Mail className="w-5 h-5 text-[#E63832] flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-600 mb-1">Email de contact</p>
                            <a
                              href={`mailto:${opportunite.contact_email}`}
                              className="font-medium text-gray-900 hover:text-[#E63832] transition-colors break-words"
                            >
                              {opportunite.contact_email}
                            </a>
                          </div>
                        </div>

                        {/* Téléphone */}
                        {opportunite.contact_telephone && (
                          <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                            <Phone className="w-5 h-5 text-[#E63832] flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                              <a
                                href={`tel:${opportunite.contact_telephone}`}
                                className="font-medium text-gray-900 hover:text-[#E63832] transition-colors break-words"
                              >
                                {opportunite.contact_telephone}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB: Statistiques */}
                  <TabsContent value="statistiques" className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold mb-4 text-gray-900">
                        Performance de l&apos;opportunité
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Vues */}
                        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <Eye className="w-5 h-5 text-blue-600" />
                            <p className="text-sm font-medium text-blue-900">Vues</p>
                          </div>
                          <p className="text-3xl font-bold text-blue-600">{stats.vues}</p>
                          <p className="text-xs text-blue-700 mt-1">Nombre de consultations</p>
                        </div>

                        {/* Réservations */}
                        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <Users className="w-5 h-5 text-green-600" />
                            <p className="text-sm font-medium text-green-900">Réservations</p>
                          </div>
                          <p className="text-3xl font-bold text-green-600">{stats.reservations}</p>
                          <p className="text-xs text-green-700 mt-1">Places réservées</p>
                        </div>

                        {/* Revenu */}
                        <div className="p-6 bg-[#FEE] border border-red-200 rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-5 h-5 text-[#E63832]" />
                            <p className="text-sm font-medium text-red-900">Revenu</p>
                          </div>
                          <p className="text-3xl font-bold text-[#E63832]">{stats.revenu.toFixed(2)}€</p>
                          <p className="text-xs text-red-700 mt-1">Revenu généré</p>
                        </div>
                      </div>

                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Taux de conversion:</strong>{' '}
                          {stats.vues > 0 ? ((stats.reservations / stats.vues) * 100).toFixed(1) : 0}%
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Prix moyen par place:</strong>{' '}
                          {stats.reservations > 0 ? (stats.revenu / stats.reservations).toFixed(2) : opportunite.prix_reduit}€
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Résumé et actions ADMIN */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 shadow-lg">
              <CardContent className="p-6 space-y-6">
                {/* Titre et statut */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-[#E6DAD0] text-gray-900 hover:bg-[#E6DAD0]">
                      {OPPORTUNITY_TYPE_LABELS[opportunite.type as OpportunityType]}
                    </Badge>
                    {getStatusBadge(opportunite.statut)}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {opportunite.titre}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Créée le {new Date(opportunite.created_at).toLocaleDateString('fr-FR')}
                  </p>
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
                        Réduction de {Math.floor(opportunite.reduction_pourcentage)}%
                      </p>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-gray-900">
                      {opportunite.prix_base}€
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Prix par place
                  </p>
                </div>

                {/* Informations clés */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Date de l'événement</p>
                      <span className="text-gray-700 font-medium">{dateFormatted}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Heure limite</p>
                      <span className="text-gray-700 font-medium">{timeFormatted}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-5 h-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Places</p>
                      <span className="text-gray-700 font-medium">
                        {opportunite.places_restantes} / {opportunite.nombre_places} disponibles
                      </span>
                    </div>
                  </div>
                </div>

                {/* Boutons d'action ADMIN */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  {opportunite.statut !== 'validee' && (
                    <Button
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                      onClick={() => handleValidation('valider')}
                      disabled={validating}
                    >
                      {validating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Valider l&apos;opportunité
                    </Button>
                  )}

                  {opportunite.statut !== 'refusee' && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleValidation('refuser')}
                      disabled={validating}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Refuser l&apos;opportunité
                    </Button>
                  )}

                  {opportunite.lien_infos && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <a href={opportunite.lien_infos} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Voir le site public
                      </a>
                    </Button>
                  )}
                </div>

                {/* Informations de validation */}
                {opportunite.statut === 'en_attente' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-orange-900">
                        <p className="font-semibold mb-1">En attente de validation</p>
                        <p className="text-orange-700">
                          Cette opportunité doit être validée avant d&apos;être visible par les comédiens.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {opportunite.statut === 'validee' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-green-900">
                        <p className="font-semibold mb-1">Opportunité validée</p>
                        <p className="text-green-700">
                          Cette opportunité est visible par tous les comédiens.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {opportunite.statut === 'refusee' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-red-900">
                        <p className="font-semibold mb-1">Opportunité refusée</p>
                        <p className="text-red-700">
                          Cette opportunité a été refusée et n&apos;est pas visible.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Statistiques rapides */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                  <div className="text-center p-3 bg-[#F5F0EB] rounded-lg">
                    <p className="text-2xl font-bold text-[#E63832]">
                      {placesOccupees}
                    </p>
                    <p className="text-xs text-gray-600">Réservées</p>
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
