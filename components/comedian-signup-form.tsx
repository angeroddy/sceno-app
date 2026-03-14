"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { PasswordStrengthPanel } from "@/components/ui/password-strength-panel"
import { Stepper } from "@/components/ui/stepper"
import { Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import {
  Field,
  FieldError,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import type { OpportunityType, ComedianGender } from "@/app/types"
import {
  getAgeFromDate,
  isPastOrToday,
  isStrongEnoughPassword,
  isValidEmail,
  isValidUrl,
  normalizeEmail,
  normalizeText,
} from "@/app/lib/signup-validation"
import { getDemoComedianData } from "@/app/lib/dev-signup-fixtures"

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
  gender: "" | ComedianGender
  photo: File | null
  demoLink: string
}

interface AccountInfo {
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

type ComedianField =
  | "preferences"
  | "lastName"
  | "firstName"
  | "birthDate"
  | "gender"
  | "demoLink"
  | "email"
  | "password"
  | "confirmPassword"
  | "acceptTerms"

type ComedianErrors = Partial<Record<ComedianField, string>>

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
    gender: "",
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
  const [fieldErrors, setFieldErrors] = useState<ComedianErrors>({})
  const [touchedFields, setTouchedFields] = useState<Partial<Record<ComedianField, boolean>>>({})
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [photoUploadWarning, setPhotoUploadWarning] = useState(false)

  const handlePreferenceChange = (key: keyof OpportunityPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
    setFieldErrors(getComedianErrors(
      {
        ...preferences,
        [key]: !preferences[key],
      },
      personalInfo,
      accountInfo
    ))
    setError("")
  }

  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo((prev) => {
      const next = {
        ...prev,
        [field]: value,
      }
      setFieldErrors(getComedianErrors(preferences, next, accountInfo))
      return next
    })
    setError("")
  }

  const handleAccountInfoChange = (field: keyof AccountInfo, value: string | boolean) => {
    setAccountInfo((prev) => {
      const next = {
        ...prev,
        [field]: value,
      }
      setFieldErrors(getComedianErrors(preferences, personalInfo, next))
      return next
    })
    setError("")
  }

  const markTouched = (field: ComedianField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }))
  }

  const getComedianErrors = (
    nextPreferences: OpportunityPreferences,
    nextPersonalInfo: PersonalInfo,
    nextAccountInfo: AccountInfo
  ): ComedianErrors => {
    const errors: ComedianErrors = {}

    if (!Object.values(nextPreferences).some(Boolean)) {
      errors.preferences = "Veuillez sélectionner au moins un type d'opportunité"
    }

    if (!normalizeText(nextPersonalInfo.lastName)) errors.lastName = "Le nom est obligatoire"
    if (!normalizeText(nextPersonalInfo.firstName)) errors.firstName = "Le prénom est obligatoire"

    if (!nextPersonalInfo.birthDate) {
      errors.birthDate = "La date de naissance est obligatoire"
    } else if (!isPastOrToday(nextPersonalInfo.birthDate)) {
      errors.birthDate = "La date de naissance n'est pas valide"
    } else {
      const age = getAgeFromDate(nextPersonalInfo.birthDate)
      if (age !== null && age < 13) {
        errors.birthDate = "Vous devez avoir au moins 13 ans pour créer un compte"
      }
    }

    if (!nextPersonalInfo.gender) errors.gender = "Le genre est obligatoire"
    if (!isValidUrl(nextPersonalInfo.demoLink)) errors.demoLink = "Veuillez entrer une URL valide (http ou https)"

    if (!normalizeText(nextAccountInfo.email)) {
      errors.email = "L'adresse e-mail est obligatoire"
    } else if (!isValidEmail(nextAccountInfo.email)) {
      errors.email = "Veuillez entrer une adresse e-mail valide"
    }

    if (!nextAccountInfo.password) {
      errors.password = "Le mot de passe est obligatoire"
    } else if (!isStrongEnoughPassword(nextAccountInfo.password)) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères, avec au moins une lettre et un chiffre"
    }

    if (!nextAccountInfo.confirmPassword) {
      errors.confirmPassword = "Veuillez confirmer votre mot de passe"
    } else if (nextAccountInfo.password !== nextAccountInfo.confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas"
    }

    if (!nextAccountInfo.acceptTerms) {
      errors.acceptTerms = "Vous devez accepter les conditions générales d'utilisation"
    }

    return errors
  }

  const getCurrentStepFields = (): ComedianField[] => {
    if (currentStep === 1) return ["preferences"]
    if (currentStep === 2) return ["lastName", "firstName", "birthDate", "gender", "demoLink"]
    return ["email", "password", "confirmPassword", "acceptTerms"]
  }

  const currentStepErrors = getCurrentStepFields()
    .map((field) => getComedianErrors(preferences, personalInfo, accountInfo)[field])
    .filter((message): message is string => Boolean(message))
  const currentStepIsValid = currentStepErrors.length === 0
  const showFieldError = (field: ComedianField) => Boolean(touchedFields[field] && fieldErrors[field])
  const getFieldClassName = (field: ComedianField) =>
    cn(showFieldError(field) && "border-red-500 focus-visible:ring-red-200")

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
    const errors = getComedianErrors(preferences, personalInfo, accountInfo)
    setFieldErrors(errors)
    markTouched("preferences")
    setError("")
    return !errors.preferences
  }

  const validateStep2 = () => {
    const errors = getComedianErrors(preferences, personalInfo, accountInfo)
    setFieldErrors(errors)
    setTouchedFields((prev) => ({
      ...prev,
      lastName: true,
      firstName: true,
      birthDate: true,
      gender: true,
      demoLink: true,
    }))
    const firstError = getCurrentStepFields().map((field) => errors[field]).find(Boolean)
    setError("")
    return !firstError
  }

  const validateStep3 = () => {
    const errors = getComedianErrors(preferences, personalInfo, accountInfo)
    setFieldErrors(errors)
    setTouchedFields((prev) => ({
      ...prev,
      email: true,
      password: true,
      confirmPassword: true,
      acceptTerms: true,
    }))
    const firstError = getCurrentStepFields().map((field) => errors[field]).find(Boolean)
    setError("")
    return !firstError
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

  const checkExistingComedianProfile = async (email: string): Promise<boolean> => {
    const supabase = createBrowserSupabaseClient()
    const { data, error } = await supabase
      .from('comediens')
      .select('id')
      .eq('email', normalizeEmail(email))
      .maybeSingle()

    if (error) {
      console.warn('Pré-vérification comédien impossible:', error)
      return false
    }

    return Boolean(data)
  }

  // Upload de la photo vers Supabase Storage
  const uploadPhoto = async (file: File, userId: string): Promise<string | null> => {
    try {
      const supabase = createBrowserSupabaseClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `comediens/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.warn("Upload photo ignoré:", {
          name: uploadError.name,
          message: uploadError.message,
        })
        // Ne pas bloquer l'inscription si l'upload échoue
        return null
      }

      // Récupérer l'URL publique
      const { data } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.warn("Upload photo ignoré (exception):", error)
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
        const normalizedEmail = normalizeEmail(accountInfo.email)

        const profileAlreadyExists = await checkExistingComedianProfile(normalizedEmail)
        if (profileAlreadyExists) {
          setError("Un compte existe déjà avec cet email")
          setIsLoading(false)
          return
        }

        // 1. Créer l'utilisateur dans Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: accountInfo.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              genre: personalInfo.gender,
            },
          }
        })

        if (authError) {
          console.error('Erreur d\'authentification:', authError)
          setError(translateAuthError(authError.message))
          setIsLoading(false)
          return
        }

        if (!authData.user) {
          setError("Erreur lors de la création du compte")
          setIsLoading(false)
          return
        }

        // 2. Upload de la photo si présente.
        // Quand la confirmation email est activée, Supabase peut ne pas renvoyer de session ici.
        // Sans session, l'upload Storage côté navigateur échoue souvent (RLS).
        let photoUrl: string | null = null
        if (personalInfo.photo) {
          if (!authData.session) {
            setPhotoUploadWarning(true)
          } else {
            photoUrl = await uploadPhoto(personalInfo.photo, authData.user.id)
            // Si l'upload a échoué mais qu'on continue quand même
            if (!photoUrl) {
              setPhotoUploadWarning(true)
            }
          }
        }

        // 3. Créer le profil comédien dans la table
        const profilePayload: Record<string, unknown> = {
          auth_user_id: authData.user.id,
          nom: normalizeText(personalInfo.lastName),
          prenom: normalizeText(personalInfo.firstName),
          email: normalizedEmail,
          photo_url: photoUrl,
          lien_demo: normalizeText(personalInfo.demoLink) || null,
          date_naissance: personalInfo.birthDate,
          preferences_opportunites: mapPreferencesToOpportunityTypes(),
          genre: personalInfo.gender,
        }

        let { error: profileError } = await supabase
          .from('comediens')
          .insert(profilePayload as never)
          .select()

        if (
          profileError &&
          /genre|schema cache|column/i.test(profileError.message)
        ) {
          delete profilePayload.genre
          const retry = await supabase
            .from('comediens')
            .insert(profilePayload as never)
            .select()
          profileError = retry.error
        }

        if (profileError) {
          console.error('Erreur lors de la création du profil:', profileError)
          // Vérifier si c'est une erreur de duplication dans la table comediens
          if (profileError.message.toLowerCase().includes('duplicate') ||
              profileError.message.toLowerCase().includes('unique')) {
            setError("Un compte existe déjà avec cet email")
          } else {
            setError("Le compte a été créé côté authentification, mais le profil comédien n'a pas pu être finalisé. Contactez le support avant de réessayer.")
          }
          setIsLoading(false)
          return
        }

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

  const fillWithDevData = () => {
    const fixture = getDemoComedianData()
    const nextAccountInfo = {
      ...accountInfo,
      ...fixture.accountInfo,
      email: accountInfo.email,
      password: accountInfo.password,
      confirmPassword: accountInfo.confirmPassword,
    }

    setPreferences(fixture.preferences)
    setPersonalInfo(fixture.personalInfo)
    setAccountInfo(nextAccountInfo)
    setFieldErrors(getComedianErrors(fixture.preferences, fixture.personalInfo, nextAccountInfo))
    setTouchedFields({})
    setError("")
    setCurrentStep(3)
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} noValidate {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-4 text-center mb-6">
          <h1 className="text-2xl font-bold">Inscription Comédien</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Complétez les étapes ci-dessous pour créer votre compte
          </p>
        </div>

        {!isSuccess && (
          <div className="self-end">
            <Button
              type="button"
              variant="outline"
              onClick={fillWithDevData}
              disabled={isLoading}
              className="text-xs h-8"
            >
              Remplir des données test
            </Button>
          </div>
        )}

        {/* Stepper */}
        <Stepper steps={STEPS} currentStep={currentStep} className="mb-8" />

        {!isSuccess && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
              currentStepIsValid
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            )}
          >
            {currentStepIsValid ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              {currentStepIsValid
                ? "Cette étape est complète."
                : `${currentStepErrors.length} point${currentStepErrors.length > 1 ? "s" : ""} à corriger avant de continuer.`}
            </div>
          </div>
        )}

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

            {showFieldError("preferences") && <FieldError>{fieldErrors.preferences}</FieldError>}

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
                onBlur={() => markTouched("lastName")}
                aria-invalid={showFieldError("lastName")}
                className={getFieldClassName("lastName")}
              />
              {showFieldError("lastName") && <FieldError>{fieldErrors.lastName}</FieldError>}
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
                onBlur={() => markTouched("firstName")}
                aria-invalid={showFieldError("firstName")}
                className={getFieldClassName("firstName")}
              />
              {showFieldError("firstName") && <FieldError>{fieldErrors.firstName}</FieldError>}
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
                onBlur={() => markTouched("birthDate")}
                max={new Date().toISOString().split("T")[0]}
                aria-invalid={showFieldError("birthDate")}
                className={getFieldClassName("birthDate")}
              />
              {showFieldError("birthDate") && <FieldError>{fieldErrors.birthDate}</FieldError>}
              <FieldDescription>
                Cette information reste privée
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="gender">
                Genre <span className="text-red-500">*</span>
              </FieldLabel>
              <select
                id="gender"
                value={personalInfo.gender}
                onChange={(e) => handlePersonalInfoChange("gender", e.target.value)}
                onBlur={() => markTouched("gender")}
                aria-invalid={showFieldError("gender")}
                className={cn(
                  "w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm",
                  showFieldError("gender") && "border-red-500 focus-visible:ring-red-200"
                )}
              >
                <option value="" disabled hidden>
                  Sélectionnez un genre
                </option>
                <option value="masculin">Homme / Masculin</option>
                <option value="feminin">Femme / Féminin</option>
                <option value="non_genre">Non genré / Autre / Préfère ne pas préciser</option>
              </select>
              {showFieldError("gender") && <FieldError>{fieldErrors.gender}</FieldError>}
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
                    <Image
                      src={photoPreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized
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
                onBlur={() => markTouched("demoLink")}
                aria-invalid={showFieldError("demoLink")}
                className={getFieldClassName("demoLink")}
              />
              {showFieldError("demoLink") && <FieldError>{fieldErrors.demoLink}</FieldError>}
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
                onBlur={() => markTouched("email")}
                aria-invalid={showFieldError("email")}
                className={getFieldClassName("email")}
              />
              {showFieldError("email") && <FieldError>{fieldErrors.email}</FieldError>}
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
                onBlur={() => markTouched("password")}
                aria-invalid={showFieldError("password")}
                className={getFieldClassName("password")}
              />
              {showFieldError("password") && <FieldError>{fieldErrors.password}</FieldError>}
              <PasswordStrengthPanel password={accountInfo.password} />
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
                onBlur={() => markTouched("confirmPassword")}
                aria-invalid={showFieldError("confirmPassword")}
                className={getFieldClassName("confirmPassword")}
              />
              {showFieldError("confirmPassword") && <FieldError>{fieldErrors.confirmPassword}</FieldError>}
            </Field>

            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-accent/30">
              <Checkbox
                id="acceptTerms"
                checked={accountInfo.acceptTerms}
                onCheckedChange={(checked) => handleAccountInfoChange("acceptTerms", checked as boolean)}
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
                {showFieldError("acceptTerms") && <FieldError>{fieldErrors.acceptTerms}</FieldError>}
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
