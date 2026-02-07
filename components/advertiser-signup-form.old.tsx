"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Stepper } from "@/components/ui/stepper"
import { Loader2 } from "lucide-react"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"

const STEPS = [
  "Informations organisme",
  "Finalisation"
]

interface OrganismeInfo {
  nomFormation: string
  nomTitulaireCompte: string
  iban: string
  bicSwift: string
}

interface AccountInfo {
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

export function AdvertiserSignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [organismeInfo, setOrganismeInfo] = useState<OrganismeInfo>({
    nomFormation: "",
    nomTitulaireCompte: "",
    iban: "",
    bicSwift: "",
  })
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleOrganismeInfoChange = (field: keyof OrganismeInfo, value: string) => {
    // Formatage automatique de l'IBAN avec espaces tous les 4 caractères
    if (field === "iban") {
      const cleaned = value.replace(/\s/g, '').toUpperCase()
      const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
      setOrganismeInfo((prev) => ({
        ...prev,
        [field]: formatted,
      }))
    } else if (field === "bicSwift") {
      // Formatage automatique du BIC/SWIFT (majuscules)
      setOrganismeInfo((prev) => ({
        ...prev,
        [field]: value.toUpperCase(),
      }))
    } else {
      setOrganismeInfo((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
    setError("")
  }

  const handleAccountInfoChange = (field: keyof AccountInfo, value: string | boolean) => {
    setAccountInfo((prev) => ({
      ...prev,
      [field]: value,
    }))
    setError("")
  }

  const validateStep1 = () => {
    if (!organismeInfo.nomFormation.trim()) {
      setError("Le nom de l'organisme est obligatoire")
      return false
    }
    if (!organismeInfo.nomTitulaireCompte.trim()) {
      setError("Le nom du titulaire du compte est obligatoire")
      return false
    }
    // Validation IBAN obligatoire
    if (!organismeInfo.iban.trim()) {
      setError("L'IBAN est obligatoire")
      return false
    }
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/
    if (!ibanRegex.test(organismeInfo.iban.replace(/\s/g, ''))) {
      setError("Le format de l'IBAN n'est pas valide (ex: FR76 1234 5678 9012 3456 7890 123)")
      return false
    }
    // Vérifier la longueur minimale (IBAN fait généralement entre 15 et 34 caractères)
    const ibanClean = organismeInfo.iban.replace(/\s/g, '')
    if (ibanClean.length < 15 || ibanClean.length > 34) {
      setError("L'IBAN doit contenir entre 15 et 34 caractères")
      return false
    }
    if (!organismeInfo.bicSwift.trim()) {
      setError("Le code BIC/SWIFT est obligatoire")
      return false
    }
    const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/
    if (!bicRegex.test(organismeInfo.bicSwift)) {
      setError("Le format du code BIC/SWIFT n'est pas valide (8 ou 11 caractères)")
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!accountInfo.email.trim()) {
      setError("L'adresse e-mail est obligatoire")
      return false
    }
    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(accountInfo.email)) {
      setError("Veuillez entrer une adresse e-mail valide")
      return false
    }
    if (!accountInfo.password) {
      setError("Le mot de passe est obligatoire")
      return false
    }
    if (accountInfo.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères")
      return false
    }
    if (accountInfo.password !== accountInfo.confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return false
    }
    if (!accountInfo.acceptTerms) {
      setError("Vous devez accepter les conditions générales d'utilisation")
      return false
    }
    return true
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2)
      }
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    setError("")
  }

  // Traduire les erreurs Supabase en messages user-friendly
  const translateAuthError = (errorMessage: string): string => {
    // Vérifier les erreurs de duplication d'email
    if (errorMessage.toLowerCase().includes('already') ||
        errorMessage.toLowerCase().includes('duplicate') ||
        errorMessage.toLowerCase().includes('exists')) {
      return "Un compte existe déjà avec cet email"
    }

    // Autres erreurs courantes
    if (errorMessage.toLowerCase().includes('invalid email')) {
      return "L'adresse email n'est pas valide"
    }

    if (errorMessage.toLowerCase().includes('password')) {
      return "Le mot de passe ne respecte pas les critères de sécurité"
    }

    if (errorMessage.toLowerCase().includes('network')) {
      return "Erreur de connexion. Veuillez vérifier votre connexion internet"
    }

    // Message par défaut si l'erreur n'est pas reconnue
    return "Une erreur s'est produite lors de l'inscription. Veuillez réessayer"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === 2 && validateStep2()) {
      setIsLoading(true)
      setError("")

      try {
        const supabase = createBrowserSupabaseClient()

        // 1. Créer l'utilisateur dans Supabase Auth
        console.log('Tentative de création de compte annonceur pour:', accountInfo.email)

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: accountInfo.email,
          password: accountInfo.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        })

        if (authError) {
          console.error('Erreur d\'authentification:', authError)
          setError(translateAuthError(authError.message))
          setIsLoading(false)
          return
        }

        console.log('Compte créé:', authData)

        if (!authData.user) {
          setError("Erreur lors de la création du compte")
          setIsLoading(false)
          return
        }

        // 2. Créer le profil annonceur dans la table
        console.log('Création du profil annonceur...')

        const { data: profileData, error: profileError } = await supabase
          .from('annonceurs')
          .insert({
            auth_user_id: authData.user.id,
            nom_formation: organismeInfo.nomFormation,
            email: accountInfo.email,
            iban: organismeInfo.iban.replace(/\s/g, ''), // Enlever les espaces avant de sauvegarder
            nom_titulaire_compte: organismeInfo.nomTitulaireCompte,
            bic_swift: organismeInfo.bicSwift,
          } as any)
          .select()

