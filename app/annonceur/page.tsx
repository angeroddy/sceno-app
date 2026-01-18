"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Eye,
  TrendingUp,
  Users,
  Euro,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  PlusCircle
} from "lucide-react"
import { createClient } from "@/app/lib/supabase-client"
import { useRouter } from "next/navigation"
import type { Opportunite, Annonceur, Achat } from "@/app/types"

interface Stats {
  totalOpportunites: number
  opportunitesValidees: number
  opportunitesEnAttente: number
  opportunitesRefusees: number
  totalVues: number
  totalReservations: number
  revenuTotal: number
}

export default function AnnonceurPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalOpportunites: 0,
    opportunitesValidees: 0,
    opportunitesEnAttente: 0,
    opportunitesRefusees: 0,
    totalVues: 0,
    totalReservations: 0,
    revenuTotal: 0,
  })
  const [recentOpportunites, setRecentOpportunites] = useState<Opportunite[]>([])
  const [annonceur, setAnnonceur] = useState<Annonceur | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const supabase = createClient()

      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Récupérer le profil annonceur
      const { data: annonceurData, error: annonceurError } = await supabase
        .from('annonceurs')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!annonceurError && annonceurData) {
        setAnnonceur(annonceurData as Annonceur)

        // Récupérer toutes les opportunités de cet annonceur
        const { data: opportunitesData } = await supabase
          .from('opportunites')
          .select('*')
          .eq('annonceur_id', (annonceurData as Annonceur).id)
          .order('created_at', { ascending: false })

        const opportunites = opportunitesData as Opportunite[] | null

        if (opportunites) {
          // Calculer les statistiques
          const validees = opportunites.filter(o => o.statut === 'validee').length
          const enAttente = opportunites.filter(o => o.statut === 'en_attente').length
          const refusees = opportunites.filter(o => o.statut === 'refusee').length

          // Récupérer les achats pour calculer revenus et réservations
          const { data: achatsData } = await supabase
            .from('achats')
            .select('*, opportunite:opportunites!inner(annonceur_id)')
            .eq('opportunite.annonceur_id', (annonceurData as Annonceur).id)
            .eq('statut', 'confirmee')

          const achats = achatsData as Achat[] | null
          const revenu = achats?.reduce((sum, achat) => sum + achat.prix_paye, 0) || 0
          const reservations = achats?.length || 0

          setStats({
            totalOpportunites: opportunites.length,
            opportunitesValidees: validees,
            opportunitesEnAttente: enAttente,
            opportunitesRefusees: refusees,
            totalVues: 0, // À implémenter avec un système de tracking
            totalReservations: reservations,
            revenuTotal: revenu,
          })

          // Garder les 5 opportunités les plus récentes
          setRecentOpportunites(opportunites.slice(0, 5))
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E63832]"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Total opportunités",
      value: stats.totalOpportunites,
      icon: <Calendar className="w-5 h-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Opportunités validées",
      value: stats.opportunitesValidees,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "En attente de validation",
      value: stats.opportunitesEnAttente,
      icon: <Clock className="w-5 h-5" />,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Total réservations",
      value: stats.totalReservations,
      icon: <Users className="w-5 h-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Revenu total",
      value: `${stats.revenuTotal.toFixed(2)}€`,
      icon: <Euro className="w-5 h-5" />,
      color: "text-[#E63832]",
      bgColor: "bg-red-100",
    },
  ]

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
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Bienvenue, {annonceur?.nom_formation} !
        </h1>
        <p className="text-gray-600 text-lg">
          Voici un aperçu de vos opportunités
        </p>
      </div>

      {/* Quick Action */}
      <div className="mb-8">
        <Button
          size="lg"
          className="bg-[#E63832] hover:bg-[#E63832]/90 text-white shadow-md w-full sm:w-auto"
          onClick={() => router.push('/annonceur/publier')}
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          <span className="hidden sm:inline">Publier une nouvelle opportunité</span>
          <span className="sm:hidden">Nouvelle opportunité</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  {stat.icon}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">
                {stat.title}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Opportunities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              Opportunités récentes
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => router.push('/annonceur/opportunites')}
            >
              Voir tout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOpportunites.length > 0 ? (
            <div className="space-y-4">
              {recentOpportunites.map((opportunite) => (
                <div
                  key={opportunite.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/annonceur/opportunites/${opportunite.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-bold text-lg truncate">{opportunite.titre}</h3>
                        {getStatusBadge(opportunite.statut)}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {opportunite.resume}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{new Date(opportunite.date_limite).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span>{opportunite.places_restantes}/{opportunite.nombre_places} places</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Euro className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{opportunite.prix_reduit}€ (-{opportunite.reduction_pourcentage}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-4">
                Vous n&apos;avez pas encore publié d&apos;opportunités
              </p>
              <Button
                className="bg-[#E63832] hover:bg-[#E63832]/90"
                onClick={() => router.push('/annonceur/publier')}
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Créer votre première opportunité
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
