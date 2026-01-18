"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
  Eye,
} from "lucide-react"
import type { Annonceur } from "@/app/types"

interface AnnonceurWithStats extends Annonceur {
  opportunites?: { id: string }[]
}

export default function AnnonceursPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [annonceurs, setAnnonceurs] = useState<AnnonceurWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('statut') || "all")
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedAnnonceur, setSelectedAnnonceur] = useState<AnnonceurWithStats | null>(null)
  const [modalAction, setModalAction] = useState<'valider' | 'refuser'>('valider')
  const [refusRaison, setRefusRaison] = useState("")

  useEffect(() => {
    fetchAnnonceurs()
  }, [statusFilter])

  const fetchAnnonceurs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/annonceurs?statut=${statusFilter}&limit=100`)

      if (!response.ok) {
        throw new Error('Erreur lors du chargement')
      }

      const data = await response.json()
      setAnnonceurs(data.annonceurs || [])
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleValidation = async (annonceur: AnnonceurWithStats, action: 'valider' | 'refuser') => {
    setSelectedAnnonceur(annonceur)
    setModalAction(action)
    setShowModal(true)
  }

  const confirmValidation = async () => {
    if (!selectedAnnonceur) return

    try {
      setValidatingId(selectedAnnonceur.id)

      const response = await fetch('/api/admin/annonceurs/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annonceurId: selectedAnnonceur.id,
          action: modalAction,
          raison: modalAction === 'refuser' ? refusRaison : undefined,
        }),
      })

      if (!response.ok) throw new Error('Erreur lors de la validation')

      // Rafraîchir la liste
      await fetchAnnonceurs()
      setShowModal(false)
      setRefusRaison("")
    } catch (error) {
      console.error('Erreur:', error)
      alert("Une erreur s'est produite")
    } finally {
      setValidatingId(null)
    }
  }

  const filteredAnnonceurs = annonceurs.filter(annonceur => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      annonceur.nom_formation.toLowerCase().includes(search) ||
      annonceur.email.toLowerCase().includes(search)
    )
  })

  const getStatusBadge = (identiteVerifiee: boolean) => {
    if (identiteVerifiee) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Vérifié</Badge>
    }
    return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">En attente</Badge>
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
              Gestion des Annonceurs
            </h1>
            <p className="text-gray-600 text-lg">
              Validez ou refusez les inscriptions des organismes de formation
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
                placeholder="Rechercher par nom ou email..."
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
                <option value="valide">Validés</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des annonceurs */}
      {filteredAnnonceurs.length > 0 ? (
        <div className="space-y-4">
          {filteredAnnonceurs.map((annonceur) => {
            const opportunitesCount = Array.isArray(annonceur.opportunites) ? annonceur.opportunites.length : 0

            return (
              <Card key={annonceur.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Icône */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>

                    {/* Contenu */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-xl">{annonceur.nom_formation}</h3>
                            {getStatusBadge(annonceur.identite_verifiee)}
                            {annonceur.email_verifie && (
                              <Badge variant="outline" className="text-xs">
                                <Mail className="w-3 h-3 mr-1" />
                                Email vérifié
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <Mail className="w-4 h-4" />
                            <span>{annonceur.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-sm">
                          <span className="text-gray-600">Inscription:</span>
                          <div className="font-medium flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(annonceur.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Opportunités publiées:</span>
                          <div className="font-medium">{opportunitesCount}</div>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">IBAN:</span>
                          <div className="font-medium">
                            {annonceur.iban
                              ? `${annonceur.iban.substring(0, 4)}...${annonceur.iban.slice(-4)}`
                              : 'Non renseigné'}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/annonceurs/${annonceur.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir détails
                        </Button>
                        {!annonceur.identite_verifiee && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleValidation(annonceur, 'valider')}
                              disabled={validatingId === annonceur.id}
                            >
                              {validatingId === annonceur.id ? (
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
                              onClick={() => handleValidation(annonceur, 'refuser')}
                              disabled={validatingId === annonceur.id}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Refuser
                            </Button>
                          </>
                        )}
                      </div>
                      {annonceur.identite_verifiee && (
                        <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Identité vérifiée</span>
                        </div>
                      )}
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
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm
                  ? "Aucun annonceur ne correspond à vos critères"
                  : statusFilter === "en_attente"
                  ? "Aucun annonceur en attente de validation"
                  : "Aucun annonceur trouvé"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de confirmation */}
      {showModal && selectedAnnonceur && (
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
                  {modalAction === 'valider' ? 'Valider cet annonceur ?' : 'Refuser cet annonceur ?'}
                </h3>
                <p className="text-center text-gray-600 mb-4">
                  {selectedAnnonceur.nom_formation}
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
                    placeholder="Expliquez pourquoi ce compte n'est pas validé..."
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
