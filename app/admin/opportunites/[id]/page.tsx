"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  XCircle,
  ShieldAlert
} from "lucide-react"
import { Opportunite, OPPORTUNITY_TYPE_LABELS, OpportunityType } from "@/app/types"

export default function AdminOpportuniteDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [opportunite, setOpportunite] = useState<Opportunite | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false) // Pour les actions admin
  const [error, setError] = useState<string | null>(null)
  const [mainImage, setMainImage] = useState<string | null>(null)
  const [opportuniteId, setOpportuniteId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    vues: 0,
    reservations: 0,
    revenu: 0
  })

  // Extraire l'ID
  useEffect(() => {
    const extractId = async () => {
      if (params?.id) {
        const id = typeof params.id === 'string' ? params.id : params.id[0]
        setOpportuniteId(id)
      }
    }
    extractId()
  }, [params])

  // Récupérer les détails via l'API Admin
  useEffect(() => {
    if (opportuniteId) {
      fetchOpportuniteDetails()
    }
  }, [opportuniteId])

  const fetchOpportuniteDetails = async () => {
    if (!opportuniteId) return

    try {
      setLoading(true)
      // NOTE: Changement de l'endpoint vers /api/admin
      const response = await fetch(`/api/admin/opportunites/${opportuniteId}`)

      if (!response.ok) {
        throw new Error('Impossible de récupérer les détails')
      }

      const data = await response.json()
      setOpportunite(data.opportunite)
      setStats(data.stats || { vues: 0, reservations: 0, revenu: 0 })
      setMainImage(data.opportunite.image_url)
    } catch (err) {
      console.error('Erreur:', err)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  // Fonction de modération pour l'admin
  const handleUpdateStatus = async (newStatus: 'validee' | 'refusee') => {
    if (!opportuniteId) return
    
    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/opportunites/${opportuniteId}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatus })
      })

      if (!response.ok) throw new Error("Erreur lors de la mise à jour du statut")

      // Mise à jour locale pour éviter de recharger toute la page
      setOpportunite(prev => prev ? { ...prev, statut: newStatus } : null)
      
    } catch (err) {
      console.error(err)
      alert("Une erreur est survenue lors de la mise à jour du statut.")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Chargement des données administrateur...</p>
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
                <h3 className="font-semibold mb-1">Erreur Admin</h3>
                <p className="text-sm">{error || 'Opportunité introuvable'}</p>
              </div>
            </div>
            <Button
              className="mt-4 bg-gray-800 hover:bg-gray-900"
              onClick={() => router.push('/admin/opportunites')}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const dateObj = new Date(opportunite.date_limite)
  const dateFormatted = dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const timeFormatted = dateObj.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit'
  })

  const placesOccupees = opportunite.nombre_places - opportunite.places_restantes
  const pourcentageRemplissage = (placesOccupees / opportunite.nombre_places) * 100

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'validee':
        return <Badge className="bg-green-600 hover:bg-green-700">Validée</Badge>
      case 'en_attente':
        return <Badge className="bg-orange-500 hover:bg-orange-600">En attente validation</Badge>
      case 'refusee':
        return <Badge className="bg-red-600 hover:bg-red-700">Refusée</Badge>
      case 'expiree':
        return <Badge className="bg-gray-500 hover:bg-gray-600">Expirée</Badge>
      case 'complete':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Complète</Badge>
      default:
        return <Badge>{statut}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Admin distinct */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
             <Button
                variant="ghost"
                className="hover:bg-gray-100"
                onClick={() => router.push('/admin/opportunites')}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Retour liste Admin
              </Button>
              <div className="flex items-center gap-2">
                 <ShieldAlert className="w-5 h-5 text-purple-600"/>
                 <span className="font-semibold text-gray-700">Vue Administrateur</span>
              </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne gauche - Galerie et informations */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Zone de modération principale si en attente */}
            {opportunite.statut === 'en_attente' && (
               <Card className="border-orange-200 bg-orange-50 shadow-sm">
                 <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-orange-600" />
                        <div>
                            <h3 className="font-bold text-orange-900">Validation requise</h3>
                            <p className="text-sm text-orange-800">Cette opportunité attend votre validation pour être publiée.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                            variant="destructive" 
                            onClick={() => handleUpdateStatus('refusee')}
                            disabled={actionLoading}
                            className="flex-1 sm:flex-none"
                        >
                            Refuser
                        </Button>
                        <Button 
                            className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                            onClick={() => handleUpdateStatus('validee')}
                            disabled={actionLoading}
                        >
                            Valider
                        </Button>
                    </div>
                 </CardContent>
               </Card>
            )}

            {/* Galerie d'images */}
            <Card className="overflow-hidden">
              <div className="relative">
                <div className="relative h-[400px] bg-gray-200">
                  {mainImage ? (
                    <Image
                      src={mainImage}
                      alt={opportunite.titre}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <Calendar className="w-24 h-24 text-gray-300" />
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
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="informations">Infos</TabsTrigger>
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                    <TabsTrigger value="statistiques">Métriques</TabsTrigger>
                  </TabsList>

                  {/* TAB: Informations */}
                  <TabsContent value="informations" className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold mb-4">Détails techniques</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                          <p className="text-xs text-gray-500 uppercase font-bold">Type</p>
                          <p className="font-medium">{OPPORTUNITY_TYPE_LABELS[opportunite.type as OpportunityType]}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                           <p className="text-xs text-gray-500 uppercase font-bold">Modèle</p>
                           <p className="font-medium">{opportunite.modele}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                           <p className="text-xs text-gray-500 uppercase font-bold">Places totales</p>
                           <p className="font-medium">{opportunite.nombre_places}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                           <p className="text-xs text-gray-500 uppercase font-bold">ID Opportunité</p>
                           <p className="font-mono text-xs">{opportunite.id}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB: Description */}
                  <TabsContent value="description" className="space-y-4">
                    <div className="prose max-w-none p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Contenu de l&apos;annonce</h4>
                      <p className="whitespace-pre-wrap text-sm">{opportunite.resume}</p>
                    </div>
                    {opportunite.lien_infos && (
                      <div className="flex items-center gap-2 text-blue-600">
                          <ExternalLink className="w-4 h-4" />
                          <a href={opportunite.lien_infos} target="_blank" className="hover:underline text-sm">
                            Vérifier le lien externe
                          </a>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB: Contact */}
                  <TabsContent value="contact" className="space-y-4">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                          <Mail className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Email Annonceur</p>
                            <p className="font-mono text-sm">{opportunite.contact_email}</p>
                          </div>
                        </div>
                        {opportunite.contact_telephone && (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <Phone className="w-5 h-5 text-gray-500" />
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Téléphone</p>
                                <p className="font-mono text-sm">{opportunite.contact_telephone}</p>
                            </div>
                          </div>
                        )}
                    </div>
                  </TabsContent>

                  {/* TAB: Statistiques */}
                  <TabsContent value="statistiques" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 border rounded-lg bg-gray-50">
                            <span className="block text-2xl font-bold">{stats.vues}</span>
                            <span className="text-xs text-gray-500">Vues totales</span>
                        </div>
                        <div className="text-center p-4 border rounded-lg bg-gray-50">
                            <span className="block text-2xl font-bold">{stats.reservations}</span>
                            <span className="text-xs text-gray-500">Réservations</span>
                        </div>
                        <div className="text-center p-4 border rounded-lg bg-gray-50">
                            <span className="block text-2xl font-bold">{stats.revenu}€</span>
                            <span className="text-xs text-gray-500">Vol. d&apos;affaires</span>
                        </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Actions Admin */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-lg border-t-4 border-t-purple-600">
              <CardHeader className="pb-2">
                 <CardTitle className="text-lg flex items-center justify-between">
                    Résumé
                    {getStatusBadge(opportunite.statut)}
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 mb-1">
                    {opportunite.titre}
                  </h1>
                  <p className="text-xs text-gray-500">
                    Créée le {new Date(opportunite.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                {/* Prix */}
                <div className="border-t border-b border-gray-100 py-4">
                   <div className="flex justify-between items-center mb-1">
                       <span className="text-sm text-gray-600">Prix affiché :</span>
                       <span className="font-bold text-lg">{opportunite.prix_reduit}€</span>
                   </div>
                   <div className="flex justify-between items-center">
                       <span className="text-sm text-gray-600">Prix de base :</span>
                       <span className="text-sm text-gray-400 line-through">{opportunite.prix_base}€</span>
                   </div>
                   <div className="mt-2 text-xs text-right text-red-600 font-medium">
                       -{opportunite.reduction_pourcentage}% de réduction
                   </div>
                </div>

                {/* Informations de timing */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4"/> Date limite
                    </span>
                    <span className="font-medium">{dateFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                        <Clock className="w-4 h-4"/> Heure limite
                    </span>
                    <span className="font-medium">{timeFormatted}</span>
                  </div>
                </div>

                {/* Section Modération (Toujours visible pour l'admin) */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-purple-600"/>
                    Actions Administrateur
                  </h4>
                  
                  <div className="space-y-2">
                    {opportunite.statut !== 'validee' && (
                        <Button 
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => handleUpdateStatus('validee')}
                            disabled={actionLoading}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Valider l&apos;annonce
                        </Button>
                    )}
                    
                    {opportunite.statut !== 'refusee' && (
                        <Button 
                            variant="outline"
                            className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                            onClick={() => handleUpdateStatus('refusee')}
                            disabled={actionLoading}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Refuser / Bloquer
                        </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      className="w-full text-gray-500 text-xs mt-2"
                      asChild
                    >
                      <a href={`/admin/annonceurs/TBD`} /* Lien vers profil annonceur si dispo */>
                        <Users className="w-3 h-3 mr-2" />
                        Voir le profil de l&apos;annonceur
                      </a>
                    </Button>
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