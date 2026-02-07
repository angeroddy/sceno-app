"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Users, Loader2, CheckCircle2, XCircle } from "lucide-react"

interface ComedienRow {
  id: string
  nom: string
  prenom: string
  email: string
  photo_url: string | null
  lien_demo: string | null
  preferences_opportunites: string[]
  email_verifie: boolean
  created_at: string
}

export default function AdminComediensPage() {
  const [comediens, setComédiens] = useState<ComedienRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchComédiens()
  }, [])

  const fetchComédiens = async () => {
    try {
      const response = await fetch("/api/admin/comediens")

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Erreur fetching comediens — status:", response.status, "body:", errorText)
        setError("Impossible de charger la liste des comédiens")
        return
      }

      const data = await response.json()
      setComédiens(data.comediens || [])
    } catch (err) {
      console.error("Erreur:", err)
      setError("Une erreur inattendue s'est produite")
    } finally {
      setLoading(false)
    }
  }

  // Filtrer par nom OU email (recherche insensible à la casse)
  const filteredComédiens = useMemo(() => {
    if (!search.trim()) return comediens
    const q = search.trim().toLowerCase()
    return comediens.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        c.prenom.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    )
  }, [comediens, search])

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "N/A"
    const d = new Date(dateStr)
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getInitials = (nom?: string, prenom?: string) => {
    const n = nom?.trim().charAt(0).toUpperCase() || ""
    const p = prenom?.trim().charAt(0).toUpperCase() || ""
    return `${p}${n}` || "C"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-[#E63832]" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-[#E63832]" />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Gestion des Comédiens
          </h1>
        </div>
        <p className="text-gray-600 text-lg">
          Liste de tous les comédiens inscrits sur la plateforme
        </p>
      </div>

      {/* Barre de recherche */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Message d'erreur */}
      {error && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Compteur de résultats */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          {filteredComédiens.length} comédien{filteredComédiens.length !== 1 ? "s" : ""}
          {search.trim() && ` trouvé${filteredComédiens.length !== 1 ? "s" : ""} pour "${search.trim()}"`}
        </p>
      </div>

      {/* Tableau desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[#F5F0EB]">
                  <th className="text-left px-6 py-4 font-semibold text-gray-700">Photo</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700">Nom / Prénom</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700">Email vérifié</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700">Inscription</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {filteredComédiens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      Aucun comédien trouvé
                    </td>
                  </tr>
                ) : (
                  filteredComédiens.map((comedien) => (
                    <tr key={comedien.id} className="border-b last:border-0 hover:bg-[#F5F0EB]/50 transition-colors">
                      <td className="px-6 py-4">
                        {comedien.photo_url ? (
                          <img
                            src={comedien.photo_url}
                            alt={`${comedien.prenom} ${comedien.nom}`}
                            className="h-10 w-10 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[#E6DAD0] text-gray-700 flex items-center justify-center text-sm font-semibold border">
                            {getInitials(comedien.nom, comedien.prenom)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/comediens/${encodeURIComponent(comedien.id)}`}
                          className="font-semibold text-gray-900 hover:text-[#E63832] underline-offset-2 hover:underline"
                        >
                          {comedien.nom} {comedien.prenom}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{comedien.email}</td>
                      <td className="px-6 py-4">
                        {comedien.email_verifie ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(comedien.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/comediens/${encodeURIComponent(comedien.id)}`}
                          className="text-sm text-[#E63832] font-medium hover:underline"
                        >
                          Voir la fiche
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cards mobile */}
      <div className="md:hidden space-y-3">
        {filteredComédiens.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              Aucun comédien trouvé
            </CardContent>
          </Card>
        ) : (
          filteredComédiens.map((comedien) => (
            <Card key={comedien.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {comedien.photo_url ? (
                    <img
                      src={comedien.photo_url}
                      alt={`${comedien.prenom} ${comedien.nom}`}
                      className="h-12 w-12 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-[#E6DAD0] text-gray-700 flex items-center justify-center text-sm font-semibold border">
                      {getInitials(comedien.nom, comedien.prenom)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Link
                        href={`/admin/comediens/${encodeURIComponent(comedien.id)}`}
                        className="font-bold text-gray-900 hover:text-[#E63832] underline-offset-2 hover:underline"
                      >
                        {comedien.nom} {comedien.prenom}
                      </Link>
                      {comedien.email_verifie ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Email vérifié</Badge>
                      ) : (
                        <Badge variant="outline" className="border-gray-300 text-gray-500">Non vérifié</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{comedien.email}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Inscrit le {formatDate(comedien.created_at)}
                    </p>
                    <div className="mt-2">
                      <Link
                        href={`/admin/comediens/${encodeURIComponent(comedien.id)}`}
                        className="text-sm text-[#E63832] font-medium hover:underline"
                      >
                        Voir la fiche
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
