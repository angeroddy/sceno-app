"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Users,
  Euro,
  Search,
  PlusCircle,
  Eye,
  Trash2
} from "lucide-react"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import type { Opportunite } from "@/app/types"
import { OPPORTUNITY_TYPE_LABELS } from "@/app/types"

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

export default function MesOpportunitesPage() {
  const router = useRouter()
  const [opportunites, setOpportunites] = useState<Opportunite[]>([])
  const [filteredOpportunites, setFilteredOpportunites] = useState<Opportunite[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchOpportunites()
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
      const supabase = createBrowserSupabaseClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: annonceur } = await supabase
        .from('annonceurs')
        .select('id')
        .eq('auth_user_id', user.id)
        .single<{ id: string }>()

      if (!annonceur) return

      const { data: opportunitesData } = await supabase
        .from('opportunites')
        .select('*')
        .eq('annonceur_id', annonceur.id)
        .order('created_at', { ascending: false })

      if (opportunitesData) {
        setOpportunites(opportunitesData as Opportunite[])
        setFilteredOpportunites(opportunitesData as Opportunite[])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des opportunités:', error)
    } finally {
      setLoading(false)
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
      default:
        return <Badge>{statut}</Badge>
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette opportunité ?")) return

    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase
        .from('opportunites')
        .delete()
        .eq('id', id)

      if (error) throw error

      setOpportunites(prev => prev.filter(opp => opp.id !== id))
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert("Une erreur s'est produite lors de la suppression")
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Mes opportunités
            </h1>
            <p className="text-gray-600 text-lg">
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
                  {opportunite.image_url && (
                    <div className="w-full lg:w-48 h-32 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      <img
                        src={opportunite.image_url}
                        alt={opportunite.titre}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Contenu */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-xl truncate">{opportunite.titre}</h3>
                          {getStatusBadge(opportunite.statut)}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {stripHtml(opportunite.resume)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{new Date(opportunite.date_evenement).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span>{opportunite.places_restantes}/{opportunite.nombre_places} places</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Euro className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{opportunite.prix_reduit}€ (-{Math.floor(opportunite.reduction_pourcentage)}%)</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <Badge variant="outline">{OPPORTUNITY_TYPE_LABELS[opportunite.type]}</Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/annonceur/opportunites/${opportunite.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                      {opportunite.statut === 'en_attente' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(opportunite.id)}
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
          ))}
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
    </div>
  )
}
