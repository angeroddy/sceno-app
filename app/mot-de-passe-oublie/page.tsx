"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import {
  isHandledAuthError,
  translateAuthErrorMessage,
} from "@/app/lib/auth-error-message"
import { isStrongEnoughPassword, isValidEmail, normalizeEmail } from "@/app/lib/signup-validation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordStrengthPanel } from "@/components/ui/password-strength-panel"

type ResetMode = "request" | "update"

function ForgotPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<ResetMode>(() => {
    const recoveryFromSearch =
      searchParams.get("mode") === "reset" || searchParams.get("type") === "recovery"

    return recoveryFromSearch ? "update" : "request"
  })
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const recoveryFromSearch = searchParams.get("mode") === "reset" || searchParams.get("type") === "recovery"
    const recoveryFromHash =
      typeof window !== "undefined" &&
      (window.location.hash.includes("type=recovery") || window.location.hash.includes("access_token"))

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && (recoveryFromSearch || recoveryFromHash)) {
        setMode("update")
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && (recoveryFromSearch || recoveryFromHash))) {
        setMode("update")
      }
    })

    return () => subscription.unsubscribe()
  }, [searchParams])

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSuccessMessage("")

    if (!email.trim()) {
      setError("L'adresse e-mail est obligatoire.")
      return
    }

    if (!isValidEmail(email)) {
      setError("Veuillez entrer une adresse e-mail valide.")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createBrowserSupabaseClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
        redirectTo: `${window.location.origin}/mot-de-passe-oublie?mode=reset`,
      })

      if (resetError) {
        if (isHandledAuthError(resetError.message)) {
          console.warn("Erreur demande réinitialisation traitée:", resetError.message)
        } else {
          console.error("Erreur demande réinitialisation:", resetError)
        }
        setError(translateAuthErrorMessage(resetError.message, "password-reset-request"))
        setIsSubmitting(false)
        return
      }

      setSuccessMessage(
        "Si un compte existe avec cette adresse e-mail, un lien de réinitialisation vient d'être envoyé."
      )
      setIsSubmitting(false)
    } catch (submitError) {
      console.error("Erreur inattendue réinitialisation:", submitError)
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.")
      setIsSubmitting(false)
    }
  }

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSuccessMessage("")

    if (!password) {
      setError("Le mot de passe est obligatoire.")
      return
    }

    if (!isStrongEnoughPassword(password)) {
      setError("Le mot de passe doit contenir au moins 8 caractères, avec au moins une lettre et un chiffre.")
      return
    }

    if (!confirmPassword) {
      setError("Veuillez confirmer votre mot de passe.")
      return
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createBrowserSupabaseClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        if (isHandledAuthError(updateError.message)) {
          console.warn("Erreur mise à jour mot de passe traitée:", updateError.message)
        } else {
          console.error("Erreur mise à jour mot de passe:", updateError)
        }
        setError(translateAuthErrorMessage(updateError.message, "password-update"))
        setIsSubmitting(false)
        return
      }

      setSuccessMessage("Votre mot de passe a bien été mis à jour. Vous pouvez maintenant vous connecter.")
      setPassword("")
      setConfirmPassword("")
      setIsSubmitting(false)
    } catch (submitError) {
      console.error("Erreur inattendue mise à jour mot de passe:", submitError)
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F0EB] to-white px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>
              {mode === "request" ? "Mot de passe oublié" : "Nouveau mot de passe"}
            </CardTitle>
            <CardDescription>
              {mode === "request"
                ? "Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation."
                : "Choisissez votre nouveau mot de passe pour finaliser la récupération de votre compte."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-6"
              onSubmit={mode === "request" ? handleRequestReset : handleUpdatePassword}
              noValidate
            >
              <FieldGroup>
                {mode === "request" ? (
                  <Field>
                    <FieldLabel htmlFor="email">Adresse e-mail</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="exemple@email.com"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value)
                        setError("")
                      }}
                      disabled={isSubmitting}
                      required
                    />
                    <FieldDescription>Nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.</FieldDescription>
                  </Field>
                ) : (
                  <div className="space-y-4">
                    <Field>
                      <FieldLabel htmlFor="password">Nouveau mot de passe</FieldLabel>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value)
                          setError("")
                        }}
                        disabled={isSubmitting}
                        required
                      />
                    </Field>

                    <PasswordStrengthPanel password={password} />

                    <Field>
                      <FieldLabel htmlFor="confirmPassword">Confirmer le mot de passe</FieldLabel>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value)
                          setError("")
                        }}
                        disabled={isSubmitting}
                        required
                      />
                    </Field>
                  </div>
                )}

                {error && <FieldError>{error}</FieldError>}

                {successMessage && (
                  <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {successMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#E63832] hover:bg-[#E63832]/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === "request" ? "Envoi en cours..." : "Mise à jour en cours..."}
                    </>
                  ) : mode === "request" ? (
                    "Envoyer le lien"
                  ) : (
                    "Mettre à jour le mot de passe"
                  )}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <Link href="/connexion" className="font-medium underline underline-offset-4 hover:text-primary">
            Retour à la connexion
          </Link>
          {mode === "update" && successMessage && (
            <>
              {" · "}
              <button
                type="button"
                className="font-medium underline underline-offset-4 hover:text-primary"
                onClick={() => router.push("/connexion")}
              >
                Se connecter maintenant
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ForgotPasswordFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F0EB] to-white px-4 py-10">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Mot de passe oublié</CardTitle>
            <CardDescription>Chargement du formulaire…</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-[#E63832]" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
