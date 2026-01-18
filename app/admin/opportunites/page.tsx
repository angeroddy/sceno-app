"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Users,
  Euro,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  Loader2,
  Building2,
} from "lucide-react"
import type { Opportunite, Annonceur } from "@/app/types"
import { OPPORTUNITY_TYPE_LABELS, OPPORTUNITY_STATUS_LABELS } from "@/app/types"

interface OpportuniteWithAnnonceur extends Opportunite {
  annonceur: {
    id: string
    nom_formation: string
    email: string
    identite_verifiee: boolean
  }
}

export default function OpportunitesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [opportunites, setOpportunites] = useState<OpportuniteWithAnnonceur[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('statut') || "all")
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedOpportunite, setSelectedOpportunite] = useState<OpportuniteWithAnnonceur | null>(null)
  const [modalAction, setModalAction] = useState<'valider' | 'refuser'>('valider')
  const [refusRaison, setRefusRaison] = useState("")

  useEffect(() => {
    fetchOpportunites()
  }, [statusFilter])

  const fetchOpportunites = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/opportunites?statut=${statusFilter}&limit=100`)

      if (!response.ok) {
        throw new Error('Erreur lors du chargement')
      }

      const data = await response.json()
      setOpportunites(data.opportunites || [])
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleValidation = async (opportunite: OpportuniteWithAnnonceur, action: 'valider' | 'refuser') => {
    setSelectedOpportunite(opportunite)
    setModalAction(action)
    setShowModal(true)
  }

  const confirmValidation = async () => {
    if (!selectedOpportunite) return

    try {
      setValidatingId(selectedOpportunite.id)

      const response = await fetch('/api/admin/opportunites/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportuniteId: selectedOpportunite.id,
          action: modalAction,
          raison: modalAction === 'refuser' ? refusRaison : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la validation')
      }

      // Rafraîchir la liste
      await fetchOpportunites()
      setShowModal(false)
      setRefusRaison("")
      alert(`Opportunité ${modalAction === 'valider' ? 'validée' : 'refusée'} avec succès`)
    } catch (error) {
      console.error('Erreur:', error)
      alert(error instanceof Error ? error.message : "Une erreur s'est produite lors de la validation")
    } finally {
      setValidatingId(null)
    }
  }

  const filteredOpportunites = opportunites.filter(opportunite => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      opportunite.titre.toLowerCase().includes(search) ||
      opportunite.resume.toLowerCase().includes(search) ||
      opportunite.annonceur.nom_formation.toLowerCase().includes(search)
    )
  })

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Gestion des Opportunités
            </h1>
            <p className="text-gray-600 text-lg">
              Validez ou refusez les opportunités publiées par les annonceurs
            </p>
          </div>
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
                placeholder="Rechercher par titre, description ou annonceur..."
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
                <option value="validee">Validées</option>
                <option value="refusee">Refusées</option>
                <option value="expiree">Expirées</option>
                <option value="complete">Complètes</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des opportunités */}
      {filteredOpportunites.length > 0 ? (
        <div className="space-y-4">
          {filteredOpportunites.map((opportunite) => (
            <Card key={opportunite.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Image */}
                  {opportunite.image_url ? (
                    <div className="w-full lg:w-48 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={opportunite.image_url}
                        alt={opportunite.titre}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full lg:w-48 h-32 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-gray-300" />
                    </div>
                  )}

                  {/* Contenu */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-xl">{opportunite.titre}</h3>
                          {getStatusBadge(opportunite.statut)}
                          <Badge variant="outline">{OPPORTUNITY_TYPE_LABELS[opportunite.type]}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Building2 className="w-4 h-4" />
                          <span>{opportunite.annonceur.nom_formation}</span>
                          {!opportunite.annonceur.identite_verifiee && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">
                              Annonceur non vérifié
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {opportunite.resume.replace(/<[^>]*>/g, '').substring(0, 150)}...
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(opportunite.date_limite).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{opportunite.places_restantes}/{opportunite.nombre_places} places</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Euro className="w-4 h-4" />
                        <span>
                          <span className="line-through text-gray-400">{opportunite.prix_base}€</span>{' '}
                          <span className="font-bold text-[#E63832]">{opportunite.prix_reduit}€</span>
                          {' '}(-{opportunite.reduction_pourcentage}%)
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-500">Publié le:</span>{' '}
                        {new Date(opportunite.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/opportunites/${opportunite.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Prévisualiser
                      </Button>
                      {opportunite.statut === 'en_attente' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleValidation(opportunite, 'valider')}
                            disabled={validatingId === opportunite.id}
                          >
                            {validatingId === opportunite.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                            )}
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 border-red-300"
                            onClick={() => handleValidation(opportunite, 'refuser')}
                            disabled={validatingId === opportunite.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm
                  ? "Aucune opportunité ne correspond à vos critères"
                  : statusFilter === "en_attente"
                  ? "Aucune opportunité en attente de validation"
                  : "Aucune opportunité trouvée"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de confirmation */}
      {showModal && selectedOpportunite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  modalAction === 'valider' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {modalAction === 'valider' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-center mb-2">
                  {modalAction === 'valider' ? 'Valider cette opportunité ?' : 'Refuser cette opportunité ?'}
                </h3>
                <p className="text-center text-gray-600 mb-2">
                  {selectedOpportunite.titre}
                </p>
                <p className="text-center text-sm text-gray-500">
                  par {selectedOpportunite.annonceur.nom_formation}
                </p>
              </div>

              {modalAction === 'refuser' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Raison du refus (optionnel)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63832]"
                    rows={3}
                    placeholder="Expliquez pourquoi cette opportunité n'est pas validée..."
                    value={refusRaison}
                    onChange={(e) => setRefusRaison(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowModal(false)
                    setRefusRaison("")
                  }}
                >
                  Annuler
                </Button>
                <Button
                  className={`flex-1 ${
                    modalAction === 'valider'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  onClick={confirmValidation}
                >
                  Confirmer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
