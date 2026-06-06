"use client"

import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle, Clock, ExternalLink, Info, Loader2, Users, XCircle } from "lucide-react"
import { OPPORTUNITY_TYPE_LABELS, type Opportunite, type OpportunityType } from "@/app/types"

interface AdminOpportuniteSidebarProps {
  opportunite: Opportunite
  statusBadge: ReactNode
  validating: boolean
  dateFormatted: string
  timeFormatted: string
  placesOccupees: number
  pourcentageRemplissage: number
  onValidate: (action: "valider" | "refuser") => void
}

/** Colonne latérale admin : résumé de l'opportunité + actions de validation/refus. */
export function AdminOpportuniteSidebar({
  opportunite,
  statusBadge,
  validating,
  dateFormatted,
  timeFormatted,
  placesOccupees,
  pourcentageRemplissage,
  onValidate,
}: AdminOpportuniteSidebarProps) {
  return (
    <div className="lg:col-span-1">
      <Card className="sticky top-8 shadow-lg">
        <CardContent className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-[#E6DAD0] text-gray-900 hover:bg-[#E6DAD0]">
                {OPPORTUNITY_TYPE_LABELS[opportunite.type as OpportunityType]}
              </Badge>
              {statusBadge}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {opportunite.titre}
            </h1>
            <p className="text-sm text-gray-600">
              Créée le {new Date(opportunite.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>

          <div className="border-t border-b border-gray-200 py-4">
            {opportunite.reduction_pourcentage > 0 ? (
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-[#E63832]">
                    {opportunite.prix_reduit}€
                  </span>
                  <span className="text-lg text-gray-400 line-through">
                    {opportunite.prix_base}€
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Réduction de {Math.floor(opportunite.reduction_pourcentage)}%
                </p>
              </div>
            ) : (
              <div className="text-3xl font-bold text-gray-900">
                {opportunite.prix_base}€
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Prix par place
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Date de l&apos;événement</p>
                <span className="text-gray-700 font-medium">{dateFormatted}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Heure limite</p>
                <span className="text-gray-700 font-medium">{timeFormatted}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Users className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Places</p>
                <span className="text-gray-700 font-medium">
                  {opportunite.places_restantes} / {opportunite.nombre_places} disponibles
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-200">
            {opportunite.statut !== 'validee' && (
              <Button
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                onClick={() => onValidate('valider')}
                disabled={validating}
              >
                {validating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Valider l&apos;opportunité
              </Button>
            )}

            {opportunite.statut !== 'refusee' && (
              <Button
                size="lg"
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => onValidate('refuser')}
                disabled={validating}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Refuser l&apos;opportunité
              </Button>
            )}

            {opportunite.lien_infos && (
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                asChild
              >
                <a href={opportunite.lien_infos} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Voir le site public
                </a>
              </Button>
            )}
          </div>

          {opportunite.statut === 'en_attente' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900">
                  <p className="font-semibold mb-1">En attente de validation</p>
                  <p className="text-orange-700">
                    Cette opportunité doit être validée avant d&apos;être visible par les comédiens.
                  </p>
                </div>
              </div>
            </div>
          )}

          {opportunite.statut === 'validee' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div className="text-sm text-green-900">
                  <p className="font-semibold mb-1">Opportunité validée</p>
                  <p className="text-green-700">
                    Cette opportunité est visible par tous les comédiens.
                  </p>
                </div>
              </div>
            </div>
          )}

          {opportunite.statut === 'refusee' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-semibold mb-1">Opportunité refusée</p>
                  <p className="text-red-700">
                    Cette opportunité a été refusée et n&apos;est pas visible.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
            <div className="text-center p-3 bg-[#F5F0EB] rounded-lg">
              <p className="text-2xl font-bold text-[#E63832]">
                {placesOccupees}
              </p>
              <p className="text-xs text-gray-600">Réservées</p>
            </div>
            <div className="text-center p-3 bg-[#F5F0EB] rounded-lg">
              <p className="text-2xl font-bold text-[#E63832]">
                {Math.round(pourcentageRemplissage)}%
              </p>
              <p className="text-xs text-gray-600">Remplissage</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
