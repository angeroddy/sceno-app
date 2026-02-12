"use client"

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Ticket,
  MapPin,
  Tag,
  Users,
  Clock,
  Loader2,
  AlertCircle,
  Ban
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { OpportuniteWithAnnonceur, OPPORTUNITY_TYPE_LABELS, OPPORTUNITY_MODEL_LABELS, OpportunityType, OpportunityModel } from "@/app/types";

// Type pour les opportunités affichées dans l'UI
interface DisplayOpportunity {
  id: string;
  annonceurId: string;
  type: string;
  model: OpportunityModel;
  title: string;
  organizer: string;
  location: string;
  date: string;
  dateDay: string;
  dateMonth: string;
  time: string;
  price: number;
  reducedPrice: number;
  discount: number;
  placesLeft: number;
  image: string | null;
  category: string;
  lienInfos: string;
  contactEmail: string;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("opportunities");
  const [opportunities, setOpportunities] = useState<DisplayOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPreferences, setHasPreferences] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [blockingAnnonceurId, setBlockingAnnonceurId] = useState<string | null>(null);

  // Gérer les erreurs d'images
  const handleImageError = (opportunityId: string) => {
    setImageErrors(prev => new Set(prev).add(opportunityId));
  };

  // Récupérer les opportunités depuis l'API
  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/comedien/opportunites?page=1&limit=50');

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des opportunités');
        }

        const data = await response.json();

        // Signaler si les préférences ne sont pas encore configurées (banner info, pas de blocage)
        if (!data.preferences || data.preferences.length === 0) {
          setHasPreferences(false);
        } else {
          setHasPreferences(true);
        }

        // Transformer les données de l'API au format attendu par l'UI
        const transformedOpportunities: DisplayOpportunity[] = data.opportunites.map((opp: OpportuniteWithAnnonceur) => {
          const dateObj = new Date(opp.date_evenement);

          return {
            id: opp.id,
            annonceurId: opp.annonceur_id,
            type: OPPORTUNITY_TYPE_LABELS[opp.type as OpportunityType],
            model: opp.modele as OpportunityModel,
            title: opp.titre,
            organizer: opp.annonceur?.nom_formation || 'Non spécifié',
            location: 'France', // À améliorer si vous avez une localisation dans la base
            date: dateObj.toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            dateDay: dateObj.getDate().toString().padStart(2, '0'),
            dateMonth: dateObj.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase(),
            time: dateObj.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            price: opp.prix_base,
            reducedPrice: opp.prix_reduit,
            discount: opp.reduction_pourcentage,
            placesLeft: opp.places_restantes,
            image: opp.image_url,
            category: OPPORTUNITY_TYPE_LABELS[opp.type as OpportunityType],
            lienInfos: opp.lien_infos,
            contactEmail: opp.contact_email
          };
        });

        setOpportunities(transformedOpportunities);
      } catch (err) {
        console.error('Erreur:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, []);

  const handleBlockAnnonceur = async (annonceurId: string) => {
    try {
      setBlockingAnnonceurId(annonceurId);
      const response = await fetch("/api/comedien/annonceurs-bloques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annonceur_id: annonceurId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors du blocage");
      }

      setOpportunities((prev) => prev.filter((opp) => opp.annonceurId !== annonceurId));
    } catch (err) {
      console.error("Erreur blocage organisme:", err);
      alert("Impossible de bloquer cet organisme pour le moment.");
    } finally {
      setBlockingAnnonceurId(null);
    }
  };

  // Places achetées
  const purchasedTickets = [
    {
      id: 1,
      title: "Stage intensif Comédie",
      date: "15 Jan 2026",
      price: "150€",
      place: "Place A12",
      location: "Paris, France",
      time: "14:00 PM"
    },
    {
      id: 2,
      title: "Atelier improvisation",
      date: "20 Jan 2026",
      price: "80€",
      place: "Place B5",
      location: "Lyon, France",
      time: "10:00 AM"
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-[#F5F0EB] to-white">
        <div className="container mx-auto px-4 py-8 md:py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Espace Comédien
            </h1>
            <p className="text-gray-600 text-lg">
              Découvrez et gérez vos opportunités
            </p>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#E6DAD0]/50">
              <TabsTrigger value="opportunities" className="flex items-center gap-2 cursor-pointer">
                <Calendar className="w-4 h-4" />
                <span>Opportunités</span>
              </TabsTrigger>
              <TabsTrigger value="tickets" className="flex items-center gap-2 cursor-pointer">
                <Ticket className="w-4 h-4" />
                <span>Mes Places</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB: Opportunités */}
            <TabsContent value="opportunities" className="space-y-6">
              {/* État de chargement */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-[#E63832] mb-4" />
                  <p className="text-gray-600">Chargement des opportunités...</p>
                </div>
              )}

              {/* État d'erreur */}
              {error && !loading && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 text-red-800">
                      <AlertCircle className="w-6 h-6 shrink-0" />
                      <div>
                        <h3 className="font-semibold mb-1">Erreur de chargement</h3>
                        <p className="text-sm">{error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Banner léger si préférences non configurées — ne bloque pas l'affichage */}
              {!loading && !error && !hasPreferences && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                      <p className="text-sm text-orange-800">
                        Configurez vos préférences pour personnaliser vos opportunités.
                      </p>
                    </div>
                    <Link href="/dashboard/preferences">
                      <Button size="sm" className="bg-[#E63832] hover:bg-[#E63832]/90 whitespace-nowrap">
                        Configurer
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Affichage des opportunités */}
              {!loading && !error && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {opportunities.map((opportunity) => (
                        <Card
                          key={opportunity.id}
                          className="overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => window.location.href = `/dashboard/opportunites/${opportunity.id}`}
                        >
                          <div className="relative">
                            {/* Date Badge */}
                            <div className="absolute top-4 left-4 z-10 bg-white rounded-lg p-2 shadow-md">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{opportunity.dateDay}</div>
                                <div className="text-xs font-medium text-[#E63832]">{opportunity.dateMonth}</div>
                              </div>
                            </div>

                            {/* Image */}
                            <div className="relative overflow-hidden bg-gray-200" style={{ aspectRatio: "16 / 9" }}>
                              {opportunity.image && !imageErrors.has(opportunity.id) ? (
                                <Image
                                  src={opportunity.image}
                                  alt={opportunity.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                  unoptimized
                                  onError={() => {
                                    console.error('Erreur chargement image:', opportunity.image);
                                    handleImageError(opportunity.id);
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-[#E6DAD0] to-[#F5F0EB]">
                                  <Calendar className="w-16 h-16 text-gray-400" />
                                </div>
                              )}

                              {/* Places restantes Badge */}
                              <div className="absolute bottom-4 left-4 z-10">
                                <span className="text-white text-sm font-medium bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                                  {opportunity.placesLeft} place{opportunity.placesLeft > 1 ? 's' : ''} restante{opportunity.placesLeft > 1 ? 's' : ''}
                                </span>
                              </div>

                              {/* Badge réduction si applicable */}
                              {opportunity.discount > 0 && (
                                <div className="absolute top-4 right-4 z-10">
                                  <span className="text-white text-xs font-bold bg-[#E63832] px-2 py-1 rounded">
                                    -{Math.floor(opportunity.discount)}%
                                  </span>
                                </div>
                              )}

                              <button
                                type="button"
                                title="Mettre cet organisme en liste noire"
                                aria-label="Mettre cet organisme en liste noire"
                                className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-1 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-md hover:bg-red-50 disabled:opacity-60"
                                disabled={blockingAnnonceurId === opportunity.annonceurId}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleBlockAnnonceur(opportunity.annonceurId);
                                }}
                              >
                                {blockingAnnonceurId === opportunity.annonceurId ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Blocage...</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-3.5 w-3.5 cursor-pointer" />
                                
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <CardContent className="p-4 space-y-3">
                            {/* Category Badge */}
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

                            {/* Title */}
                            <h3 className="font-bold text-lg line-clamp-2 min-h-14">
                              {opportunity.title}
                            </h3>

                            {/* Details */}
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

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                              <Link href={`/dashboard/opportunites/${opportunity.id}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" className="w-full">
                                  Voir détails
                                </Button>
                              </Link>
                              <Button className="flex-1 bg-[#E63832] hover:bg-[#E63832]/90" onClick={(e) => e.stopPropagation()}>
                                Réserver
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                    ))}
                  </div>

                  {opportunities.length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg font-medium mb-2">
                        Aucune opportunité disponible pour le moment
                      </p>
                      <p className="text-gray-400 text-sm">
                        Les opportunités correspondant à vos préférences apparaîtront ici une fois validées par nos équipes.
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* TAB: Places Achetées */}
            <TabsContent value="tickets" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {purchasedTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-linear-to-r from-[#E6DAD0]/10 to-white"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-2">
                            <h3 className="font-bold text-lg">{ticket.title}</h3>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {ticket.date}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {ticket.time}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {ticket.location}
                              </div>
                              <div className="flex items-center gap-1">
                                <Ticket className="w-4 h-4" />
                                {ticket.place}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col md:items-end gap-2">
                            <div className="text-2xl font-bold text-[#E63832]">{ticket.price}</div>
                            <Button size="sm" variant="outline">
                              Télécharger le billet
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {purchasedTickets.length === 0 && (
                    <div className="text-center py-12">
                      <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg">
                        Vous n&apos;avez pas encore acheté de places
                      </p>
                      <Button className="mt-4 bg-[#E63832] hover:bg-[#E63832]/90">
                        Découvrir les opportunités
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
    </div>
  );
}
