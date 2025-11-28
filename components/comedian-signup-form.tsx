"use client"

import * as React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Stepper } from "@/components/ui/stepper"
import { Upload } from "lucide-react"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentStep === 3 && validateStep3()) {
      // Logique de soumission finale
      console.log("Form submitted", {
        preferences,
        personalInfo,
        accountInfo,
      })
      // Ici vous pouvez envoyer les données au backend
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
                Quels types d'opportunités voulez-vous recevoir ?
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
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Dernière étape !
              </h2>
              <p className="text-sm text-muted-foreground">
                Créez votre compte pour finaliser l'inscription
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
                  J'accepte les conditions générales d'utilisation <span className="text-red-500">*</span>
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

        {/* Navigation buttons */}
        <div className="flex justify-between gap-4 mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex-1"
          >
            Précédent
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNext}
              className="flex-1 bg-[#E63832] hover:bg-[#E63832]/90"
            >
              Suivant
            </Button>
          ) : (
            <Button
              type="submit"
              className="flex-1 bg-[#E63832] hover:bg-[#E63832]/90"
            >
              Créer mon compte
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  )
}
