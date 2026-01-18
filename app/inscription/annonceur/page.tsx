"use client";
import { useRouter } from "next/navigation";
import { AdvertiserSignupForm } from "@/components/advertiser-signup-form"
import Image from "next/image"
import logoApp from '@/app/assets/images/logoApp.png'

export default function InscriptionAnnonceurPage() {
  const router = useRouter();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10 min-h-screen">
        <div className="flex justify-center gap-2 md:justify-start">
          <Image
            src={logoApp}
            alt="Logo"
            height={100}
            width={100}
            onClick={() => router.push("/")}
            className="cursor-pointer"
          />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-xl">
            <AdvertiserSignupForm />
          </div>
        </div>
      </div>
      <div className="hidden lg:flex justify-center items-center bg-[#E6DAD0] min-h-screen sticky top-0">
        <Image
          src={logoApp}
          alt="Logo"
          width={500}
          height={500}
          priority
          style={{ width: 'auto', height: 'auto' }}
        />
      </div>
    </div>
  )
}
