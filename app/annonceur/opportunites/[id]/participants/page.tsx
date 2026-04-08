"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, ExternalLink, Loader2, PlayCircle, Ticket, UserRound, VenusAndMars } from "lucide-react"
import { AppModal } from "@/components/ui/app-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getAgeFromDate } from "@/app/lib/signup-validation"

type Participant = {
  achat_id: string
  purchased_at: string
  comedien: {
    id: string
    nom: string
    prenom: string
    date_naissance: string | null
    genre: "masculin" | "feminin" | "non_genre" | null
    photo_url: string | null
    lien_demo: string | null
    compte_supprime: boolean
  }
}

type ParticipantsResponse = {
  opportunite: {
    id: string
    titre: string
  }
  participants: Participant[]
}

function formatFullName(participant: Participant) {
  return `${participant.comedien.prenom} ${participant.comedien.nom}`.trim()
}

function formatGender(genre?: Participant["comedien"]["genre"]) {
  if (!genre) return "Non renseigné"
  if (genre === "masculin") return "Masculin"
  if (genre === "feminin") return "Féminin"
  if (genre === "non_genre") return "Non genré"
  return genre
}

export default function OpportunityParticipantsPage() {
  const params = useParams()
  const router = useRouter()
  const [opportunityId, setOpportunityId] = useState<string | null>(null)
  const [data, setData] = useState<ParticipantsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)

  useEffect(() => {
    if (!params?.id) return
    setOpportunityId(typeof params.id === "string" ? params.id : params.id[0])
  }, [params])

  const fetchParticipants = useCallback(async () => {
    if (!opportunityId) return

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/annonceur/opportunites/${opportunityId}/participants`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de récupérer les participants")
      }

      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => {
    void fetchParticipants()
  }, [fetchParticipants])

  const participants = useMemo(() => data?.participants || [], [data])

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-[#F5F0EB] to-white">
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#E63832]" />
            <p className="text-gray-600">Chargement des profils des participants...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-linear-to-b from-[#F5F0EB] to-white">
        <div className="container mx-auto px-4 py-10">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="space-y-4 p-6">
              <p className="font-semibold text-red-900">Impossible d&apos;afficher les profils des participants</p>
              <p className="text-sm text-red-700">{error || "Une erreur est survenue"}</p>
              <Button
                type="button"
                className="bg-[#E63832] hover:bg-[#E63832]/90"
                onClick={() => router.push("/annonceur/opportunites")}
              >
                Retour aux opportunités
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-[#F5F0EB] via-[#FFFDFB] to-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <Button
          variant="ghost"
          className="mb-6 hover:bg-[#E6DAD0]"
          onClick={() => router.push(`/annonceur/opportunites/${data.opportunite.id}`)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Retour au détail de l&apos;opportunité
        </Button>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge className="bg-[#E6DAD0] text-gray-900 hover:bg-[#E6DAD0]">
              Participants
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
              Profils des participants
            </h1>
            <p className="max-w-3xl text-gray-600">
              {data.opportunite.titre}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E6DAD0] bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-gray-500">
              Places confirmées
            </p>
            <p className="mt-2 text-3xl font-bold text-[#E63832]">{participants.length}</p>
          </div>
        </div>

        {participants.length === 0 ? (
          <Card className="border-[#E6DAD0] bg-white" >
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F0EB]">
                <UserRound className="h-8 w-8 text-[#E63832]" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-gray-900">Aucun profil à afficher pour le moment</p>
                <p className="max-w-xl text-sm text-gray-600">
                  Les profils apparaîtront ici dès qu&apos;une place aura été achetée et confirmée sur cette opportunité.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {participants.map((participant) => {
              const fullName = formatFullName(participant)
              const purchaseDate = new Date(participant.purchased_at).toLocaleDateString("fr-FR")
              const tertiaryInfo = participant.comedien.compte_supprime
                ? "Données personnelles masquées"
                : formatGender(participant.comedien.genre)

              return (
                <div
                  key={participant.achat_id}
                  className="group relative mx-auto w-full max-w-[390px] rounded-[2.2rem] bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="relative aspect-[4/5.6] overflow-hidden rounded-[1.8rem] bg-[#F5F0EB]">
                    {participant.comedien.photo_url && !participant.comedien.compte_supprime ? (
                      <Image
                        src={participant.comedien.photo_url}
                        alt={fullName}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, (max-width: 1536px) 33vw, 390px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-to-b from-[#E6DAD0] via-[#D6CBC0] to-[#9F948A] px-6 text-center">
                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/40 bg-white/15 backdrop-blur-md">
                          <UserRound className="h-10 w-10 text-white" />
                        </div>
                        <p className="max-w-[11rem] text-sm font-medium text-white/90">
                          {participant.comedien.compte_supprime ? "Compte supprimé" : "Photo indisponible"}
                        </p>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-white/10" />

                    <div className="absolute left-4 top-4 right-4 flex items-start justify-between">
                      <div>
                        {participant.comedien.compte_supprime ? (
                          <Badge className="border border-white/15 bg-black/35 text-[11px] text-white shadow-none backdrop-blur-md hover:bg-black/35">
                            Compte supprimé
                          </Badge>
                        ) : participant.comedien.lien_demo ? (
                          <Badge className="border border-white/15 bg-[#E63832]/90 text-[11px] text-white shadow-none hover:bg-[#E63832]/90">
                            Démo disponible
                          </Badge>
                        ) : (
                          <Badge className="border border-white/15 bg-white/18 text-[11px] text-white shadow-none backdrop-blur-md hover:bg-white/18">
                            Comédien inscrit
                          </Badge>
                        )}
                      </div>

                 
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                        <div className="space-y-4">
                          <div>
                          <h2 className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-white">
                            {fullName}
                          </h2>
                        </div>

                        <div className="flex flex-col items-start gap-1.5 text-[0.82rem] text-white/92 sm:text-[0.9rem]">
                          <span className="inline-flex items-center gap-2">
                            <Ticket className="h-4 w-4" />
                            Achat du {purchaseDate}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <VenusAndMars className="h-4 w-4" />
                            {tertiaryInfo}
                          </span>
                        </div>

                        <Button
                          type="button"
                          className="h-13 w-full rounded-full bg-white text-[0.95rem] font-semibold text-black shadow-[0_12px_28px_rgba(255,255,255,0.22)] transition hover:bg-white/92"
                          onClick={() => setSelectedParticipant(participant)}
                        >
                          Voir le profil
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AppModal
        open={Boolean(selectedParticipant)}
        onClose={() => setSelectedParticipant(null)}
        title={selectedParticipant ? formatFullName(selectedParticipant) : "Profil"}
        description={selectedParticipant?.comedien.compte_supprime
          ? "Ce compte a été supprimé et anonymisé."
          : "Fiche du comédien liée à une place confirmée pour cette opportunité."}
        tone="default"
      >
        {selectedParticipant ? (
          <div className="space-y-5">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[220px] overflow-hidden rounded-2xl bg-[#F5F0EB]">
              {selectedParticipant.comedien.photo_url && !selectedParticipant.comedien.compte_supprime ? (
                <Image
                  src={selectedParticipant.comedien.photo_url}
                  alt={formatFullName(selectedParticipant)}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="220px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#F5F0EB] to-[#EDE1D7]">
                  <UserRound className="h-16 w-16 text-[#C7B8AA]" />
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-[#F8F3EE] p-4 text-sm text-gray-700">
              <p>
                Achat confirmé le{" "}
                <span className="font-semibold">
                  {new Date(selectedParticipant.purchased_at).toLocaleDateString("fr-FR")}
                </span>
              </p>
            </div>

            {selectedParticipant.comedien.compte_supprime ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                Les informations personnelles de ce participant ne sont plus accessibles.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#E6DAD0] bg-white p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Nom</p>
                    <p className="mt-1 font-semibold text-gray-900">{selectedParticipant.comedien.nom}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Prénom</p>
                    <p className="mt-1 font-semibold text-gray-900">{selectedParticipant.comedien.prenom}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Âge</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {(() => {
                        const age = getAgeFromDate(selectedParticipant.comedien.date_naissance)
                        return age === null ? "Non renseigné" : `${age} ans`
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Genre</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {formatGender(selectedParticipant.comedien.genre)}
                    </p>
                  </div>
                </div>

                {selectedParticipant.comedien.lien_demo ? (
                  <Button asChild className="w-full bg-[#E63832] hover:bg-[#E63832]/90">
                    <a
                      href={selectedParticipant.comedien.lien_demo}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Voir le lien de démo
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#E6DAD0] p-4 text-sm text-gray-500">
                    Aucun lien de démo n&apos;a été renseigné sur ce profil.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </AppModal>
    </div>
  )
}
