"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import {
  syncEmailVerificationForAuthUser,
  type AuthProfileSupabase,
} from "@/app/lib/auth-profile"
import {
  isHandledAuthError,
  translateAuthErrorMessage,
} from "@/app/lib/auth-error-message"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validation
    if (!email.trim()) {
      setError("L'adresse e-mail est obligatoire")
      setIsLoading(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Veuillez entrer une adresse e-mail valide")
      setIsLoading(false)
      return
    }

    if (!password) {
      setError("Le mot de passe est obligatoire")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createBrowserSupabaseClient()

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (signInError) {
        if (isHandledAuthError(signInError.message)) {
          console.warn('Erreur de connexion traitée:', signInError.message)
        } else {
          console.error('Erreur de connexion:', signInError)
        }
        setError(translateAuthErrorMessage(signInError.message, 'signin'))
        setIsLoading(false)
        return
      }

      if (!data.user) {
        setError("Erreur lors de la connexion")
        setIsLoading(false)
        return
      }

      const userType = await syncEmailVerificationForAuthUser(
        supabase as unknown as AuthProfileSupabase,
        data.user
      )

      if (userType === 'admin') {
        setIsLoading(false)
        router.push('/admin')
        return
      }

      if (userType === 'comedian') {
        setIsLoading(false)
        router.push('/dashboard')
        return
      }

      if (userType === 'advertiser') {
        setIsLoading(false)
        router.push('/annonceur')
        return
      }

      if (userType === 'deleted') {
        await supabase.auth.signOut().catch(() => undefined)
        setError("Ce compte a été supprimé et ne peut plus être utilisé.")
        setIsLoading(false)
        return
      }

      // Si aucun profil n'est trouvé
      console.error('Aucun profil trouvé pour cet utilisateur')
      setError("Aucun profil trouvé. Veuillez contacter le support.")
      setIsLoading(false)

    } catch (error) {
      console.error('Erreur inattendue:', error)
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.")
      setIsLoading(false)
    }
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} noValidate {...props}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Connexion</h1>
          <p className="text-balance text-sm text-muted-foreground">
            Connectez-vous à votre compte pour accéder à votre espace
          </p>
        </div>

        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="email">
              Adresse e-mail
            </FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError("")
              }}
              required
              disabled={isLoading}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="password">
              Mot de passe
            </FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              required
              disabled={isLoading}
            />
            <FieldDescription>
              <a 
                href="/mot-de-passe-oublie" 
                className="text-sm underline hover:text-primary"
              >
                Mot de passe oublié ?
              </a>
            </FieldDescription>
          </Field>

          {error && (
            <div className="text-sm text-red-500 text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#E63832] hover:bg-[#E63832]/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              "Se connecter"
            )}
          </Button>
        </div>

        <div className="text-center text-sm">
          Pas encore de compte ?{" "}
          <a href="/inscription" className="font-semibold underline underline-offset-4 hover:text-primary">
            Créer un compte
          </a>
        </div>
      </div>
    </form>
  )
}
