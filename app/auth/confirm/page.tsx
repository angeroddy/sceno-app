"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import Image from "next/image"
import logoApp from '@/app/assets/images/logoApp.png'

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const checkStatus = () => {
      // Vérifier les paramètres de l'URL
      const success = searchParams.get('success')
      const error = searchParams.get('error')

      console.log('[AUTH CONFIRM] Paramètres URL:', { success, error })
      console.log('[AUTH CONFIRM] URL complète:', window.location.href)

      if (success === 'true') {
        // La confirmation a réussi (géré par /auth/callback)
        console.log('[AUTH CONFIRM] ✅ Confirmation réussie')
        setStatus('success')
        setMessage('Votre email a été confirmé avec succès !')

        // Redirection vers le dashboard après 3 secondes
        setTimeout(() => {
          console.log('[AUTH CONFIRM] Redirection vers /dashboard')
          router.push('/dashboard')
        }, 3000)
      } else if (error === 'true') {
        // Une erreur s'est produite
        console.log('[AUTH CONFIRM] ❌ Erreur de confirmation')
        setStatus('error')
        setMessage('Erreur lors de la confirmation. Le lien a peut-être expiré.')
      } else {
        // Pas de paramètres = on attend la confirmation
        console.log('[AUTH CONFIRM] ⏳ En attente...')
        setStatus('loading')
        setMessage('Confirmation en cours...')
      }
    }

    checkStatus()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F0EB] to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src={logoApp} alt="Scenio Logo" height={80} width={80} />
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Confirmation en cours...'}
            {status === 'success' && 'Email confirmé !'}
            {status === 'error' && 'Erreur de confirmation'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Veuillez patienter pendant que nous vérifions votre email'}
            {status === 'success' && 'Votre compte a été activé avec succès'}
            {status === 'error' && 'Nous n\'avons pas pu confirmer votre email'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            {status === 'loading' && (
              <Loader2 className="w-16 h-16 text-[#E63832] animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>

          <p className="text-center text-gray-600">{message}</p>

          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800 text-center">
                Redirection vers votre tableau de bord dans quelques secondes...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">
                  Le lien de confirmation a peut-être expiré ou a déjà été utilisé.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => router.push('/inscription')}
                  className="w-full bg-[#E63832] hover:bg-[#E63832]/90"
                >
                  Créer un nouveau compte
                </Button>
                <Button
                  onClick={() => router.push('/connexion')}
                  variant="outline"
                  className="w-full"
                >
                  Se connecter
                </Button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-[#E63832] hover:bg-[#E63832]/90"
            >
              Aller au tableau de bord
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
