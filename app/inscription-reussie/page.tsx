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
      <Card className="w-full max-w-2xl">
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
            Un email de confirmation vous a été envoyé
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-3 text-blue-900">
              Prochaines étapes :
            </h3>
            <ol className="space-y-3 text-sm text-blue-800">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  <strong>Vérifiez votre boîte email</strong> (y compris vos spams/courrier indésirable)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>
                  <strong>Cliquez sur le lien de confirmation</strong> dans l'email
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>
                  <strong>Connectez-vous</strong> à votre compte
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>
                  <strong>Complétez votre profil</strong> et publiez votre première opportunité
                </span>
              </li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Vous ne recevez pas l&apos;email ?</strong>
            </p>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1 ml-4 list-disc">
              <li>Vérifiez votre dossier spam/courrier indésirable</li>
              <li>Attendez quelques minutes (parfois il y a un délai)</li>
              <li>Vérifiez que l&apos;adresse email est correcte</li>
            </ul>
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
              Retour à l'accueil
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p>
              Besoin d'aide ? Contactez-nous à{' '}
              <a href="mailto:support@scenio.com" className="text-[#E63832] hover:underline">
                support@scenio.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
