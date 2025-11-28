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
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                 
                        <Image src={logoApp} alt="Logo" height={100} width={100} onClick={() => router.push("/")} className="cursor-pointer"  />
               

                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xl">
                        <ComedianSignupForm />
                    </div>
                </div>
            </div>
            <div className="bg-muted relative hidden lg:block">
                <Image src={mainImg2} width={400} height={400} alt="3d mail" className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"></Image>

            </div>
        </div>
    )
}