        if (profileError) {
          console.error('Erreur lors de la création du profil:', profileError)
          // Vérifier si c'est une erreur de duplication dans la table annonceurs
          if (profileError.message.toLowerCase().includes('duplicate') ||
              profileError.message.toLowerCase().includes('unique')) {
            setError("Un compte existe déjà avec cet email")
          } else {
            setError("Une erreur s'est produite lors de la création du profil. Veuillez réessayer")
          }
          setIsLoading(false)
          return
        }

        console.log('Profil annonceur créé avec succès:', profileData)

        // 3. Succès !
        setIsSuccess(true)
        setIsLoading(false)

        // Redirection vers la page de confirmation email après 2 secondes
        setTimeout(() => {
          router.push('/inscription-reussie')
        }, 2000)

      } catch (error) {
        console.error('Erreur inscription:', error)
        setError("Une erreur inattendue s'est produite. Veuillez réessayer.")
        setIsLoading(false)
      }
    }
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-4 text-center mb-6">
          <h1 className="text-2xl font-bold">Inscription Annonceur</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Complétez les étapes ci-dessous pour créer votre compte organisme de formation
          </p>
        </div>

        {/* Stepper */}
        <Stepper steps={STEPS} currentStep={currentStep} className="mb-8" />

        {/* Étape 1 : Informations organisme */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Parlez-nous de votre organisme
              </h2>
              <p className="text-sm text-muted-foreground">
                Informations sur votre structure
              </p>
            </div>

            <Field>
              <FieldLabel htmlFor="nomFormation">
                Nom de l&apos;organisme <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                id="nomFormation"
                type="text"
                placeholder="École de théâtre Paris"
                value={organismeInfo.nomFormation}
                onChange={(e) => handleOrganismeInfoChange("nomFormation", e.target.value)}
                required
              />
              <FieldDescription>
                Nom de votre école, compagnie, atelier ou organisme de formation
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="nomTitulaireCompte">
                Nom du titulaire du compte <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                id="nomTitulaireCompte"
                type="text"
                placeholder="Nom de la personne ou de l'entreprise"
                value={organismeInfo.nomTitulaireCompte}
                onChange={(e) => handleOrganismeInfoChange("nomTitulaireCompte", e.target.value)}
                required
              />
              <FieldDescription>
                Le nom associé au compte bancaire (vous ou votre entreprise)
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="iban">
                IBAN <span className="text-red-500">*</span>
              </FieldLabel>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <Input
                  id="iban"
                  type="text"
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                  value={organismeInfo.iban}
                  onChange={(e) => handleOrganismeInfoChange("iban", e.target.value)}
                  className="pl-12 font-mono text-base tracking-wider bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 focus:border-[#E63832] focus:ring-2 focus:ring-[#E63832]/20 transition-all"
                  required
                  maxLength={34}
                />
              </div>
              <FieldDescription>
                Votre IBAN pour recevoir les paiements des opportunités publiées
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="bicSwift">
                BIC / SWIFT <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                id="bicSwift"
                type="text"
                placeholder="BNPAFRPP"
                value={organismeInfo.bicSwift}
                onChange={(e) => handleOrganismeInfoChange("bicSwift", e.target.value)}
                className="font-mono text-base tracking-wider"
                required
                maxLength={11}
              />
              <FieldDescription>
                Code d&apos;identification de votre banque (8 ou 11 caractères)
              </FieldDescription>
            </Field>

            {error && (
              <div className="text-sm text-red-500 text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Étape 2 : Création du compte */}
        {currentStep === 2 && !isSuccess && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Dernière étape !
              </h2>
              <p className="text-sm text-muted-foreground">
                Créez votre compte pour finaliser l&apos;inscription
              </p>
            </div>

            <Field>
              <FieldLabel htmlFor="email">
                Adresse e-mail <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="contact@ecole-theatre.fr"
                value={accountInfo.email}
                onChange={(e) => handleAccountInfoChange("email", e.target.value)}
                required
              />
              <FieldDescription>
                Nous utiliserons cette adresse pour vous contacter
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="password">
                Mot de passe <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={accountInfo.password}
                onChange={(e) => handleAccountInfoChange("password", e.target.value)}
                required
              />
              <FieldDescription>
                Doit contenir au moins 8 caractères
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">
                Confirmer le mot de passe <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={accountInfo.confirmPassword}
                onChange={(e) => handleAccountInfoChange("confirmPassword", e.target.value)}
                required
              />
            </Field>

            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-accent/30">
              <Checkbox
                id="acceptTerms"
                checked={accountInfo.acceptTerms}
                onCheckedChange={(checked) => handleAccountInfoChange("acceptTerms", checked as boolean)}
                required
              />
              <div className="flex-1">
                <label
                  htmlFor="acceptTerms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  J&apos;accepte les conditions générales d&apos;utilisation <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  En cochant cette case, vous acceptez nos{" "}
                  <a href="#" className="underline hover:text-primary">
                    conditions générales
                  </a>{" "}
                  et notre{" "}
                  <a href="#" className="underline hover:text-primary">
                    politique de confidentialité
                  </a>
                  .
                </p>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Message de succès */}
        {isSuccess && (
          <div className="space-y-6 text-center py-8">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Compte créé avec succès !
              </h2>
              <p className="text-muted-foreground">
                Bienvenue {organismeInfo.nomFormation} ! Vous allez être redirigé vers la page de confirmation...
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        {!isSuccess && (
          <div className="flex justify-between gap-4 mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
              className="flex-1"
            >
              Précédent
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className="flex-1 bg-[#E63832] hover:bg-[#E63832]/90"
              >
                Suivant
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-[#E63832] hover:bg-[#E63832]/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Créer mon compte"
                )}
              </Button>
            )}
          </div>
        )}
      </FieldGroup>
    </form>
  )
}
