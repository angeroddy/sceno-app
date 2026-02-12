"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Mail,
  User,
  Users,
  XCircle,
} from "lucide-react"
import { OPPORTUNITY_MODEL_LABELS, OPPORTUNITY_TYPE_LABELS } from "@/app/types"

interface OpportuniteLite {
  id: string
  titre: string
  type: string
  modele: string
  image_url?: string | null
  prix_base?: number
  prix_reduit?: number
  date_evenement?: string
}

interface AnnonceurLite {
  id: string
  nom_formation: string
  email: string
}

interface AchatRow {
  id: string
  opportunite_id: string
  prix_paye: number
  statut: string
  created_at: string
  opportunite?: OpportuniteLite | null
  annonceur?: AnnonceurLite | null
}

interface BloqueRow {
  id: string
  annonceur_id: string
  created_at: string
  annonceur?: AnnonceurLite | null
}

interface NotificationRow {
  id: string
  opportunite_id: string
  objet: string
  envoye: boolean
  envoye_at: string | null
  created_at: string
  opportunite?: OpportuniteLite | null
}

interface ComedienDetails {
  id: string
  nom: string
  prenom: string
  genre?: "masculin" | "feminin" | "non_genre" | null
  email: string
  photo_url: string | null
  lien_demo: string | null
  preferences_opportunites: string[]
  email_verifie: boolean
  date_naissance: string | null
  created_at: string
  updated_at: string
}

export default function AdminComedienDetailsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const comedienId = useMemo(() => {
    if (!pathname) return ""
    const parts = pathname.split("/").filter(Boolean)
    return parts[parts.length - 1] || ""
  }, [pathname])

  const [comedien, setComedien] = useState<ComedienDetails | null>(null)
  const [achats, setAchats] = useState<AchatRow[]>([])
  const [bloques, setBloques] = useState<BloqueRow[]>([])
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!comedienId || comedienId === "undefined") {
      setLoading(false)
      setError("Identifiant du comédien manquant")
      return
    }
    fetchDetails()
  }, [comedienId])

  const fetchDetails = async () => {
    if (!comedienId || comedienId === "undefined") return
    try {
      setLoading(true)
      setError("")
      const response = await fetch(`/api/admin/comediens/${comedienId}`)
      if (!response.ok) {
        const text = await response.text()
        console.error("Erreur fetch comedien:", response.status, text)
        setError("Impossible de charger la fiche du comédien")
        return
      }
      const data = await response.json()
      setComedien(data.comedien || null)
      setAchats(data.achats || [])
      setBloques(data.annonceurs_bloques || [])
      setNotifications(data.notifications_email || [])
    } catch (err) {
      console.error("Erreur:", err)
      setError("Une erreur inattendue s'est produite")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatGender = (genre?: string | null) => {
    if (!genre) return "Non renseigne"
    if (genre === "masculin") return "Masculin"
    if (genre === "feminin") return "Feminin"
    if (genre === "non_genre") return "Non genre"
    return genre
  }

  const initials = useMemo(() => {
    const n = comedien?.nom?.trim().charAt(0).toUpperCase() || ""
    const p = comedien?.prenom?.trim().charAt(0).toUpperCase() || ""
    return `${p}${n}` || "C"
  }, [comedien])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E63832]"></div>
      </div>
    )
  }

  if (!comedien) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Comédien introuvable</p>
            <Button className="mt-4" onClick={() => router.push("/admin/comediens")}>
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/comediens")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la liste
        </Button>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {comedien.photo_url ? (
              <img
                src={comedien.photo_url}
                alt={`${comedien.prenom} ${comedien.nom}`}
                className="h-16 w-16 rounded-full object-cover border"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-[#E6DAD0] text-gray-700 flex items-center justify-center text-lg font-semibold border">
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {comedien.prenom} {comedien.nom}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <Mail className="w-4 h-4" />
                <span>{comedien.email}</span>
                {comedien.email_verifie ? (
                  <Badge className="bg-green-100 text-green-700">Email vérifié</Badge>
                ) : (
                  <Badge variant="outline" className="border-gray-300 text-gray-500">Email non vérifié</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-gray-600">
              Inscrit le {formatDate(comedien.created_at)}
            </Badge>
            <Badge variant="outline" className="text-gray-600">
              MAJ le {formatDate(comedien.updated_at)}
            </Badge>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Nom</p>
                  <p className="font-medium">{comedien.nom}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Prénom</p>
                  <p className="font-medium">{comedien.prenom}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date de naissance</p>
                <p className="font-medium">{formatDate(comedien.date_naissance)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Genre</p>
                <p className="font-medium">{formatGender(comedien.genre)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Lien démo</p>
                {comedien.lien_demo ? (
                  <a
                    href={comedien.lien_demo}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[#E63832] font-medium hover:underline"
                  >
                    {comedien.lien_demo}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <p className="text-gray-400">Non renseigné</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Préférences d'opportunités</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(comedien.preferences_opportunites || []).length > 0 ? (
                    comedien.preferences_opportunites.map((pref) => (
                      <Badge key={pref} variant="outline" className="text-xs">
                        {OPPORTUNITY_TYPE_LABELS[pref as keyof typeof OPPORTUNITY_TYPE_LABELS] || pref}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-400">Aucune préférence</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Achats et opportunités liées
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {achats.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun achat enregistré.</p>
              ) : (
                achats.map((achat) => (
                  <div key={achat.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {achat.opportunite?.titre || "Opportunité supprimée"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {achat.statut}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="text-gray-500">Montant payé:</span> {achat.prix_paye}€
                      </div>
                      {achat.opportunite && (
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {OPPORTUNITY_TYPE_LABELS[achat.opportunite.type as keyof typeof OPPORTUNITY_TYPE_LABELS] || achat.opportunite.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {OPPORTUNITY_MODEL_LABELS[achat.opportunite.modele as keyof typeof OPPORTUNITY_MODEL_LABELS] || achat.opportunite.modele}
                          </Badge>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Date d'achat:</span> {formatDateTime(achat.created_at)}
                      </div>
                      {achat.annonceur && (
                        <div className="text-gray-500">
                          Organisme: {achat.annonceur.nom_formation}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Achats</span>
                <span className="font-semibold">{achats.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Annonceurs bloqués</span>
                <span className="font-semibold">{bloques.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Notifications email</span>
                <span className="font-semibold">{notifications.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Annonceurs bloqués</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bloques.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun annonceur bloqué.</p>
              ) : (
                bloques.map((item) => (
                  <div key={item.id} className="text-sm border rounded-md p-3">
                    <div className="font-semibold">
                      {item.annonceur?.nom_formation || "Annonceur supprimé"}
                    </div>
                    <div className="text-gray-500">{item.annonceur?.email || "-"}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Bloqué le {formatDate(item.created_at)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune notification.</p>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="border rounded-md p-3 text-sm space-y-1">
                    <div className="font-semibold">
                      {notif.opportunite?.titre || "Opportunité"}
                    </div>
                    <div className="text-gray-500">{notif.objet}</div>
                    <div className="flex items-center gap-2">
                      {notif.envoye ? (
                        <span className="inline-flex items-center text-green-700">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Envoyé
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-gray-500">
                          <XCircle className="w-4 h-4 mr-1" />
                          En attente
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {notif.envoye_at ? `Envoyé le ${formatDateTime(notif.envoye_at)}` : `Créé le ${formatDateTime(notif.created_at)}`}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
