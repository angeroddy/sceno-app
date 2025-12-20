"use client"

import { useState } from "react";
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
  Heart,
  Clock
} from "lucide-react";
import Image from "next/image";


export default function DashboardPage() {

  const [activeTab, setActiveTab] = useState("opportunities");

  // Données simulées pour les opportunités
  const opportunities = [
    {
      id: 1,
      type: "Stage",
      title: "Stage intensif Comédie",
      organizer: "World Fusion Events",
      location: "Paris, France",
      date: "Dimanche, Janvier 15, 2026",
      time: "14:00 PM",
      price: 99.99,
      interested: 125,
      image: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80",
      category: "Théâtre & Comédie",
      isFavorite: false,
    },
    {
      id: 2,
      type: "Atelier",
      title: "Atelier d'improvisation théâtrale",
      organizer: "Studio Créatif",
      location: "Lyon, France",
      date: "Samedi, Janvier 20, 2026",
      time: "10:00 AM",
      price: 75.00,
      interested: 89,
      image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80",
      category: "Improvisation",
      isFavorite: true,
    },
    {
      id: 3,
      type: "Formation",
      title: "Formation Technique Meisner",
      organizer: "École d'Art Dramatique",
      location: "Marseille, France",
      date: "Lundi, Janvier 25, 2026",
      time: "09:00 AM",
      price: 150.00,
      interested: 67,
      image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
      category: "Cinéma & Acting",
      isFavorite: false,
    },
    {
      id: 4,
      type: "Coaching",
      title: "Coaching personnalisé avec un réalisateur",
      organizer: "Pro Acting Studio",
      location: "Nice, France",
      date: "Mercredi, Janvier 30, 2026",
      time: "15:00 PM",
      price: 200.00,
      interested: 45,
      image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
      category: "Coaching Pro",
      isFavorite: false,
    },
  ];

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
    <div className="min-h-screen bg-gradient-to-b from-[#F5F0EB] to-white">
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
              <TabsTrigger value="opportunities" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Opportunités</span>
              </TabsTrigger>
              <TabsTrigger value="tickets" className="flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                <span>Mes Places</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB: Opportunités */}
            <TabsContent value="opportunities" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {opportunities.map((opportunity) => (
                  <Card key={opportunity.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                    <div className="relative">
                      {/* Date Badge */}
                      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg p-2 shadow-md">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">01</div>
                          <div className="text-xs font-medium text-[#E63832]">JAN</div>
                        </div>
                      </div>

                      {/* Favorite Button */}
                      <button className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-md hover:scale-110 transition-transform">
                        <Heart
                          className={`w-5 h-5 ${opportunity.isFavorite ? 'fill-[#E63832] text-[#E63832]' : 'text-gray-600'}`}
                        />
                      </button>

                      {/* Image */}
                      <div className="relative h-48 overflow-hidden bg-gray-200">
                        <Image
                          src={opportunity.image}
                          alt={opportunity.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        {/* Interested Badge */}
                        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className="w-8 h-8 rounded-full bg-white border-2 border-white flex items-center justify-center text-xs font-bold"
                              >
                                {String.fromCharCode(64 + i)}
                              </div>
                            ))}
                          </div>
                          <span className="text-white text-sm font-medium bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
                            +{opportunity.interested} Intéressés
                          </span>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      {/* Category Badge */}
                      <Badge className="bg-[#E6DAD0] text-gray-900 hover:bg-[#E6DAD0]">
                        {opportunity.category}
                      </Badge>

                      {/* Title */}
                      <h3 className="font-bold text-lg line-clamp-2 min-h-[3.5rem]">
                        {opportunity.title}
                      </h3>

                      {/* Details */}
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{opportunity.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{opportunity.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>{opportunity.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 flex-shrink-0" />
                          <span className="font-semibold text-gray-900">À partir de {opportunity.price}€</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs">Par {opportunity.organizer}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button className="flex-1 bg-[#E63832] hover:bg-[#E63832]/90 rounded-md">
                          Réserver
                        </Button>
                        <Button variant="outline" className="flex-1 rounded-md">
                          Détails
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {opportunities.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">
                    Aucune opportunité disponible pour le moment
                  </p>
                </div>
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
                        className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-r from-[#E6DAD0]/10 to-white"
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
