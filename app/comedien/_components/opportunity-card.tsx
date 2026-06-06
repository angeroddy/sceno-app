"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Ban, Calendar, Clock, Loader2, MapPin, MoreHorizontal, Tag, Users } from "lucide-react"
import { OPPORTUNITY_MODEL_LABELS } from "@/types"
import { ShareOpportunityUrlButton } from "@/components/opportunity/share-opportunity-url-button"
import type { DisplayOpportunity } from "../_lib/types"

interface OpportunityCardProps {
  opportunity: DisplayOpportunity
  imageHasError: boolean
  onImageError: (opportunityId: string) => void
  isConfirmed: boolean
  isBooking: boolean
  isBlocking: boolean
  onBlock: (annonceurId: string) => void
  onCheckout: (opportuniteId: string) => void
}

/** Carte d'opportunité affichée dans l'onglet « Opportunités » de l'espace comédien. */
export function OpportunityCard({
  opportunity,
  imageHasError,
  onImageError,
  isConfirmed,
  isBooking,
  isBlocking,
  onBlock,
  onCheckout,
}: OpportunityCardProps) {
  const isExpired = opportunity.status === "expiree"
  const isComplete = opportunity.status === "complete"
  const isRemoved = opportunity.status === "supprimee"
  const hasUnavailableVisual = isExpired || isComplete || isRemoved
  const unavailableLabel = isRemoved
    ? "Supprimée"
    : isExpired
      ? "Expirée"
      : isComplete
        ? "Complet"
        : null
  const bookingDisabled = isExpired || isComplete || isRemoved
  const bookingLabel = bookingDisabled
    ? "Indisponible"
    : isConfirmed
      ? "Déjà réservé"
      : isBooking
        ? "Paiement..."
        : "Réserver"

  return (
    <Card
      className="overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => { window.location.href = `/comedien/opportunites/${opportunity.id}` }}
    >
      <div className="relative">
        <div className="absolute top-4 left-4 z-10 bg-white rounded-lg p-2 shadow-md">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{opportunity.dateDay}</div>
            <div className="text-xs font-medium text-[#E63832]">{opportunity.dateMonth}</div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gray-200" style={{ aspectRatio: "16 / 9" }}>
          {opportunity.image && !imageHasError ? (
            <Image
              src={opportunity.image}
              alt={opportunity.title}
              fill
              className={
                `object-cover transition-transform duration-300 cursor-pointer ${
                  hasUnavailableVisual
                    ? "scale-105 blur-[2px] grayscale brightness-[0.72]"
                    : "group-hover:scale-105"
                }`
              }
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => onImageError(opportunity.id)}
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center bg-linear-to-br from-[#E6DAD0] to-[#F5F0EB] ${
                hasUnavailableVisual ? "grayscale brightness-[0.85]" : ""
              }`}
            >
              <Calendar className="w-16 h-16 text-gray-400" />
            </div>
          )}

          {unavailableLabel && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/15 px-6">
              <span className="text-center text-3xl font-normal italic text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] md:text-4xl">
                {unavailableLabel}
              </span>
            </div>
          )}

          {!hasUnavailableVisual && (
            <div className="absolute bottom-4 left-4 z-10">
              <span className="text-white text-sm font-medium bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                {`${opportunity.placesLeft} place${opportunity.placesLeft > 1 ? "s" : ""} restante${opportunity.placesLeft > 1 ? "s" : ""}`}
              </span>
            </div>
          )}

          {opportunity.discount > 0 && (
            <div className="absolute top-4 right-4 z-10">
              <span className="text-white text-xs font-bold bg-[#E63832] px-2 py-1 rounded">
                -{Math.floor(opportunity.discount)}%
              </span>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-[#E6DAD0] text-gray-900 hover:bg-[#E6DAD0]">
            {opportunity.category}
          </Badge>
          <Badge
            className={
              opportunity.model === "derniere_minute"
                ? "bg-[#E63832] text-white hover:bg-[#E63832]"
                : "bg-green-100 text-green-700 hover:bg-green-100"
            }
          >
            {OPPORTUNITY_MODEL_LABELS[opportunity.model]}
          </Badge>
        </div>

        <div className="flex items-start justify-between gap-3">
          <h3 className="min-h-14 flex-1 font-bold text-lg line-clamp-2">
            {opportunity.title}
          </h3>
          <Popover>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-gray-500 hover:text-gray-900"
                aria-label={`Actions pour ${opportunity.organizer}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-56 p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                disabled={isBlocking}
                onClick={() => void onBlock(opportunity.annonceurId)}
              >
                {isBlocking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Blocage...</span>
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    <span>Bloquer cet organisme</span>
                  </>
                )}
              </button>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{opportunity.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="truncate">{opportunity.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            <span>{opportunity.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 shrink-0" />
            <div className="flex flex-col">
              {opportunity.discount > 0 ? (
                <>
                  <span className="font-semibold text-[#E63832]">{opportunity.reducedPrice}€</span>
                  <span className="text-xs line-through text-gray-400">{opportunity.price}€</span>
                </>
              ) : (
                <span className="font-semibold text-gray-900">{opportunity.price}€</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" />
            <span className="text-xs truncate">Par {opportunity.organizer}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Link href={`/comedien/opportunites/${opportunity.id}`} onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" className="w-full">
              Voir détails
            </Button>
          </Link>
          {isRemoved ? (
            <Button variant="outline" className="w-full" disabled>
              Partager
            </Button>
          ) : (
            <ShareOpportunityUrlButton
              opportunityId={opportunity.id}
              title={opportunity.title}
              text={`Découvre cette opportunité sur formations-artistiques.fr: ${opportunity.title}`}
              className="w-full"
              onClick={(event) => event.stopPropagation()}
            />
          )}
          <Button
            className="col-span-2 bg-[#E63832] hover:bg-[#E63832]/90"
            disabled={bookingDisabled || isBooking || isConfirmed}
            onClick={(e) => {
              e.stopPropagation()
              if (bookingDisabled || isConfirmed) return
              void onCheckout(opportunity.id)
            }}
          >
            {bookingLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
