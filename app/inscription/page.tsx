"use client";
import { GalleryVerticalEnd, Link } from "lucide-react"
import mainImg2 from '@/app/assets/images/mainImg.webp'
import { useRouter } from "next/navigation";
import { ComedianSignupForm } from "@/components/comedian-signup-form"
import Image from "next/image"
import logoApp from '@/app/assets/images/logoApp.png'

export default function SignupPage() {
    const router = useRouter();

    return (
        <main className="grid min-h-screen lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10 min-h-screen">
                <div className="flex justify-center gap-2 md:justify-start">
                    <Image src={logoApp} alt="Scenio — Retour à l'accueil" height={100} width={100} onClick={() => router.push("/")} className="cursor-pointer" role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') router.push("/") }} />
                </div>
                <div className="flex flex-1 items-center justify-center py-8">
                    <div className="w-full max-w-xl">
                        <ComedianSignupForm />
                    </div>
                </div>
            </div>
            <div className="hidden lg:flex justify-center items-center bg-[#E6DAD0] min-h-screen sticky top-0" aria-hidden="true">
                <Image
                    src={logoApp}
                    alt=""
                    width={500}
                    height={500}
                    priority
                    style={{ width: 'auto', height: 'auto' }}
                />
            </div>

        </main>
    )
}
