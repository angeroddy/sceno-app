"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Stepper } from "@/components/ui/stepper"
import { Upload, Loader2 } from "lucide-react"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import type { OpportunityType } from "@/app/types"

const STEPS = [
  "Préférences",
  "Informations personnelles",
  "Finalisation"
]

interface OpportunityPreferences {
  stages: boolean
  formations: boolean
  coachs: boolean
  services: boolean
}

interface PersonalInfo {
  lastName: string
  firstName: string
  birthDate: string
  photo: File | null
  demoLink: string
}

interface AccountInfo {
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

export function ComedianSignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [preferences, setPreferences] = useState<OpportunityPreferences>({
    stages: false,
    formations: false,
    coachs: false,
    services: false,
  })
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    lastName: "",
    firstName: "",
    birthDate: "",
    photo: null,
    demoLink: "",
  })
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })
  const [error, setError] = useState<string>("")
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [photoUploadWarning, setPhotoUploadWarning] = useState(false)

  const handlePreferenceChange = (key: keyof OpportunityPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
    setError("")
  }

  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo((prev) => ({
      ...prev,
      [field]: value,
    }))
    setError("")
  }

  const handleAccountInfoChange = (field: keyof AccountInfo, value: string | boolean) => {
    setAccountInfo((prev) => ({
      ...prev,
      [field]: value,
    }))
    setError("")
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPersonalInfo((prev) => ({ ...prev, photo: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setError("")
    }
  }

  const validateStep1 = () => {
    const hasAtLeastOne = Object.values(preferences).some((value) => value)
    if (!hasAtLeastOne) {
      setError("Veuillez sélectionner au moins un type d'opportunité")
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!personalInfo.lastName.trim()) {
      setError("Le nom est obligatoire")
      return false
    }
    if (!personalInfo.firstName.trim()) {
      setError("Le prénom est obligatoire")
      return false
    }
    if (!personalInfo.birthDate) {
      setError("La date de naissance est obligatoire")
      return false
    }
    return true
  }

  const validateStep3 = () => {
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
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3)
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

  // Mapper les préférences vers les types de la base de données
  const mapPreferencesToOpportunityTypes = (): OpportunityType[] => {
    const types: OpportunityType[] = []
    if (preferences.stages) types.push('stages_ateliers')
    if (preferences.formations) types.push('ecoles_formations')
    if (preferences.coachs) types.push('coachs_independants')
    if (preferences.services) types.push('communication')
    return types
  }

  // Upload de la photo vers Supabase Storage
  const uploadPhoto = async (file: File, userId: string): Promise<string | null> => {
    try {
      const supabase = createBrowserSupabaseClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `comediens/${fileName}`

      console.log('Tentative d\'upload de la photo:', { fileName, filePath, fileSize: file.size })

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Erreur upload photo:', {
          message: uploadError.message,
          error: uploadError
        })
        // Ne pas bloquer l'inscription si l'upload échoue
        return null
      }

      console.log('Photo uploadée avec succès:', uploadData)

      // Récupérer l'URL publique
      const { data } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath)

      console.log('URL publique générée:', data.publicUrl)
      return data.publicUrl
    } catch (error) {
      console.error('Erreur lors de l\'upload (catch):', error)
      // Ne pas bloquer l'inscription si l'upload échoue
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === 3 && validateStep3()) {
      setIsLoading(true)
      setError("")

      try {
        const supabase = createBrowserSupabaseClient()

        // 1. Créer l'utilisateur dans Supabase Auth
        console.log('Tentative de création de compte pour:', accountInfo.email)

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

        // 2. Upload de la photo si présente
        let photoUrl: string | null = null
        if (personalInfo.photo) {
          photoUrl = await uploadPhoto(personalInfo.photo, authData.user.id)
          // Si l'upload a échoué mais qu'on continue quand même
          if (!photoUrl) {
            setPhotoUploadWarning(true)
          }
        }

        // 3. Créer le profil comédien dans la table
        console.log('Création du profil comédien...')

        const { data: profileData, error: profileError } = await supabase
          .from('comediens')
          .insert({
            auth_user_id: authData.user.id,
            nom: personalInfo.lastName,
            prenom: personalInfo.firstName,
            email: accountInfo.email,
            photo_url: photoUrl,
            lien_demo: personalInfo.demoLink || null,
            date_naissance: personalInfo.birthDate,
            preferences_opportunites: mapPreferencesToOpportunityTypes(),
          } as any)
          .select()

        if (profileError) {
          console.error('Erreur lors de la création du profil:', profileError)
          // Vérifier si c'est une erreur de duplication dans la table comediens
          if (profileError.message.toLowerCase().includes('duplicate') ||
              profileError.message.toLowerCase().includes('unique')) {
            setError("Un compte existe déjà avec cet email")
          } else {
            setError("Une erreur s'est produite lors de la création du profil. Veuillez réessayer")
          }
          setIsLoading(false)
          return
        }

        console.log('Profil créé avec succès:', profileData)

        // 4. Succès !
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
          <h1 className="text-2xl font-bold">Inscription Comédien</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Complétez les étapes ci-dessous pour créer votre compte
          </p>
        </div>

        {/* Stepper */}
        <Stepper steps={STEPS} currentStep={currentStep} className="mb-8" />

        {/* Étape 1 : Préférences d'opportunités */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Quels types d&apos;opportunités voulez-vous recevoir ?
              </h2>
              <p className="text-sm text-muted-foreground">
                Sélectionnez au moins une option
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <Checkbox
                  id="stages"
                  checked={preferences.stages}
                  onCheckedChange={() => handlePreferenceChange("stages")}
                />
                <div className="flex-1">
                  <label
                    htmlFor="stages"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Stages / Ateliers
                  </label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <Checkbox
                  id="formations"
                  checked={preferences.formations}
                  onCheckedChange={() => handlePreferenceChange("formations")}
                />
                <div className="flex-1">
                  <label
                    htmlFor="formations"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Écoles / Conservatoires / Cours du soir / Cycles de formation
                  </label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <Checkbox
                  id="coachs"
                  checked={preferences.coachs}
                  onCheckedChange={() => handlePreferenceChange("coachs")}
                />
                <div className="flex-1">
                  <label
                    htmlFor="coachs"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Coachs indépendants
                  </label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <Checkbox
                  id="services"
                  checked={preferences.services}
                  onCheckedChange={() => handlePreferenceChange("services")}
                />
                <div className="flex-1">
                  <label
                    htmlFor="services"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Sessions photos / Créateurs de bandes démo / Sites internet
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Étape 2 : Informations personnelles */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Parlez-nous un peu de vous
              </h2>
              <p className="text-sm text-muted-foreground">
                Complétez vos informations personnelles
              </p>
            </div>

            <Field>
              <FieldLabel htmlFor="lastName">
                Nom <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                id="lastName"
                type="text"
                placeholder="Dupont"
                value={personalInfo.lastName}
                onChange={(e) => handlePersonalInfoChange("lastName", e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="firstName">
                Prénom <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                id="firstName"
                type="text"
                placeholder="Jean"
                value={personalInfo.firstName}
                onChange={(e) => handlePersonalInfoChange("firstName", e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="birthDate">
                Date de naissance <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                id="birthDate"
                type="date"
                value={personalInfo.birthDate}
                onChange={(e) => handlePersonalInfoChange("birthDate", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                required
              />
              <FieldDescription>
                Cette information reste privée
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="photo">
                Photo portrait <span className="text-muted-foreground text-xs">(facultatif, recommandé)</span>
              </FieldLabel>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="photo"
                    className="cursor-pointer flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Choisir une photo</span>
                  </label>
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  {personalInfo.photo && (
                    <span className="text-sm text-muted-foreground">
                      {personalInfo.photo.name}
                    </span>
                  )}
                </div>
                {photoPreview && (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              <FieldDescription>
                Ajoutez une photo pour personnaliser votre profil
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="demoLink">
                Lien vers une bande démo ou extrait de jeu <span className="text-muted-foreground text-xs">(facultatif, recommandé)</span>
              </FieldLabel>
              <Input
                id="demoLink"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={personalInfo.demoLink}
                onChange={(e) => handlePersonalInfoChange("demoLink", e.target.value)}
              />
              <FieldDescription>
                Partagez un lien vers votre travail (YouTube, Vimeo, etc.)
              </FieldDescription>
            </Field>

            {error && (
              <div className="text-sm text-red-500 text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Étape 3 : Création du compte */}
        {currentStep === 3 && !isSuccess && (
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
                placeholder="exemple@email.com"
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
                Bienvenue {personalInfo.firstName} ! Vous allez être redirigé vers la page de confirmation..
              </p>
              {photoUploadWarning && (
                <p className="text-sm text-orange-600 mt-4 bg-orange-50 p-3 rounded-md">
                  Note : Votre photo n&apos;a pas pu être uploadée. Vous pourrez l&apos;ajouter plus tard dans vos paramètres.
                </p>
              )}
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
