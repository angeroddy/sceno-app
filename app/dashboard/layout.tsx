"use client"

import { Navbar01 } from "@/components/ui/shadcn-io/navbar-01";
import { Footer } from "../components/Footer";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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

      {/* Contenu des pages enfants */}
      {children}

      {/* Footer partagé */}
      <Footer />
    </>
  );
}
