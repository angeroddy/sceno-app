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

export default function Home() {
  // Ajoutez vos images ici - pour l'instant j'utilise mainImg, mais vous pouvez ajouter plus d'images
  const backgroundImages = [
    mainImg,
    mainImg2

  ];

  return (
    <>
      <div className="relative w-full">
        <Navbar01 className="bg-[#E6DAD0]" />
      </div>
      <div className="main-section relative w-full min-h-[500px] sm:min-h-[600px] md:min-h-[700px] lg:h-200 bg-black">
        <ImageCarousel
          images={backgroundImages}
          interval={5000}
        />
        <div className="relative z-10 flex flex-col items-center md:items-start justify-center h-full px-5 sm:px-8 md:ms-10 pt-20 sm:pt-24 md:pt-0">
          <div className="space-y-4 text-center md:text-left">
            <TextAnimate
              animation="fadeIn"
              by="word"
              as="h1"
              className="text-[#E6DAD0] text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[70px] font-bold"
            >
              {`Les meilleures opportunités\npour les comédiens,\nau meilleur prix.`}
            </TextAnimate>

            <TextAnimate
              animation="fadeIn"
              by="word"
              as="p"
              className="text-white text-base sm:text-lg md:text-xl lg:text-2xl xl:text-[25px]"
            >
              {`Recevez les pré-ventes et dernières minutes des meilleures\nformations pour comédiens.`}
            </TextAnimate>
          </div>

          <Button variant="outline" className="cursor-pointer mt-5 bg-[#E63832] text-white rounded-none border-none text-sm sm:text-base md:text-lg px-3 py-2 sm:px-5 sm:py-2.5">Commencer  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
        </div>
      </div>
      <div className="infos-sections mt-10 p-5 flex flex-col justify-center">
        <motion.div
          className="first-item flex flex-col md:flex-row p-5 md:p-10 lg:p-20 gap-4 md:gap-6 lg:gap-8 items-center"
          initial={{ opacity: 0, x: -100 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: false, amount: 0.3 }}
        >
          <motion.div
            className="back-item bg-[#E6DAD0] w-full max-w-[280px] sm:max-w-[320px] md:max-w-[350px] lg:w-[400px] h-auto aspect-square rounded-lg relative flex items-center justify-center"
            initial={{ scale: 0.8, rotate: -10 }}
            whileInView={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: false }}
          >
            <Image src={mail3d} width={400} height={400} alt="3d mail" className="w-full h-auto"></Image>
          </motion.div>
          <motion.div
            className="text-section text-center md:text-left"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: false }}
          >
            <h1 className="font-bold text-2xl sm:text-3xl md:text-3xl lg:text-4xl mb-3">Recevez les offres par mail</h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-[25px] max-w-full md:max-w-md lg:max-w-[500px]">Dès qu&apos;une opportunité correspond à vos critères, vous recevez une notification. Pré-ventes et  dernières minutes, directement dans votre boîte.</p>
          </motion.div>

        </motion.div>
        <motion.div
          className="second-item flex flex-col md:flex-row p-5 md:p-10 lg:p-20 gap-4 md:gap-6 lg:gap-8 md:justify-end items-center"
          initial={{ opacity: 0, x: 100 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: false, amount: 0.3 }}
        >
          <motion.div
            className="text-section text-center md:text-left order-2 md:order-1"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: false }}
          >
            <h1 className="font-bold text-2xl sm:text-3xl md:text-3xl lg:text-4xl mb-3">Stages, Ateliers & autres</h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-[25px] max-w-full md:max-w-md lg:max-w-[500px]">Accédez aux meilleures formations du monde du  théâtre et du cinéma avec des réductions exclusives. Stages, ateliers, cycles, coaching : à vous de jouer.</p>
          </motion.div>

          <motion.div
            className="back-item bg-[#E6DAD0] w-full max-w-[280px] sm:max-w-[320px] md:max-w-[350px] lg:w-[400px] h-auto aspect-square rounded-lg relative flex items-center justify-center order-1 md:order-2"
            initial={{ scale: 0.8, rotate: 10 }}
            whileInView={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: false }}
          >
            <Image src={clap3d} width={400} height={400} alt="3d mail" className="w-full h-auto"></Image>
          </motion.div>

        </motion.div>
        <motion.div
          className="third-item flex flex-col md:flex-row p-5 md:p-10 lg:p-20 gap-4 md:gap-6 lg:gap-8 items-center"
          initial={{ opacity: 0, x: -100 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: false, amount: 0.3 }}
        >
          <motion.div
            className="back-item bg-[#E6DAD0] w-full max-w-[280px] sm:max-w-[320px] md:max-w-[350px] lg:w-[400px] h-auto aspect-square rounded-lg relative flex items-center justify-center"
            initial={{ scale: 0.8, rotate: -10 }}
            whileInView={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: false }}
          >
            <Image src={money3d} width={400} height={400} alt="3d mail" className="w-full h-auto"></Image>
          </motion.div>
          <motion.div
            className="text-section text-center md:text-left"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: false }}
          >
            <h1 className="font-bold text-2xl sm:text-3xl md:text-3xl lg:text-4xl mb-3">Tarifs Avantageux</h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-[25px] max-w-full md:max-w-md lg:max-w-[500px]">Les offres publiées étant principalement des offres de dernière minute ou des préventes, les tarifs sont toujours avantageux pour vous.</p>
          </motion.div>

        </motion.div>

      </div>
      <div className="cta-section p-5 sm:p-8 md:p-12 lg:p-16 xl:p-20">
        <div className="card-cta bg-[#E6DAD0] flex rounded-lg items-center justify-center p-6 sm:p-10 md:p-12 lg:p-16 xl:p-20 flex-col">
          <h1 className="font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-center mb-4">Les bons plans formation pour comédiens, c&apos;est ici</h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-[25px] text-center max-w-3xl">Comédiens, inscrivez-vous pour recevoir des offres exclusives à prix réduit. Organismes de formation, publiez vos pré-ventes et dernières minutes pour remplir vos stages. </p>
          <div className="btnGroup gap-3 flex flex-col sm:flex-row mt-6">
            <Button variant="outline" className="cursor-pointer bg-[#E63832] text-white rounded-none border-none text-xs sm:text-sm md:text-base lg:text-lg px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-3.5 whitespace-nowrap">Je m&apos;inscris comme comédien <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
            <Button variant="outline" className="cursor-pointer bg-black text-white rounded-none border-none text-xs sm:text-sm md:text-base lg:text-lg px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-3.5 whitespace-nowrap">Je m&apos;inscris comme Annonceur <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
          </div>
        </div>

      </div>

      <Footer />

    </>
  );
}
