"use client";
import { useRouter } from "next/navigation";
import { AdvertiserSignupForm } from "@/components/forms/advertiser-signup-form"
import Image from "next/image"
import logoApp from '@/app/assets/images/logoApp.png'

export default function InscriptionAnnonceurPage() {
  const router = useRouter();

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10 min-h-screen">
        <div className="flex justify-center gap-2 md:justify-start">
          <Image
            src={logoApp}
            alt="formations-artistiques.fr — Retour à l'accueil"
            height={34}
            width={220}
            onClick={() => router.push("/")}
            className="h-auto cursor-pointer"
            role="link"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') router.push("/") }}
          />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-xl">
            <AdvertiserSignupForm />
          </div>
        </div>
      </div>
      <div className="hidden lg:flex justify-center items-center bg-[#E6DAD0] min-h-screen sticky top-0" aria-hidden="true">
        <Image
          src={logoApp}
          alt=""
          width={620}
          height={95}
          priority
          style={{ width: 'auto', height: 'auto' }}
        />
      </div>
    </main>
  )
}
