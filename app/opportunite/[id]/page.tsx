import { Metadata } from 'next'
import { JsonLd } from '@/components/json-ld'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  Building2,
  Calendar,
  ChevronLeft,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  Tag,
  Ticket,
  Users,
} from 'lucide-react'
import { Footer } from '@/app/components/Footer'
import logoApp from '@/app/assets/images/logoApp2.png'
import { getPublicOpportunityDetails } from '@/app/lib/public-opportunities'
import {
  getAuthenticatedUserContext,
  createServerSupabaseClient,
  type UserType,
} from '@/app/lib/supabase'
import { createAdminSupabaseClient } from '@/app/lib/supabase-admin'
import {
  OPPORTUNITY_MODEL_LABELS,
  OPPORTUNITY_TYPE_LABELS,
  OpportunityType,
} from '@/app/types'
import { SafeRichText } from '@/components/safe-rich-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await getOpportunityReader()
  const opportunite = await getPublicOpportunityDetails(supabase as never, id)

  if (!opportunite) {
    return { title: 'Opportunité introuvable' }
  }

  const title = opportunite.titre
  const description = `${opportunite.titre} — proposée par ${opportunite.annonceur?.nom_formation || 'un organisme partenaire'} sur Scenio. Réservez votre place dès maintenant.`

  return {
    title,
    description,
    alternates: { canonical: `/opportunite/${id}` },
    openGraph: {
      title,
      description,
      type: 'article',
      ...(opportunite.image_url ? { images: [{ url: opportunite.image_url }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(opportunite.image_url ? { images: [opportunite.image_url] } : {}),
    },
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getDashboardHref(userType: UserType, opportunityId: string) {
  switch (userType) {
    case 'admin':
      return '/admin'
    case 'advertiser':
      return '/annonceur'
    case 'comedian':
      return `/dashboard/opportunites/${opportunityId}`
    default:
      return '/connexion'
  }
}

async function getOpportunityReader() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createAdminSupabaseClient()
  }

  return createServerSupabaseClient()
}

export default async function OpportunitePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [{ userType }, supabase] = await Promise.all([
    getAuthenticatedUserContext(),
    getOpportunityReader(),
  ])

  const opportunite = await getPublicOpportunityDetails(supabase as never, id)

  if (!opportunite) {
    notFound()
  }

  const date = new Date(opportunite.date_evenement)
  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(date)
  const timeLabel = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(date)
  const dashboardHref = getDashboardHref(userType, opportunite.id)
  const isSoldOut = opportunite.statut === 'complete' || opportunite.places_restantes <= 0
  const hasDiscount = opportunite.prix_reduit < opportunite.prix_base
  const primaryHref = userType ? dashboardHref : '/inscription'
  const primaryLabel = userType === 'comedian'
    ? 'Voir et reserver dans mon espace'
    : userType
      ? 'Retourner a mon espace'
      : isSoldOut
        ? "Creer un compte pour voir d'autres opportunites"
        : 'Creer un compte pour reserver'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scenio.fr'

  return (
    <div className="min-h-screen bg-linear-to-b from-[#F5F0EB] via-white to-[#F5F0EB]">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: opportunite.titre,
          startDate: opportunite.date_evenement,
          description: opportunite.resume?.replace(/<[^>]*>/g, '').slice(0, 300) || '',
          organizer: {
            '@type': 'Organization',
            name: opportunite.annonceur?.nom_formation || 'Organisme partenaire',
          },
          offers: {
            '@type': 'Offer',
            price: opportunite.prix_reduit,
            priceCurrency: 'EUR',
            availability: isSoldOut
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/InStock',
            url: `${siteUrl}/opportunite/${opportunite.id}`,
          },
          ...(opportunite.image_url ? { image: opportunite.image_url } : {}),
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Accueil',
              item: siteUrl,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: opportunite.titre,
              item: `${siteUrl}/opportunite/${opportunite.id}`,
            },
          ],
        }}
      />
      <header className="border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={logoApp}
              alt="Scenio"
              width={130}
              height={40}
              className="h-auto w-[130px]"
              priority
            />
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/">Accueil</Link>
            </Button>
            {!userType && (
              <Button variant="ghost" asChild>
                <Link href="/connexion">Se connecter</Link>
              </Button>
            )}
            <Button className="bg-[#E63832] text-white hover:bg-[#E63832]/90" asChild>
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <nav aria-label="Fil d'Ariane" className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-[#E63832] transition-colors">
            Accueil
          </Link>
          <ChevronLeft className="h-3 w-3 rotate-180" />
          <span className="truncate text-gray-900 font-medium" aria-current="page">
            {opportunite.titre}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <section className="space-y-6">
            <Card className="overflow-hidden border-0 shadow-xl shadow-black/5">
              <div className="relative aspect-[16/9] bg-linear-to-br from-[#E6DAD0] via-[#F5F0EB] to-white">
                {opportunite.image_url ? (
                  <Image
                    src={opportunite.image_url}
                    alt={opportunite.titre}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 60vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Calendar className="h-20 w-20 text-black/20" />
                  </div>
                )}

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <Badge className="bg-black text-white hover:bg-black">
                    {OPPORTUNITY_TYPE_LABELS[opportunite.type as OpportunityType]}
                  </Badge>
                  <Badge className={isSoldOut ? 'bg-blue-600 text-white hover:bg-blue-600' : 'bg-green-600 text-white hover:bg-green-600'}>
                    {isSoldOut ? 'Complet' : 'Reservable'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-xl shadow-black/5">
              <CardContent className="space-y-8 p-6 md:p-8">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="border-[#E63832]/30 text-[#E63832]">
                      {OPPORTUNITY_MODEL_LABELS[opportunite.modele]}
                    </Badge>
                    {hasDiscount && (
                      <Badge className="bg-[#E63832] text-white hover:bg-[#E63832]">
                        -{Math.floor(opportunite.reduction_pourcentage)}%
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold text-gray-950 md:text-4xl">
                      {opportunite.titre}
                    </h1>
                    <p className="mt-3 text-base leading-7 text-gray-600">
                      Proposee par {opportunite.annonceur?.nom_formation || 'un organisme partenaire'}.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-[#F5F0EB] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2">
                        <Calendar className="h-5 w-5 text-[#E63832]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-semibold text-gray-900">{dateLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#F5F0EB] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2">
                        <Clock className="h-5 w-5 text-[#E63832]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Horaire</p>
                        <p className="font-semibold text-gray-900">{timeLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#F5F0EB] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2">
                        <Users className="h-5 w-5 text-[#E63832]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Places restantes</p>
                        <p className="font-semibold text-gray-900">
                          {opportunite.places_restantes} / {opportunite.nombre_places}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#F5F0EB] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2">
                        <Tag className="h-5 w-5 text-[#E63832]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tarif Scenio</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(opportunite.prix_reduit)}
                          </p>
                          {hasDiscount && (
                            <span className="text-sm text-gray-500 line-through">
                              {formatCurrency(opportunite.prix_base)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-gray-950">Description</h2>
                  <SafeRichText
                    html={opportunite.resume}
                    className="prose prose-neutral max-w-none text-gray-700"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-2xl border border-black/5 bg-white p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-xl bg-[#F5F0EB] p-2">
                        <Building2 className="h-5 w-5 text-[#E63832]" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-950">Organisme</h2>
                    </div>
                    <div className="space-y-3 text-sm text-gray-700">
                      <p className="font-medium text-gray-950">
                        {opportunite.annonceur?.nom_formation || 'Organisme partenaire'}
                      </p>
                      {opportunite.annonceur?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-[#E63832]" />
                          <a href={`mailto:${opportunite.annonceur.email}`} className="hover:underline">
                            {opportunite.annonceur.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/5 bg-white p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-xl bg-[#F5F0EB] p-2">
                        <Ticket className="h-5 w-5 text-[#E63832]" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-950">Contact opportunite</h2>
                    </div>
                    <div className="space-y-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[#E63832]" />
                        <a href={`mailto:${opportunite.contact_email}`} className="hover:underline">
                          {opportunite.contact_email}
                        </a>
                      </div>
                      {opportunite.contact_telephone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-[#E63832]" />
                          <a href={`tel:${opportunite.contact_telephone}`} className="hover:underline">
                            {opportunite.contact_telephone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card className="border-0 shadow-xl shadow-black/5 lg:sticky lg:top-6">
              <CardContent className="space-y-6 p-6">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#E63832]">
                    Reservation
                  </p>
                  <div className="mt-3 flex items-end gap-3">
                    <span className="text-4xl font-bold text-gray-950">
                      {formatCurrency(opportunite.prix_reduit)}
                    </span>
                    {hasDiscount && (
                      <span className="pb-1 text-sm text-gray-500 line-through">
                        {formatCurrency(opportunite.prix_base)}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`rounded-2xl p-4 text-sm ${isSoldOut ? 'bg-blue-50 text-blue-900' : 'bg-green-50 text-green-900'}`}>
                  {isSoldOut
                    ? 'Cette opportunite est actuellement complete. Vous pouvez tout de meme creer un compte pour recevoir les prochaines offres.'
                    : `${opportunite.places_restantes} place(s) restante(s) a reserver via votre espace Scenio.`}
                </div>

                <div className="space-y-3">
                  <Button className="w-full bg-[#E63832] text-white hover:bg-[#E63832]/90" asChild>
                    <Link href={primaryHref}>{primaryLabel}</Link>
                  </Button>

                  {!userType && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/connexion">Se connecter</Link>
                    </Button>
                  )}

                  {opportunite.lien_infos && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={opportunite.lien_infos} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir le site de l&apos;organisme
                      </a>
                    </Button>
                  )}
                </div>

                <div className="space-y-3 border-t border-black/10 pt-5 text-sm text-gray-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Type</span>
                    <span className="font-medium text-gray-950">
                      {OPPORTUNITY_TYPE_LABELS[opportunite.type as OpportunityType]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Modele</span>
                    <span className="font-medium text-gray-950">
                      {OPPORTUNITY_MODEL_LABELS[opportunite.modele]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Disponibilite</span>
                    <span className="font-medium text-gray-950">
                      {isSoldOut ? 'Complete' : `${opportunite.places_restantes} place(s)`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}
