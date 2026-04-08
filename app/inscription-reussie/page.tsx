"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle } from "lucide-react"
import Image from "next/image"
import logoApp from '@/app/assets/images/logoApp.png'
import { useRouter } from "next/navigation"

export default function InscriptionReussiePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F0EB] to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src={logoApp} alt="Scenio Logo" height={100} width={100} />
          </div>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#E63832] rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl">Inscription réussie !</CardTitle>
          <CardDescription className="text-lg">
            Un e-mail de confirmation vient d&apos;être envoyé à l&apos;adresse indiquée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-[#F5F0EB] p-4 text-sm text-gray-700">
            Vérifiez votre boîte de réception ainsi que vos spams, puis cliquez sur le lien reçu pour activer votre compte. Si le message tarde, patientez quelques minutes avant de vous connecter.
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => router.push('/connexion')}
              className="flex-1 bg-[#E63832] hover:bg-[#E63832]/90"
            >
              Aller à la page de connexion
            </Button>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="flex-1"
            >
              Retour à l&apos;accueil
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500">
            Besoin d&apos;aide ? Contactez-nous à{" "}
            <a href="mailto:support@scenio.com" className="text-[#E63832] hover:underline">
              support@scenio.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
