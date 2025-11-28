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
      <div className="main-section relative w-full h-200 bg-black">
        <ImageCarousel
          images={backgroundImages}
          interval={5000}
        />
        <div className="relative z-10 flex flex-col items-start justify-center h-full ms-10">
          <div className="space-y-4">
            <TextAnimate
              animation="fadeIn"
              by="word"
              as="h1"
              className="text-[#E6DAD0] text-[70px] font-bold "
            >
              {`Les meilleures opportunités\npour les comédiens,\nau meilleur prix.`}
            </TextAnimate>

            <TextAnimate
              animation="fadeIn"
              by="word"
              as="p"
              className="text-white text-[25px]"
            >
              {`Recevez les pré-ventes et dernières minutes des meilleures\nformations pour comédiens.`}
            </TextAnimate>
          </div>

          <Button variant="outline" className="cursor-pointer mt-5 bg-[#E63832] text-white rounded-none border-none text-[20px]">Commencer  <ChevronRight className="w-5 h-5" /></Button>
        </div>
      </div>
      <div className="infos-sections mt-10 p-5 flex flex-col justify-center">
        <motion.div
          className="first-item flex p-20 gap-4 items-center"
          initial={{ opacity: 0, x: -100 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: false, amount: 0.3 }}
        >
          <motion.div
            className="back-item bg-[#E6DAD0] w-[400px] h-[350px] rounded-lg relative"
            initial={{ scale: 0.8, rotate: -10 }}
            whileInView={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: false }}
          >
            <Image src={mail3d} width={400} height={400} alt="3d mail" ></Image>
          </motion.div>
          <motion.div
            className="text-section"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: false }}
          >
            <h1 className="font-bold text-4xl">Recevez les offres par mail</h1>
            <p className="text-[25px]" style={{ width: 500 }}>Dès qu'une opportunité correspond à vos critères, vous recevez une notification. Pré-ventes et  dernières minutes, directement dans votre boîte.</p>
          </motion.div>

        </motion.div>
        <motion.div
          className="second-item flex p-20 gap-4 justify-end items-center"
          initial={{ opacity: 0, x: 100 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: false, amount: 0.3 }}
        >
          <motion.div
            className="text-section"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: false }}
          >
            <h1 className="font-bold text-4xl">Stages, Ateliers & autres</h1>
            <p className="text-[25px]" style={{ width: 500 }}>Accédez aux meilleures formations du monde du  théâtre et du cinéma avec des réductions exclusives. Stages, ateliers, cycles, coaching : à vous de jouer.</p>
          </motion.div>

          <motion.div
            className="back-item bg-[#E6DAD0] w-[400px] h-[350px] rounded-lg relative flex items-center"
            initial={{ scale: 0.8, rotate: 10 }}
            whileInView={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: false }}
          >
            <Image src={clap3d} width={400} height={400} alt="3d mail" ></Image>
          </motion.div>

        </motion.div>
        <motion.div
          className="third-item flex p-20 gap-4 items-center"
          initial={{ opacity: 0, x: -100 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: false, amount: 0.3 }}
        >
          <motion.div
            className="back-item bg-[#E6DAD0] w-[400px] h-[350px] rounded-lg relative flex items-center"
            initial={{ scale: 0.8, rotate: -10 }}
            whileInView={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: false }}
          >
            <Image src={money3d} width={400} height={400} alt="3d mail" ></Image>
          </motion.div>
          <motion.div
            className="text-section"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: false }}
          >
            <h1 className="font-bold text-4xl">Tarifs Avantageux</h1>
            <p className="text-[25px]" style={{ width: 500 }}>Les offres publiées étant principalement des offres de dernière minute ou des préventes, les tarifs sont toujours avantageux pour vous.</p>
          </motion.div>

        </motion.div>

      </div>
      <div className="cta-section p-25">
        <div className="card-cta bg-[#E6DAD0] flex rounded-lg items-center justify-center p-20 flex-col">
          <h1 className="font-bold text-4xl">Les bons plans formation pour comédiens, c'est ici</h1>
          <p className="text-[25px] text-center">Comédiens, inscrivez-vous pour recevoir des offres exclusives à prix réduit. <br></br>Organismes de formation, publiez vos pré-ventes et dernières minutes pour remplir vos stages. </p>
          <div className="btnGroup gap-3 flex">
            <Button variant="outline" className="cursor-pointer mt-5 bg-[#E63832] text-white rounded-none border-none text-[20px] p-8">Je m'inscris comme comédien <ChevronRight className="w-5 h-5" /></Button>
            <Button variant="outline" className="cursor-pointer mt-5 bg-black text-white rounded-none border-none text-[20px] p-8">Je m'inscris comme Annonceur <ChevronRight className="w-5 h-5" /></Button>
          </div>
        </div>

      </div>

      <Footer />

    </>
  );
}
