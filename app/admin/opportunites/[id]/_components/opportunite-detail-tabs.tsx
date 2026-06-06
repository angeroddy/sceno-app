"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3,
  Building2,
  Contact,
  ExternalLink,
  Eye,
  FileText,
  Info,
  Mail,
  Phone,
  Star,
  Tag,
  TrendingUp,
  Users,
} from "lucide-react"
import { OPPORTUNITY_TYPE_LABELS, type Opportunite, type OpportunityType } from "@/types"
import { OpportunityBodyContent } from "@/components/opportunity/opportunity-body-content"

interface OpportuniteDetailTabsProps {
  opportunite: Opportunite
  stats: { vues: number; reservations: number; revenu: number }
  placesOccupees: number
  pourcentageRemplissage: number
}

/** Onglets de détail (informations, description, contact, statistiques) d'une opportunité côté admin. */
export function OpportuniteDetailTabs({
  opportunite,
  stats,
  placesOccupees,
  pourcentageRemplissage,
}: OpportuniteDetailTabsProps) {
  return (
    <Tabs defaultValue="informations" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6 bg-[#E6DAD0]/50">
        <TabsTrigger value="informations" className="flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span className="hidden sm:inline">Informations</span>
        </TabsTrigger>
        <TabsTrigger value="description" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Description</span>
        </TabsTrigger>
        <TabsTrigger value="contact" className="flex items-center gap-2">
          <Contact className="w-4 h-4" />
          <span className="hidden sm:inline">Contact</span>
        </TabsTrigger>
        <TabsTrigger value="statistiques" className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          <span className="hidden sm:inline">Stats</span>
        </TabsTrigger>
      </TabsList>

      {/* TAB: Informations */}
      <TabsContent value="informations" className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-4 text-gray-900">
            Informations importantes
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
              <div className="bg-white p-2 rounded-lg">
                <Tag className="w-5 h-5 text-[#E63832]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-semibold text-gray-900">
                  {OPPORTUNITY_TYPE_LABELS[opportunite.type as OpportunityType]}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
              <div className="bg-white p-2 rounded-lg">
                <Star className="w-5 h-5 text-[#E63832]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Modèle</p>
                <p className="font-semibold text-gray-900">
                  {opportunite.modele === 'derniere_minute' ? 'Dernière minute' : 'Pré-vente'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
              <div className="bg-white p-2 rounded-lg">
                <Users className="w-5 h-5 text-[#E63832]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Capacité totale</p>
                <p className="font-semibold text-gray-900">
                  {opportunite.nombre_places} place(s)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
              <div className="bg-white p-2 rounded-lg">
                <Building2 className="w-5 h-5 text-[#E63832]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Places disponibles</p>
                <p className="font-semibold text-gray-900">
                  {opportunite.places_restantes} place(s)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Places réservées
            </span>
            <span className="text-sm font-bold text-[#E63832]">
              {placesOccupees} / {opportunite.nombre_places}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-[#E63832] h-3 rounded-full transition-all"
              style={{ width: `${pourcentageRemplissage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {opportunite.places_restantes} place(s) restante(s)
          </p>
        </div>
      </TabsContent>

      {/* TAB: Description */}
      <TabsContent value="description" className="space-y-4">
        <div>
          <h3 className="text-xl font-bold mb-4 text-gray-900">
            Description de l&apos;opportunité
          </h3>
          <OpportunityBodyContent
            title={opportunite.titre}
            resume={opportunite.resume}
            bodyImageUrl={opportunite.contenu_image_url}
            contentMode={opportunite.contenu_mode}
            className="prose max-w-none text-gray-700"
          />
        </div>

        {opportunite.lien_infos && (
          <div className="mt-6">
            <a
              href={opportunite.lien_infos}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#E63832] hover:underline font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Lien vers plus d&apos;informations
            </a>
          </div>
        )}
      </TabsContent>

      {/* TAB: Contact */}
      <TabsContent value="contact" className="space-y-4">
        <div>
          <h3 className="text-xl font-bold mb-4 text-gray-900">
            Informations de contact
          </h3>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
              <Mail className="w-5 h-5 text-[#E63832] flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600 mb-1">Email de contact</p>
                <a
                  href={`mailto:${opportunite.contact_email}`}
                  className="font-medium text-gray-900 hover:text-[#E63832] transition-colors break-words"
                >
                  {opportunite.contact_email}
                </a>
              </div>
            </div>

            {opportunite.contact_telephone && (
              <div className="flex items-start gap-3 p-4 bg-[#F5F0EB] rounded-lg">
                <Phone className="w-5 h-5 text-[#E63832] flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                  <a
                    href={`tel:${opportunite.contact_telephone}`}
                    className="font-medium text-gray-900 hover:text-[#E63832] transition-colors break-words"
                  >
                    {opportunite.contact_telephone}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* TAB: Statistiques */}
      <TabsContent value="statistiques" className="space-y-4">
        <div>
          <h3 className="text-xl font-bold mb-4 text-gray-900">
            Performance de l&apos;opportunité
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">Vues</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">{stats.vues}</p>
              <p className="text-xs text-blue-700 mt-1">Nombre de consultations</p>
            </div>

            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">Réservations</p>
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.reservations}</p>
              <p className="text-xs text-green-700 mt-1">Places réservées</p>
            </div>

            <div className="p-6 bg-[#FEE] border border-red-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-[#E63832]" />
                <p className="text-sm font-medium text-red-900">Revenu</p>
              </div>
              <p className="text-3xl font-bold text-[#E63832]">{stats.revenu.toFixed(2)}€</p>
              <p className="text-xs text-red-700 mt-1">Revenu généré</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Taux de conversion:</strong>{' '}
              {stats.vues > 0 ? ((stats.reservations / stats.vues) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Prix moyen par place:</strong>{' '}
              {stats.reservations > 0 ? (stats.revenu / stats.reservations).toFixed(2) : opportunite.prix_reduit}€
            </p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
