"use client"

import { Navbar01 } from "@/components/ui/shadcn-io/navbar-01";
import { Footer } from "@/components/layout/Footer";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, User, SlidersHorizontal } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, userType, logout, loading } = useAuth();
  const router = useRouter();

  // Redirection si non authentifié
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/connexion');
    }
  }, [loading, isAuthenticated, router]);

  // Pendant le chargement initial, afficher un loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F5F0EB] to-white">
        <div className="animate-pulse text-gray-500">Chargement...</div>
      </div>
    );
  }

  // Si pas authentifié (après le chargement), ne rien afficher (la redirection va se faire)
  if (!isAuthenticated) {
    return null;
  }

  // Navigation mobile (cohérente avec les espaces annonceur/admin).
  const mobileNavItems = [
    { href: "/comedien", icon: Home, label: "Accueil" },
    { href: "/comedien/profil", icon: User, label: "Profil" },
    { href: "/comedien/preferences", icon: SlidersHorizontal, label: "Préférences" },
  ];

  return (
    <>
      {/* Navbar partagée - ne se recharge pas lors de la navigation */}
      <div className="relative w-full">
        <Navbar01
          className="bg-[#E6DAD0]"
          isAuthenticated={isAuthenticated}
          userType={userType === 'comedian' ? 'comedian' : 'advertiser'}
          onLogout={logout}
          hideHamburger={true}
        />
      </div>

      {/* Contenu + footer ; padding bas sur mobile pour ne pas passer sous la nav fixe */}
      <div className="pb-20 lg:pb-0">
        {children}

        {/* Footer partagé */}
        <Footer />
      </div>

      {/* Navigation mobile en bas (lg:hidden gérée dans le composant) */}
      <MobileBottomNav items={mobileNavItems} />
    </>
  );
}
