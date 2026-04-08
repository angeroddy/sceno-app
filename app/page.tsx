"use client"

import { Navbar01 } from "@/components/ui/shadcn-io/navbar-01";
import mainImg from '../app/assets/images/mainImg.webp'
import mainImg2 from '../app/assets/images/mainImg2.webp'
import { Button } from "@/components/ui/button";
import { TextAnimate } from "@/components/ui/text-animate";
import { ImageCarousel } from "./components/ImageCarousel";
import { ChevronRight } from "lucide-react"
import { Footer } from "./components/Footer"
import Link from 'next/link'
import { useAuth } from "./hooks/useAuth";

export default function Home() {
  const { isAuthenticated, userType, loading, logout } = useAuth();

  // Ajoutez vos images ici. Pour l'instant, j'utilise mainImg, mais vous pouvez en ajouter d'autres.
  const backgroundImages = [
    mainImg,
    mainImg2

  ];

  return (
    <>
      <nav className="relative w-full" aria-label="Navigation principale">
        <Navbar01
          className="bg-[#E6DAD0]"
          isAuthenticated={isAuthenticated}
          userType={userType === 'comedian' ? 'comedian' : 'advertiser'}
          onLogout={logout}
          loading={loading}
          signInText={isAuthenticated ? "Retourner sur mon espace" : "Se connecter"}
          signInHref={
            isAuthenticated
              ? (userType === 'admin' ? '/admin' : userType === 'comedian' ? '/dashboard' : '/annonceur')
              : '/connexion'
          }
          hideHamburger={true}
        />
      </nav>
      <main>
      <section className="main-section relative w-full min-h-[500px] sm:min-h-[600px] md:min-h-[700px] lg:h-200 bg-black" aria-label="Héro">
        <ImageCarousel
          images={backgroundImages}
          interval={5000}
        />
        <div className="relative z-10 flex flex-col items-center md:items-start justify-center h-full px-5 sm:px-8 md:ms-40 pt-20 sm:pt-24 md:pt-28 lg:pt-32 xl:pt-0">
          <div className="space-y-4 text-center md:text-left">
            <TextAnimate
              animation="fadeIn"
              by="word"
              as="h1"
              className="text-[#E6DAD0] text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[75px] font-bold"
            >
              {`Préventes et dernières\nminutes de toutes vos\nformations préférées.`}
            </TextAnimate>

            <div>
              <TextAnimate
                animation="fadeIn"
                by="word"
                as="p"
                className="text-white text-base sm:text-lg md:text-xl lg:text-2xl xl:text-[25px]"
              >
                {`Stages, ateliers, écoles, sessions photo, prestations en tous genres...\nÀ prix réduits (-25 % minimum) !`}
              </TextAnimate>
            
            </div>
          </div>
          <Link href="/inscription">
            <Button variant="outline" className="cursor-pointer mt-5 bg-[#E63832] text-white border-none text-sm sm:text-base md:text-xl px-7 py-3 sm:px-7 sm:py-3">Commencer <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
          </Link>

        </div>
      </section>
      </main>
      <Footer />

    </>
  );
}
