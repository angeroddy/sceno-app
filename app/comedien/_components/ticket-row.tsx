"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, ExternalLink, MapPin, Phone, Ticket } from "lucide-react"
import type { PurchasedTicket } from "../_lib/types"

/** Ligne récapitulative d'une place achetée dans l'onglet « Mes Places ». */
export function TicketRow({ ticket }: { ticket: PurchasedTicket }) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-linear-to-r from-[#E6DAD0]/10 to-white md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-[#E6DAD0] md:h-48 md:w-80 md:shrink-0 lg:h-52 lg:w-96">
          {ticket.image ? (
            <Image
              src={ticket.image}
              alt={ticket.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 320px, 384px"
            />
          ) : (
            <div className="flex h-full min-h-40 items-center justify-center">
              <Ticket className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-[#E63832]/30 text-[#E63832]">
                  Ticket {ticket.receiptReference}
                </Badge>
                <Badge
                  className={
                    ticket.status === "confirmee"
                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                  }
                >
                  {ticket.status === "confirmee" ? "Confirmée" : "Remboursée"}
                </Badge>
              </div>
              <h3 className="font-bold text-lg">{ticket.title}</h3>
              <p className="text-sm text-gray-600">{ticket.organizer}</p>
            </div>
            <div className="shrink-0 text-2xl font-bold text-[#E63832]">{ticket.price}</div>
          </div>

          <div className="flex flex-col gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{ticket.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{ticket.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{ticket.location}</span>
            </div>
          </div>

          {ticket.contactEmail && (
            <div className="text-sm text-gray-600">
              E-mail:{" "}
              <a href={`mailto:${ticket.contactEmail}`} className="text-[#E63832] hover:underline">
                {ticket.contactEmail}
              </a>
            </div>
          )}

          {ticket.contactPhone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4 shrink-0" />
              <a href={`tel:${ticket.contactPhone}`} className="text-[#E63832] hover:underline">
                {ticket.contactPhone}
              </a>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            {ticket.opportunityId && (
              <Link href={`/comedien/opportunites/${ticket.opportunityId}`} className="inline-flex">
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Voir l&apos;annonce
                </Button>
              </Link>
            )}

            <a
              href={`/api/comedien/achats/${ticket.id}/receipt`}
              className="inline-flex items-center justify-center rounded-md bg-[#E63832] px-4 py-2 text-sm font-medium text-white hover:bg-[#E63832]/90"
            >
              Télécharger le reçu PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
