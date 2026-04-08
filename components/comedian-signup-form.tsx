"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { PasswordStrengthPanel } from "@/components/ui/password-strength-panel"
import { Stepper } from "@/components/ui/stepper"
import { Crop, Loader2, RefreshCcw, RotateCcw, RotateCw, Upload } from "lucide-react"
import {
  Field,
  FieldError,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import {
  getSignupEmailConflictForProfile,
  type AuthProfileSupabase,
} from "@/app/lib/auth-profile"
import {
  clearPendingComedianSignupPhoto,
  savePendingComedianSignupPhoto,
} from "@/app/lib/pending-comedian-photo"
import Cropper from "react-easy-crop"
import type { OpportunityType, ComedianGender } from "@/app/types"
import { getCroppedImage } from "@/app/lib/crop-image"
import {
  getAgeFromDate,
  isPastOrToday,
  isStrongEnoughPassword,
  isValidEmail,
  isValidUrl,
  normalizeEmail,
  normalizeText,
} from "@/app/lib/signup-validation"
import {
  isHandledAuthError,
  translateAuthErrorMessage,
} from "@/app/lib/auth-error-message"
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
  const [rawPhotoSrc, setRawPhotoSrc] = useState<string>("")
  const [isCroppingPhoto, setIsCroppingPhoto] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number
    height: number
    x: number
    y: number
  } | null>(null)
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null)
  const [photoSizeWarning, setPhotoSizeWarning] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [photoUploadWarning, setPhotoUploadWarning] = useState(false)
  const [photoPendingSyncNotice, setPhotoPendingSyncNotice] = useState(false)
  const cropperContainerRef = useRef<HTMLDivElement | null>(null)
  const photoCropAspect = 1
  const photoOutputType = "image/webp" as const
  const photoQuality = 0.9
  const photoMaxSize = 1200

  const getAutoZoomForPhoto = (nextImageInfo: { width: number; height: number }) => {
    const imageAspect = nextImageInfo.width / nextImageInfo.height
    const nextZoom =
      imageAspect > photoCropAspect
        ? imageAspect / photoCropAspect
        : photoCropAspect / imageAspect

    return Math.min(Math.max(nextZoom, 1), 3)
  }

  const getPhotoSizeWarningMessage = (nextImageInfo: { width: number; height: number }) => {
    const container = cropperContainerRef.current
    if (!container) return ""

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    if (containerWidth === 0 || containerHeight === 0) return ""

    const minWidth = Math.round(containerWidth * 2)
    const minHeight = Math.round(containerHeight * 2)

    return nextImageInfo.width < minWidth || nextImageInfo.height < minHeight
      ? "Image un peu petite : le rendu peut paraître flou sur certains écrans."
      : ""
  }

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

  const getComedianErrors = (
    nextPreferences: OpportunityPreferences,
    nextPersonalInfo: PersonalInfo,
    nextAccountInfo: AccountInfo
  ): ComedianErrors => {
    const errors: ComedianErrors = {}

    if (!Object.values(nextPreferences).some(Boolean)) {
      errors.preferences = "Veuillez sélectionner au moins un type d'opportunité."
    }

    if (!normalizeText(nextPersonalInfo.lastName)) errors.lastName = "Le nom est obligatoire."
    if (!normalizeText(nextPersonalInfo.firstName)) errors.firstName = "Le prénom est obligatoire."

    if (!nextPersonalInfo.birthDate) {
      errors.birthDate = "La date de naissance est obligatoire."
    } else if (!isPastOrToday(nextPersonalInfo.birthDate)) {
      errors.birthDate = "La date de naissance n'est pas valide."
    } else {
      const age = getAgeFromDate(nextPersonalInfo.birthDate)
      if (age !== null && age < 13) {
        errors.birthDate = "Vous devez avoir au moins 13 ans pour créer un compte."
      }
    }

    if (!nextPersonalInfo.gender) errors.gender = "Le genre est obligatoire."
    if (!isValidUrl(nextPersonalInfo.demoLink)) errors.demoLink = "Veuillez entrer une URL valide (http ou https)."

    if (!normalizeText(nextAccountInfo.email)) {
      errors.email = "L'adresse e-mail est obligatoire."
    } else if (!isValidEmail(nextAccountInfo.email)) {
      errors.email = "Veuillez entrer une adresse e-mail valide."
    }

    if (!nextAccountInfo.password) {
      errors.password = "Le mot de passe est obligatoire."
    } else if (!isStrongEnoughPassword(nextAccountInfo.password)) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères, avec au moins une lettre et un chiffre."
    }

    if (!nextAccountInfo.confirmPassword) {
      errors.confirmPassword = "Veuillez confirmer votre mot de passe."
    } else if (nextAccountInfo.password !== nextAccountInfo.confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas."
    }

    if (!nextAccountInfo.acceptTerms) {
      errors.acceptTerms = "Vous devez accepter les conditions générales d'utilisation."
    }

    return errors
  }

  const getCurrentStepFields = (): ComedianField[] => {
    if (currentStep === 1) return ["preferences"]
    if (currentStep === 2) return ["lastName", "firstName", "birthDate", "gender", "demoLink"]
    return ["email", "password", "confirmPassword", "acceptTerms"]
  }

  const showFieldError = (field: ComedianField) => Boolean(touchedFields[field] && fieldErrors[field])
  const getFieldClassName = (field: ComedianField) =>
    cn(showFieldError(field) && "border-red-500 focus-visible:ring-red-200")

  useEffect(() => {
    if (!isCroppingPhoto || !cropperContainerRef.current) return
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => {
      if (!imageInfo) return
      setZoom(getAutoZoomForPhoto(imageInfo))
      setPhotoSizeWarning(getPhotoSizeWarningMessage(imageInfo))
    })
    observer.observe(cropperContainerRef.current)
    return () => observer.disconnect()
  }, [imageInfo, isCroppingPhoto])

  useEffect(() => {
    if (!rawPhotoSrc) return

    const img = new window.Image()
    img.onload = () => {
      const nextImageInfo = { width: img.width, height: img.height }
      setImageInfo(nextImageInfo)
      setZoom(getAutoZoomForPhoto(nextImageInfo))
      window.requestAnimationFrame(() => {
        setPhotoSizeWarning(getPhotoSizeWarningMessage(nextImageInfo))
      })
    }
    img.src = rawPhotoSrc
  }, [rawPhotoSrc])

  const resetPhotoCropper = () => {
    setRawPhotoSrc("")
    setIsCroppingPhoto(false)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
    setImageInfo(null)
    setPhotoSizeWarning("")
  }

  const resetPhotoAdjustments = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setRawPhotoSrc(reader.result as string)
        setIsCroppingPhoto(true)
        setRotation(0)
        setZoom(1)
        setCrop({ x: 0, y: 0 })
        setCroppedAreaPixels(null)
        setImageInfo(null)
        setPhotoSizeWarning("")
        setPhotoUploadWarning(false)
        setPhotoPendingSyncNotice(false)
      }
      reader.readAsDataURL(file)
      setError("")
    }
    e.target.value = ""
  }

  const onPhotoCropComplete = (_: unknown, croppedPixels: { width: number; height: number; x: number; y: number }) => {
    setCroppedAreaPixels(croppedPixels)
  }

  const applyPhotoCrop = async () => {
    if (!rawPhotoSrc || !croppedAreaPixels) return

    try {
      const croppedBlob = await getCroppedImage(rawPhotoSrc, croppedAreaPixels, {
        rotation,
        outputType: photoOutputType,
        quality: photoQuality,
        maxSize: photoMaxSize,
      })
      const croppedFile = new File([croppedBlob], `comedien-photo-${Date.now()}.webp`, {
        type: photoOutputType,
      })

      setPersonalInfo((prev) => ({ ...prev, photo: croppedFile }))
      setPhotoPreview(URL.createObjectURL(croppedBlob))
      resetPhotoCropper()
    } catch (cropError) {
      console.error("Erreur recadrage photo:", cropError)
      setError("Impossible de recadrer la photo. Veuillez réessayer.")
    }
  }

  const removePhoto = () => {
    setPersonalInfo((prev) => ({ ...prev, photo: null }))
    setPhotoPreview("")
    setPhotoUploadWarning(false)
    setPhotoPendingSyncNotice(false)
  }

  const validateStep1 = () => {
    const errors = getComedianErrors(preferences, personalInfo, accountInfo)
    setFieldErrors(errors)
    setTouchedFields((prev) => ({ ...prev, preferences: true }))
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

  // Mapper les préférences vers les types de la base de données
  const mapPreferencesToOpportunityTypes = (): OpportunityType[] => {
    const types: OpportunityType[] = []
    if (preferences.stages) types.push('stages_ateliers')
    if (preferences.formations) types.push('ecoles_formations')
    if (preferences.coachs) types.push('coachs_independants')
    if (preferences.services) types.push('communication')
    return types
  }

  const checkEmailConflict = async (supabase: AuthProfileSupabase, email: string): Promise<string | null> => {
    try {
      return await getSignupEmailConflictForProfile(supabase, email, 'comedian')
    } catch (lookupError) {
      console.warn('Pré-vérification comédien impossible:', lookupError)
      return null
    }
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
        setPhotoUploadWarning(false)
        setPhotoPendingSyncNotice(false)

        const emailConflict = await checkEmailConflict(
          supabase as unknown as AuthProfileSupabase,
          normalizedEmail
        )
        if (emailConflict) {
          setError(emailConflict)
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
          if (isHandledAuthError(authError.message)) {
            console.warn("Erreur d'authentification comédien traitée:", authError.message)
          } else {
            console.error("Erreur d'authentification:", authError)
          }
          setError(translateAuthErrorMessage(authError.message, "signup"))
          setIsLoading(false)
          return
        }

        if (!authData.user) {
          setError("Erreur lors de la création du compte.")
          setIsLoading(false)
          return
        }

        // 2. Upload de la photo si présente.
        // Quand la confirmation email est activée, Supabase peut ne pas renvoyer de session ici.
        // Sans session, l'upload Storage côté navigateur échoue souvent (RLS).
        let photoUrl: string | null = null
        if (personalInfo.photo) {
          let pendingSaved = false

          if (authData.session) {
            photoUrl = await uploadPhoto(personalInfo.photo, authData.user.id)
          }

          if (!photoUrl) {
            pendingSaved = await savePendingComedianSignupPhoto(authData.user.id, personalInfo.photo)
          } else {
            clearPendingComedianSignupPhoto(authData.user.id)
          }

          if (pendingSaved) {
            setPhotoPendingSyncNotice(true)
          } else if (!photoUrl) {
            setPhotoUploadWarning(true)
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
            setError("Un compte existe déjà avec cet email.")
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

        {/* Étape 1 : Préférences d'opportunités */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Quels types d&apos;opportunités voulez-vous recevoir ?
              </h2>
              <p className="text-sm text-muted-foreground">
                Sélectionnez au moins une option :
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
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                      <Image
                        src={photoPreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={removePhoto}>
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
              <FieldDescription>
                Ajoutez une photo pour personnaliser votre profil. Vous pourrez la recadrer avant validation.
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
                aria-invalid={showFieldError("confirmPassword")}
                className={getFieldClassName("confirmPassword")}
              />
              {showFieldError("confirmPassword") && <FieldError>{fieldErrors.confirmPassword}</FieldError>}
            </Field>

            <div
              data-testid="accept-terms-card"
              className={cn(
                "flex items-start space-x-3 rounded-lg border bg-accent/30 p-4",
                showFieldError("acceptTerms") && "border-red-500"
              )}
            >
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
                Bienvenue {personalInfo.firstName} ! Vous allez être redirigé vers la page de confirmation.
              </p>
              {photoUploadWarning && (
                <p className="text-sm text-orange-600 mt-4 bg-orange-50 p-3 rounded-md">
                  Note : Votre photo n&apos;a pas pu être uploadée. Vous pourrez l&apos;ajouter plus tard dans vos paramètres.
                </p>
              )}
              {photoPendingSyncNotice && !photoUploadWarning && (
                <p className="text-sm text-blue-700 mt-4 bg-blue-50 p-3 rounded-md">
                  Votre photo sera finalisée automatiquement dès votre première connexion après confirmation de votre adresse e-mail.
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

      {isCroppingPhoto && rawPhotoSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-lg sm:max-h-[88vh]">
            <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Recadrer la photo</h2>
                <span className="rounded-full bg-[#E6DAD0] px-2 py-1 text-xs font-medium text-gray-900">
                  Carré
                </span>
              </div>
              <Button type="button" variant="outline" onClick={resetPhotoCropper}>
                Fermer
              </Button>
            </div>

            <div className="space-y-4 p-5">
              <div
                ref={cropperContainerRef}
                className="relative mx-auto w-full max-w-md overflow-hidden rounded-md border bg-black"
                style={{ aspectRatio: "1 / 1" }}
              >
                <Cropper
                  image={rawPhotoSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={photoCropAspect}
                  cropShape="round"
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onPhotoCropComplete}
                  objectFit="horizontal-cover"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600">Zoom</label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-40"
                    />
                    <span className="text-xs text-gray-500">{zoom.toFixed(1)}x</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600">Rotation</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="outline" onClick={() => setRotation((prev) => prev - 90)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setRotation((prev) => prev + 90)}>
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      step={1}
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="w-40"
                    />
                    <span className="text-xs text-gray-500">{rotation}°</span>
                  </div>
                </div>
              </div>

              {photoSizeWarning && (
                <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
                  {photoSizeWarning}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" className="bg-[#E63832] hover:bg-[#E63832]/90" onClick={applyPhotoCrop}>
                  <Crop className="mr-2 h-4 w-4" />
                  Appliquer le recadrage
                </Button>
                <Button type="button" variant="outline" onClick={resetPhotoAdjustments}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
