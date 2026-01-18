"use client"

import { Navbar01 } from "@/components/ui/shadcn-io/navbar-01";
import mainImg from '../app/assets/images/mainImg.webp'
import mainImg2 from '../app/assets/images/mainImg2.webp'
import { Button } from "@/components/ui/button";
import { TextAnimate } from "@/components/ui/text-animate";
import { ImageCarousel } from "./components/ImageCarousel";
import { ChevronRight } from "lucide-react"
import Image from "next/image";
import mail3d from '../app/assets/images/Mail3D.png'
import clap3d from '../app/assets/images/Clap3D.png'
import money3d from '../app/assets/images/money3D.png'
import { motion } from "motion/react"
import { Footer } from "./components/Footer"
import Link from 'next/link'
import { useAuth } from "./hooks/useAuth";

export default function Home() {
  const { isAuthenticated, userType, loading } = useAuth();

  // Ajoutez vos images ici - pour l'instant j'utilise mainImg, mais vous pouvez ajouter plus d'images
  const backgroundImages = [
    mainImg,
    mainImg2

  ];

  return (
    <>
      <div className="relative w-full">
        <Navbar01
          className="bg-[#E6DAD0]"
          isAuthenticated={false}
          loading={loading}
          signInText={isAuthenticated ? "Retourner sur mon espace" : "Se connecter"}
          signInHref={
            isAuthenticated
              ? (userType === 'admin' ? '/admin' : userType === 'comedian' ? '/dashboard' : '/annonceur')
              : '/connexion'
          }
          hideHamburger={true}
        />
      </div>
      <div className="main-section relative w-full min-h-[500px] sm:min-h-[600px] md:min-h-[700px] lg:h-200 bg-black">
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
                {`Stages, ateliers, écoles, sessions photos, presta en tous genres...\nÀ prix réduits (-25 % minimum) !`}
              </TextAnimate>
            
            </div>
          </div>
          <Link href="/inscription">
            <Button variant="outline" className="cursor-pointer mt-5 bg-[#E63832] text-white border-none text-sm sm:text-base md:text-xl px-7 py-3 sm:px-7 sm:py-3">Commencer  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
          </Link>

        </div>
      </div>
   
      <motion.div
        className="cta-section p-5 sm:p-8 md:p-12 lg:p-16 xl:p-20"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="card-cta bg-[#E6DAD0] flex rounded-lg items-center justify-center p-6 sm:p-10 md:p-12 lg:p-16 xl:p-20 flex-col">
          <h1 className="font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-center mb-4">Les bons plans, c&apos;est ici</h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-[25px] text-center max-w-3xl">Comédiennes, comédiens : recevez des offres exclusives au monde du théâtre et du cinéma. Organismes de formation, publiez vos plus chouettes opportunités.

 </p>
          <div className="btnGroup gap-3 flex flex-col sm:flex-row mt-6">
            <Link href="/inscription">
              <Button variant="outline" className="cursor-pointer bg-[#E63832] text-white border-none text-xs sm:text-sm md:text-base lg:text-lg px-3 py-4 sm:px-4 sm:py-3 md:px-6 md:py-3.5 whitespace-nowrap">Je m&apos;inscris comme Comédien <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
            </Link>

            <Link href="/inscription/annonceur">
              <Button variant="outline" className="cursor-pointer bg-black text-white border-none text-xs sm:text-sm md:text-base lg:text-lg px-3 py-4 sm:px-4 sm:py-3 md:px-6 md:py-3.5 whitespace-nowrap">Je m&apos;inscris comme Annonceur <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
            </Link>
          </div>
        </div>
      </motion.div>
      <Footer />

    </>
  );
}
