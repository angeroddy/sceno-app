"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Calendar, ExternalLink, Info, MapPin, Tag, Users } from "lucide-react"
import { OpportunityBodyContent } from "@/components/opportunity/opportunity-body-content"

export interface OpportunityPreviewData {
  image: string
  discount: number
  category: string
  model: string
  title: string
  organizer: string
  dateLabel: string
  timeLabel: string
  price: number
  reducedPrice: number
  places: number
  resume: string
}

/** Vignette d'aperçu (format carte de liste) de l'opportunité en cours de modification. */
export function OpportunityPreviewCard({ preview }: { preview: OpportunityPreviewData }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative w-full bg-gray-200" style={{ aspectRatio: "16 / 9" }}>
        {preview.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.image} alt="Preview carte" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E6DAD0] to-[#F5F0EB]">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
        )}
        {preview.discount > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <span className="text-white text-xs font-bold bg-[#E63832] px-2 py-1 rounded">
              -{preview.discount}%
            </span>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center rounded-full bg-[#E6DAD0] px-2 py-0.5 font-medium">
            {preview.category}
          </span>
          <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-medium">
            {preview.model}
          </span>
        </div>
        <h3 className="font-bold text-lg line-clamp-2">{preview.title}</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>France</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{preview.dateLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Tag className="w-4 h-4 text-gray-500" />
          {preview.discount > 0 ? (
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[#E63832]">{preview.reducedPrice || preview.price}€</span>
              <span className="text-xs line-through text-gray-400">{preview.price || 0}€</span>
            </div>
          ) : (
            <span className="font-semibold text-gray-900">{preview.price || 0}€</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users className="w-4 h-4" />
          <span>{preview.places || 0} place(s)</span>
        </div>
      </CardContent>
    </Card>
  )
}

/** Aperçu détaillé (format page opportunité) de l'opportunité en cours de modification. */
export function OpportunityPreviewDetail({ preview }: { preview: OpportunityPreviewData }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative w-full bg-gray-200" style={{ aspectRatio: "16 / 9" }}>
        {preview.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.image} alt="Preview détail" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E6DAD0] to-[#F5F0EB]">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
        )}
        {preview.discount > 0 && (
          <div className="absolute top-4 left-4 z-10">
            <span className="text-white text-sm font-bold bg-[#E63832] px-3 py-1 rounded">
              -{preview.discount}% de réduction
            </span>
          </div>
        )}
      </div>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="rounded-full bg-[#E6DAD0] px-2 py-0.5">{preview.category}</span>
          <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5">{preview.model}</span>
        </div>
        <h3 className="text-xl font-bold">{preview.title}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="w-4 h-4" />
          <span>{preview.organizer}</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{preview.dateLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400" />
            <span>{preview.timeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{preview.places || 0} place(s)</span>
          </div>
        </div>
        <div className="border-y border-gray-200 py-3">
          {preview.discount > 0 ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#E63832]">{preview.reducedPrice || preview.price}€</span>
              <span className="text-sm text-gray-400 line-through">{preview.price || 0}€</span>
            </div>
          ) : (
            <span className="text-2xl font-bold text-gray-900">{preview.price || 0}€</span>
          )}
        </div>
        <OpportunityBodyContent
          title={preview.title}
          resume={preview.resume}
          bodyImageUrl={null}
          contentMode="text"
          className="prose max-w-none text-gray-700"
        />
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button size="sm" className="w-full sm:w-auto bg-[#E63832] hover:bg-[#E63832]/90">Réserver</Button>
          <Button size="sm" variant="outline" className="w-full sm:w-auto">
            <ExternalLink className="w-4 h-4 mr-1" />
            Voir le site
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
