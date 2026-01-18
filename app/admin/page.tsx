"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Euro,
  TrendingUp,
  UserCheck,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface Stats {
  annonceurs: {
    total: number
    enAttente: number
    valides: number
  }
  opportunites: {
    total: number
    enAttente: number
    validees: number
    refusees: number
    expirees: number
  }
  achats: {
    total: number
    montantTotal: number
  }
  comediens: {
    total: number
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    annonceurs: { total: 0, enAttente: 0, valides: 0 },
    opportunites: { total: 0, enAttente: 0, validees: 0, refusees: 0, expirees: 0 },
    achats: { total: 0, montantTotal: 0 },
    comediens: { total: 0 },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) throw new Error('Erreur lors du chargement des stats')

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Erreur:', error)
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
      title: "Total annonceurs",
      value: stats.annonceurs.total,
      icon: <Users className="w-5 h-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Annonceurs en attente",
      value: stats.annonceurs.enAttente,
      icon: <Clock className="w-5 h-5" />,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      onClick: () => router.push('/admin/annonceurs?statut=en_attente'),
      clickable: true,
    },
    {
      title: "Annonceurs validés",
      value: stats.annonceurs.valides,
      icon: <UserCheck className="w-5 h-5" />,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total opportunités",
      value: stats.opportunites.total,
      icon: <Calendar className="w-5 h-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Opportunités en attente",
      value: stats.opportunites.enAttente,
      icon: <Clock className="w-5 h-5" />,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      onClick: () => router.push('/admin/opportunites?statut=en_attente'),
      clickable: true,
    },
    {
      title: "Opportunités validées",
      value: stats.opportunites.validees,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total comédiens",
      value: stats.comediens.total,
      icon: <Users className="w-5 h-5" />,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      title: "Total réservations",
      value: stats.achats.total,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Revenu total",
      value: `${stats.achats.montantTotal.toFixed(2)}€`,
      icon: <Euro className="w-5 h-5" />,
      color: "text-[#E63832]",
      bgColor: "bg-red-100",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Tableau de bord Administrateur
        </h1>
        <p className="text-gray-600 text-lg">
          Vue d&apos;ensemble de la plateforme Scenio
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 flex gap-4">
        <Button
          size="lg"
          className="bg-orange-600 hover:bg-orange-700 text-white shadow-md"
          onClick={() => router.push('/admin/annonceurs?statut=en_attente')}
        >
          <Clock className="w-5 h-5 mr-2" />
          Annonceurs en attente ({stats.annonceurs.enAttente})
        </Button>
        <Button
          size="lg"
          className="bg-[#E63832] hover:bg-[#E63832]/90 text-white shadow-md"
          onClick={() => router.push('/admin/opportunites?statut=en_attente')}
        >
          <Calendar className="w-5 h-5 mr-2" />
          Opportunités en attente ({stats.opportunites.enAttente})
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className={`hover:shadow-lg transition-shadow ${
              stat.clickable ? 'cursor-pointer' : ''
            }`}
            onClick={stat.onClick}
          >
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

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">Actions rapides</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/admin/annonceurs')}
              >
                <Users className="w-4 h-4 mr-2" />
                Gérer les annonceurs
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/admin/opportunites')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Gérer les opportunités
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">Statistiques</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Taux de validation annonceurs</span>
                <span className="font-bold">
                  {stats.annonceurs.total > 0
                    ? Math.round((stats.annonceurs.valides / stats.annonceurs.total) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Taux de validation opportunités</span>
                <span className="font-bold">
                  {stats.opportunites.total > 0
                    ? Math.round((stats.opportunites.validees / stats.opportunites.total) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Revenu moyen par réservation</span>
                <span className="font-bold">
                  {stats.achats.total > 0
                    ? (stats.achats.montantTotal / stats.achats.total).toFixed(2)
                    : 0}€
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
