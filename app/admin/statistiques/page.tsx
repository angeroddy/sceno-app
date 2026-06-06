"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, Loader2, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type PreferenceStat = {
  type: string
  label: string
  count: number
}

type AdminStatsResponse = {
  preferencesByType: PreferenceStat[]
  totalSelections: number
}

export default function AdminStatistiquesPage() {
  const [stats, setStats] = useState<AdminStatsResponse>({
    preferencesByType: [],
    totalSelections: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError("")

        const response = await fetch("/api/admin/statistiques")
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || "Impossible de charger les statistiques")
        }

        setStats(data as AdminStatsResponse)
      } catch (fetchError) {
        console.error("Erreur statistiques admin:", fetchError)
        setError(fetchError instanceof Error ? fetchError.message : "Erreur lors du chargement")
      } finally {
        setLoading(false)
      }
    }

    void fetchStats()
  }, [])

  const maxCount = useMemo(
    () => Math.max(...stats.preferencesByType.map((item) => item.count), 0),
    [stats.preferencesByType]
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#E63832]" />
          <p className="text-sm text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">
          Statistiques
        </h1>
        <p className="text-lg text-gray-600">
          Suivez les types d&apos;opportunités cochés par les comédiens.
        </p>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-sm text-red-700">
            {error}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-[#FEE] p-3 text-[#E63832]">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total des types cochés</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalSelections}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {stats.preferencesByType.map((item) => {
              const percentage = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0

              return (
                <Card key={item.type} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[#F5F0EB] p-3 text-[#E63832]">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">{item.label}</h2>
                          <p className="text-sm text-gray-600">Type d&apos;opportunité</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {item.count}
                      </Badge>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-[#E6DAD0]">
                      <div
                        className="h-full rounded-full bg-[#E63832]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {item.count} coche{item.count > 1 ? "s" : ""}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
