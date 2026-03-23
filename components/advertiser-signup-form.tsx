"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordStrengthPanel } from "@/components/ui/password-strength-panel"
import { Stepper } from "@/components/ui/stepper"
import { AlertCircle, Building2, CheckCircle2, User } from "lucide-react"
import {
  Field,
  FieldError,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import type {
  Database,
  TypeJuridique,
  InscriptionAnnonceurForm
} from "@/app/types"
import {
  TYPE_JURIDIQUE_LABELS
} from "@/app/types"
import {
  getAgeFromDate,
  isStrongEnoughPassword,
  isValidBic,
  isValidEmail,
  isValidFrenchBusinessId,
  isValidIban,
  isValidPhone,
  isValidPostalCode,
  normalizeBic,
  normalizeBusinessId,
  normalizeCountry,
  normalizeEmail,
  normalizeHumanText,
  normalizePhone,
  normalizeIban,
  normalizePostalCode,
  normalizeText,
} from "@/app/lib/signup-validation"
import { getDemoAdvertiserData } from "@/app/lib/dev-signup-fixtures"

const STEPS = [
  "Type de compte",
  "Informations",
  "Compte et paiement"
]

type AdvertiserField =
  | "type_annonceur"
  | "nom"
  | "prenom"
  | "date_naissance"
  | "adresse_rue"
  | "adresse_code_postal"
  | "adresse_ville"
  | "telephone"
  | "nom_formation"
  | "nom_entreprise"
  | "type_juridique"
  | "numero_legal"
  | "siege_rue"
  | "siege_code_postal"
  | "siege_ville"
  | "representant_nom"
  | "representant_prenom"
  | "representant_telephone"
  | "representant_date_naissance"
  | "representant_adresse_rue"
  | "representant_adresse_code_postal"
  | "representant_adresse_ville"
  | "email"
  | "password"
  | "iban"
  | "nom_titulaire_compte"
  | "bic_swift"

type AdvertiserErrors = Partial<Record<AdvertiserField, string>>

export function AdvertiserSignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<InscriptionAnnonceurForm>>({
    type_annonceur: undefined,
    adresse_pays: 'France',
    pays_entreprise: 'France',
    siege_pays: 'France',
    representant_adresse_pays: 'France',
  })
  const [error, setError] = useState<string>("")
  const [fieldErrors, setFieldErrors] = useState<AdvertiserErrors>({})
  const [touchedFields, setTouchedFields] = useState<Partial<Record<AdvertiserField, boolean>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const updateFormData = (updates: Partial<InscriptionAnnonceurForm>) => {
    setFormData(prev => {
      const next = { ...prev, ...updates }
      setFieldErrors(getAdvertiserErrors(next))
      return next
    })
    setError("")
  }

  const markTouched = (field: AdvertiserField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }))
  }

  const getAdvertiserErrors = (data: Partial<InscriptionAnnonceurForm>): AdvertiserErrors => {
    const errors: AdvertiserErrors = {}

    if (!data.type_annonceur) {
      errors.type_annonceur = "Veuillez sélectionner un type de compte"
    }

    if (data.type_annonceur === 'personne_physique') {
      if (!normalizeText(data.nom)) errors.nom = "Le nom est obligatoire"
      if (!normalizeText(data.prenom)) errors.prenom = "Le prénom est obligatoire"

      if (!data.date_naissance) {
        errors.date_naissance = "La date de naissance est obligatoire"
      } else {
        const age = getAgeFromDate(data.date_naissance)
        if (age === null) {
          errors.date_naissance = "La date de naissance n'est pas valide"
        } else if (age < 18) {
          errors.date_naissance = "Vous devez avoir au moins 18 ans pour vous inscrire"
        }
      }

      if (!normalizeText(data.adresse_rue)) errors.adresse_rue = "L'adresse est obligatoire"
      if (!normalizeText(data.adresse_ville)) errors.adresse_ville = "La ville est obligatoire"

      if (!normalizeText(data.adresse_code_postal)) {
        errors.adresse_code_postal = "Le code postal est obligatoire"
      } else if (!isValidPostalCode(data.adresse_code_postal, data.adresse_pays || 'France')) {
        errors.adresse_code_postal = "Le code postal n'est pas valide pour ce pays"
      }

      if (!normalizeText(data.telephone)) {
        errors.telephone = "Le numéro de téléphone est obligatoire"
      } else if (!isValidPhone(data.telephone)) {
        errors.telephone = "Le numéro de téléphone n'est pas valide"
      }
    }

    if (data.type_annonceur === 'entreprise') {
      if (!normalizeText(data.nom_formation)) errors.nom_formation = "Le nom de l'organisme est obligatoire"
      if (!normalizeText(data.nom_entreprise)) errors.nom_entreprise = "Le nom de l'entreprise est obligatoire"
      if (!data.type_juridique) errors.type_juridique = "Veuillez sélectionner le statut juridique"

      if (!normalizeText(data.numero_legal)) {
        errors.numero_legal = "Le numéro SIREN/SIRET est obligatoire"
      } else if ((data.pays_entreprise || 'France') === 'France' && !isValidFrenchBusinessId(data.numero_legal)) {
        errors.numero_legal = "Le numéro SIREN doit contenir 9 chiffres, le SIRET 14"
      }

      if (!normalizeText(data.siege_rue)) errors.siege_rue = "L'adresse du siège social est obligatoire"
      if (!normalizeText(data.siege_ville)) errors.siege_ville = "La ville du siège social est obligatoire"

      if (!normalizeText(data.siege_code_postal)) {
        errors.siege_code_postal = "Le code postal du siège social est obligatoire"
      } else if (!isValidPostalCode(data.siege_code_postal, data.siege_pays || data.pays_entreprise || 'France')) {
        errors.siege_code_postal = "Le code postal du siège social n'est pas valide"
      }

      if (!normalizeText(data.telephone)) {
        errors.telephone = "Le numéro de téléphone de l'organisme est obligatoire"
      } else if (!isValidPhone(data.telephone)) {
        errors.telephone = "Le numéro de téléphone de l'organisme n'est pas valide"
      }

      if (!normalizeText(data.representant_nom)) errors.representant_nom = "Le nom du représentant légal est obligatoire"
      if (!normalizeText(data.representant_prenom)) errors.representant_prenom = "Le prénom du représentant légal est obligatoire"
      if (!normalizeText(data.representant_telephone)) {
        errors.representant_telephone = "Le numéro de téléphone du représentant légal est obligatoire"
      } else if (!isValidPhone(data.representant_telephone)) {
        errors.representant_telephone = "Le numéro de téléphone du représentant légal n'est pas valide"
      }

      if (!data.representant_date_naissance) {
        errors.representant_date_naissance = "La date de naissance du représentant légal est obligatoire"
      } else {
        const age = getAgeFromDate(data.representant_date_naissance)
        if (age === null) {
          errors.representant_date_naissance = "La date de naissance du représentant légal n'est pas valide"
        } else if (age < 18) {
          errors.representant_date_naissance = "Le représentant légal doit avoir au moins 18 ans"
        }
      }

      if (!normalizeText(data.representant_adresse_rue)) errors.representant_adresse_rue = "L'adresse du représentant légal est obligatoire"
      if (!normalizeText(data.representant_adresse_ville)) errors.representant_adresse_ville = "La ville du représentant légal est obligatoire"

      if (!normalizeText(data.representant_adresse_code_postal)) {
        errors.representant_adresse_code_postal = "Le code postal du représentant légal est obligatoire"
      } else if (!isValidPostalCode(
        data.representant_adresse_code_postal,
        data.representant_adresse_pays || data.siege_pays || data.pays_entreprise || 'France'
      )) {
        errors.representant_adresse_code_postal = "Le code postal du représentant légal n'est pas valide"
      }
    }

    if (!normalizeText(data.email)) {
      errors.email = "L'adresse e-mail est obligatoire"
    } else if (!isValidEmail(data.email)) {
      errors.email = "Veuillez entrer une adresse e-mail valide"
    }

    if (!data.password) {
      errors.password = "Le mot de passe est obligatoire"
    } else if (!isStrongEnoughPassword(data.password)) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères, avec au moins une lettre et un chiffre"
    }

    if (!normalizeText(data.iban)) {
      errors.iban = "L'IBAN est obligatoire"
    } else if (!isValidIban(data.iban)) {
      errors.iban = "Le format de l'IBAN n'est pas valide"
    }

    if (!normalizeText(data.nom_titulaire_compte)) {
      errors.nom_titulaire_compte = "Le nom du titulaire du compte est obligatoire"
    }

    if (!normalizeText(data.bic_swift)) {
      errors.bic_swift = "Le code BIC/SWIFT est obligatoire"
    } else if (!isValidBic(data.bic_swift)) {
      errors.bic_swift = "Le format du code BIC/SWIFT n'est pas valide"
    }

    return errors
  }

  const getCurrentStepFields = (): AdvertiserField[] => {
    if (currentStep === 1) return ["type_annonceur"]
    if (currentStep === 2 && formData.type_annonceur === 'personne_physique') {
      return ["nom", "prenom", "date_naissance", "adresse_rue", "adresse_code_postal", "adresse_ville", "telephone"]
    }
    if (currentStep === 2 && formData.type_annonceur === 'entreprise') {
      return [
        "nom_formation",
        "nom_entreprise",
        "type_juridique",
        "numero_legal",
        "siege_rue",
        "siege_code_postal",
        "siege_ville",
        "telephone",
        "representant_nom",
        "representant_prenom",
        "representant_telephone",
        "representant_date_naissance",
        "representant_adresse_rue",
        "representant_adresse_code_postal",
        "representant_adresse_ville",
      ]
    }
    return ["email", "password", "nom_titulaire_compte", "iban", "bic_swift"]
  }

  const getCurrentStepErrorMessages = (): string[] => {
    const errors = getAdvertiserErrors(formData)
    return getCurrentStepFields()
      .map((field) => errors[field])
      .filter((message): message is string => Boolean(message))
  }

  const showFieldError = (field: AdvertiserField) => Boolean(touchedFields[field] && fieldErrors[field])
  const currentStepErrors = getCurrentStepErrorMessages()
  const currentStepIsValid = currentStepErrors.length === 0
  const getFieldClassName = (field: AdvertiserField) =>
    cn(showFieldError(field) && "border-red-500 focus-visible:ring-red-200")

  // ============================================
  // VALIDATION PAR ÉTAPE
  // ============================================

  const validateStep1 = (): boolean => {
    const nextErrors = getAdvertiserErrors(formData)
    setFieldErrors(nextErrors)
    markTouched("type_annonceur")
    setError("")
    return !nextErrors.type_annonceur
  }

  const validateStep2 = (): boolean => {
    const nextErrors = getAdvertiserErrors(formData)
    setFieldErrors(nextErrors)
    setTouchedFields((prev) => {
      const next = { ...prev }
      for (const field of getCurrentStepFields()) next[field] = true
      return next
    })
    const firstError = getCurrentStepFields().map((field) => nextErrors[field]).find(Boolean)
    setError("")
    return !firstError
  }

  const validateStep3 = (): boolean => {
    const nextErrors = getAdvertiserErrors(formData)
    setFieldErrors(nextErrors)
    setTouchedFields((prev) => {
      const next = { ...prev }
      for (const field of getCurrentStepFields()) next[field] = true
      return next
    })
    const firstError = getCurrentStepFields().map((field) => nextErrors[field]).find(Boolean)
    setError("")
    return !firstError
  }

  // ============================================
  // NAVIGATION ENTRE ÉTAPES
  // ============================================

  const handleNext = () => {
    let isValid = false
    if (currentStep === 1) {
      isValid = validateStep1()
    } else if (currentStep === 2) {
      isValid = validateStep2()
    }

    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError("")
  }

  // ============================================
  // SOUMISSION DU FORMULAIRE
  // ============================================

  const translateAuthError = (errorMessage: string): string => {
    if (errorMessage.toLowerCase().includes('already') ||
        errorMessage.toLowerCase().includes('duplicate') ||
        errorMessage.toLowerCase().includes('exists')) {
      return "Un compte existe déjà avec cet email"
    }
    if (errorMessage.toLowerCase().includes('invalid email')) {
      return "L'adresse email n'est pas valide"
    }
    if (errorMessage.toLowerCase().includes('password')) {
      return "Le mot de passe ne respecte pas les critères de sécurité"
    }
    if (errorMessage.toLowerCase().includes('network')) {
      return "Erreur de connexion. Veuillez vérifier votre connexion internet"
    }
    return "Une erreur s'est produite lors de l'inscription. Veuillez réessayer"
  }

  const checkExistingAdvertiserProfile = async (email: string): Promise<boolean> => {
    const supabase = createBrowserSupabaseClient()
    const { data, error } = await supabase
      .from('annonceurs')
      .select('id')
      .eq('email', normalizeEmail(email))
      .maybeSingle()

    if (error) {
      console.warn('Pré-vérification annonceur impossible:', error)
      return false
    }

    return Boolean(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === 3 && validateStep3()) {
      setIsLoading(true)
      setError("")

      try {
        const supabase = createBrowserSupabaseClient()
        const normalizedEmail = normalizeEmail(formData.email)
        const normalizedPhone = normalizePhone(formData.telephone)

        const profileAlreadyExists = await checkExistingAdvertiserProfile(normalizedEmail)
        if (profileAlreadyExists) {
          setError("Un compte existe déjà avec cet email")
          setIsLoading(false)
          return
        }

        // 1. Créer l'utilisateur dans Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: formData.password!,
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

        if (!authData.user) {
          setError("Erreur lors de la création du compte")
          setIsLoading(false)
          return
        }

        const profileData: Database["public"]["Tables"]["annonceurs"]["Insert"] = {
          auth_user_id: authData.user.id,
          email: normalizedEmail,
          type_annonceur: formData.type_annonceur!,
          telephone: normalizedPhone || null,
          iban: normalizeIban(formData.iban),
          nom_titulaire_compte: normalizeHumanText(formData.nom_titulaire_compte),
          bic_swift: normalizeBic(formData.bic_swift),
          nom_formation: '',
          nom: null,
          prenom: null,
          date_naissance: null,
          adresse_rue: null,
          adresse_ville: null,
          adresse_code_postal: null,
          adresse_pays: null,
          type_piece_identite: null,
          piece_identite_url: null,
          nom_entreprise: null,
          type_juridique: null,
          pays_entreprise: null,
          numero_legal: null,
          siege_rue: null,
          siege_ville: null,
          siege_code_postal: null,
          siege_pays: null,
          representant_nom: null,
          representant_prenom: null,
          representant_telephone: null,
          representant_date_naissance: null,
          representant_adresse_rue: null,
          representant_adresse_ville: null,
          representant_adresse_code_postal: null,
          representant_adresse_pays: null,
          representant_piece_identite_url: null,
          representant_type_piece_identite: null,
        }

        if (formData.type_annonceur === 'personne_physique') {
          // Ajouter les champs personne physique
          profileData.nom = normalizeHumanText(formData.nom) || null
          profileData.prenom = normalizeHumanText(formData.prenom) || null
          profileData.date_naissance = formData.date_naissance || null
          profileData.adresse_rue = normalizeHumanText(formData.adresse_rue) || null
          profileData.adresse_ville = normalizeHumanText(formData.adresse_ville) || null
          profileData.adresse_code_postal = normalizePostalCode(formData.adresse_code_postal, formData.adresse_pays || 'France') || null
          profileData.adresse_pays = normalizeCountry(formData.adresse_pays || 'France') || 'France'
          profileData.nom_formation = `${normalizeHumanText(formData.prenom)} ${normalizeHumanText(formData.nom)}`.trim()
        } else if (formData.type_annonceur === 'entreprise') {
          // Ajouter les champs entreprise
          profileData.nom_formation = normalizeHumanText(formData.nom_formation)
          profileData.nom_entreprise = normalizeHumanText(formData.nom_entreprise) || null
          profileData.type_juridique = formData.type_juridique || null
          profileData.pays_entreprise = normalizeCountry(formData.pays_entreprise || 'France') || 'France'
          profileData.numero_legal = normalizeBusinessId(formData.numero_legal) || null
          profileData.siege_rue = normalizeHumanText(formData.siege_rue) || null
          profileData.siege_ville = normalizeHumanText(formData.siege_ville) || null
          profileData.siege_code_postal = normalizePostalCode(formData.siege_code_postal, formData.siege_pays || formData.pays_entreprise || 'France') || null
          profileData.siege_pays = normalizeCountry(formData.siege_pays || 'France') || 'France'
          profileData.representant_nom = normalizeHumanText(formData.representant_nom) || null
          profileData.representant_prenom = normalizeHumanText(formData.representant_prenom) || null
          profileData.representant_telephone = normalizePhone(formData.representant_telephone) || null
          profileData.representant_date_naissance = formData.representant_date_naissance || null
          profileData.representant_adresse_rue = normalizeHumanText(formData.representant_adresse_rue) || null
          profileData.representant_adresse_ville = normalizeHumanText(formData.representant_adresse_ville) || null
          profileData.representant_adresse_code_postal = normalizePostalCode(
            formData.representant_adresse_code_postal,
            formData.representant_adresse_pays || formData.siege_pays || formData.pays_entreprise || 'France'
          ) || null
          profileData.representant_adresse_pays = normalizeCountry(formData.representant_adresse_pays || 'France') || 'France'
        }

        const { error: profileError } = await supabase
          .from('annonceurs')
          .insert(profileData as unknown as never)

        if (profileError) {
          console.error('Erreur lors de la création du profil:', profileError)
          if (profileError.message.toLowerCase().includes('duplicate') ||
              profileError.message.toLowerCase().includes('unique')) {
            setError("Un compte existe déjà avec cet email")
          } else {
            setError("Le compte a été créé côté authentification, mais le profil annonceur n'a pas pu être finalisé. Contactez le support avant de réessayer.")
          }
          setIsLoading(false)
          return
        }

        // 3. Succès !
        setIsSuccess(true)
        setIsLoading(false)

        // Redirection vers la page de confirmation
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
    const fixture = getDemoAdvertiserData(formData.type_annonceur)
    const nextFormData = {
      ...formData,
      ...fixture,
      email: formData.email || "",
      password: formData.password || "",
    }

    setFormData(nextFormData)
    setFieldErrors(getAdvertiserErrors(nextFormData))
    setTouchedFields({})
    setError("")
    setCurrentStep(3)
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} noValidate {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-4 text-center mb-6">
          <h1 className="text-2xl font-bold">Inscription Annonceur</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Créez votre compte pour publier des opportunités et gérer vos offres
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

        {!isSuccess && currentStep > 1 && (
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
                ? "Tous les champs de cette étape sont valides."
                : `${currentStepErrors.length} champ${currentStepErrors.length > 1 ? "s" : ""} à corriger avant de continuer.`}
            </div>
          </div>
        )}

        {/* ÉTAPE 1 : TYPE DE COMPTE */}
        {currentStep === 1 && !isSuccess && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Quel type de compte souhaitez-vous créer ?
              </h2>
              <p className="text-sm text-muted-foreground">
                Choisissez le type qui correspond à votre situation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option Personne Physique */}
              <button
                type="button"
                onClick={() => updateFormData({ type_annonceur: 'personne_physique' })}
                className={cn(
                  "relative p-6 rounded-lg border-2 transition-all text-left",
                  formData.type_annonceur === 'personne_physique'
                    ? "border-[#E63832] bg-[#E63832]/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-start space-x-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    formData.type_annonceur === 'personne_physique'
                      ? "bg-[#E63832] text-white"
                      : "bg-gray-100 text-gray-600"
                  )}>
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base mb-1">Personne physique</h3>
                    <p className="text-sm text-gray-600">
                      Vous êtes un coach indépendant, un professeur particulier ou vous proposez des services à titre personnel.
                    </p>
                  </div>
                </div>
                {formData.type_annonceur === 'personne_physique' && (
                  <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[#E63832] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>

              {/* Option Entreprise */}
              <button
                type="button"
                onClick={() => updateFormData({ type_annonceur: 'entreprise' })}
                className={cn(
                  "relative p-6 rounded-lg border-2 transition-all text-left",
                  formData.type_annonceur === 'entreprise'
                    ? "border-[#E63832] bg-[#E63832]/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-start space-x-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    formData.type_annonceur === 'entreprise'
                      ? "bg-[#E63832] text-white"
                      : "bg-gray-100 text-gray-600"
                  )}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base mb-1">Entreprise</h3>
                    <p className="text-sm text-gray-600">
                      Vous représentez une école, un organisme de formation, une compagnie de théâtre ou toute autre structure légale.
                    </p>
                  </div>
                </div>
                {formData.type_annonceur === 'entreprise' && (
                  <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[#E63832] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            </div>

            {error && (
              <div className="text-sm text-red-500 text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 2A : PERSONNE PHYSIQUE */}
        {currentStep === 2 && formData.type_annonceur === 'personne_physique' && !isSuccess && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Vos informations personnelles
              </h2>
              <p className="text-sm text-muted-foreground">
                Ces informations sont nécessaires pour vérifier votre compte
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="nom">Nom <span className="text-red-500">*</span></FieldLabel>
                <Input
                  id="nom"
                  type="text"
                  placeholder="Dupont"
                  value={formData.nom || ''}
                  onChange={(e) => updateFormData({ nom: e.target.value })}
                  onBlur={() => markTouched("nom")}
                  aria-invalid={showFieldError("nom")}
                  className={getFieldClassName("nom")}
                  required
                />
                {showFieldError("nom") && <FieldError>{fieldErrors.nom}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="prenom">Prénom <span className="text-red-500">*</span></FieldLabel>
                <Input
                  id="prenom"
                  type="text"
                  placeholder="Jean"
                  value={formData.prenom || ''}
                  onChange={(e) => updateFormData({ prenom: e.target.value })}
                  onBlur={() => markTouched("prenom")}
                  aria-invalid={showFieldError("prenom")}
                  className={getFieldClassName("prenom")}
                  required
                />
                {showFieldError("prenom") && <FieldError>{fieldErrors.prenom}</FieldError>}
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="date_naissance">Date de naissance <span className="text-red-500">*</span></FieldLabel>
              <Input
                id="date_naissance"
                type="date"
                value={formData.date_naissance || ''}
                onChange={(e) => updateFormData({ date_naissance: e.target.value })}
                onBlur={() => markTouched("date_naissance")}
                max={new Date().toISOString().split('T')[0]}
                aria-invalid={showFieldError("date_naissance")}
                className={getFieldClassName("date_naissance")}
                required
              />
              {showFieldError("date_naissance") && <FieldError>{fieldErrors.date_naissance}</FieldError>}
              <FieldDescription>Vous devez avoir au moins 18 ans</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="adresse_rue">Adresse <span className="text-red-500">*</span></FieldLabel>
              <Input
                id="adresse_rue"
                type="text"
                placeholder="123 rue de la République"
                value={formData.adresse_rue || ''}
                onChange={(e) => updateFormData({ adresse_rue: e.target.value })}
                onBlur={() => markTouched("adresse_rue")}
                aria-invalid={showFieldError("adresse_rue")}
                className={getFieldClassName("adresse_rue")}
                required
              />
              {showFieldError("adresse_rue") && <FieldError>{fieldErrors.adresse_rue}</FieldError>}
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="adresse_code_postal">Code postal <span className="text-red-500">*</span></FieldLabel>
                <Input
                  id="adresse_code_postal"
                  type="text"
                  placeholder="75001"
                  value={formData.adresse_code_postal || ''}
                  onChange={(e) => updateFormData({ adresse_code_postal: e.target.value })}
                  onBlur={() => markTouched("adresse_code_postal")}
                  aria-invalid={showFieldError("adresse_code_postal")}
                  className={getFieldClassName("adresse_code_postal")}
                  required
                />
                {showFieldError("adresse_code_postal") && <FieldError>{fieldErrors.adresse_code_postal}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="adresse_ville">Ville <span className="text-red-500">*</span></FieldLabel>
                <Input
                  id="adresse_ville"
                  type="text"
                  placeholder="Paris"
                  value={formData.adresse_ville || ''}
                  onChange={(e) => updateFormData({ adresse_ville: e.target.value })}
                  onBlur={() => markTouched("adresse_ville")}
                  aria-invalid={showFieldError("adresse_ville")}
                  className={getFieldClassName("adresse_ville")}
                  required
                />
                {showFieldError("adresse_ville") && <FieldError>{fieldErrors.adresse_ville}</FieldError>}
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="telephone">Numéro de téléphone <span className="text-red-500">*</span></FieldLabel>
              <Input
                id="telephone"
                type="tel"
                placeholder="+33 6 XX XX XX XX"
                value={formData.telephone || ''}
                onChange={(e) => updateFormData({ telephone: e.target.value })}
                onBlur={() => {
                  markTouched("telephone")
                  updateFormData({ telephone: normalizePhone(formData.telephone) })
                }}
                aria-invalid={showFieldError("telephone")}
                className={getFieldClassName("telephone")}
                required
              />
              {showFieldError("telephone") && <FieldError>{fieldErrors.telephone}</FieldError>}
              <FieldDescription>Utilisez un numéro réel au format international ou national. Evitez les numéros d&apos;exemple.</FieldDescription>
            </Field>


            {error && (
              <div className="text-sm text-red-500 text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 2B : ENTREPRISE */}
        {currentStep === 2 && formData.type_annonceur === 'entreprise' && !isSuccess && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Informations sur votre entreprise
              </h2>
              <p className="text-sm text-muted-foreground">
                Ces informations sont nécessaires pour vérifier votre organisation
              </p>
            </div>

            {/* Informations de l'organisme */}
            <div className="border-b pb-6">
              <h3 className="font-medium mb-4">Informations générales</h3>

              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="nom_formation">Nom de l&apos;organisme <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="nom_formation"
                    type="text"
                    placeholder="École de théâtre Paris"
                    value={formData.nom_formation || ''}
                    onChange={(e) => updateFormData({ nom_formation: e.target.value })}
                    onBlur={() => markTouched("nom_formation")}
                    aria-invalid={showFieldError("nom_formation")}
                    className={getFieldClassName("nom_formation")}
                    required
                  />
                  {showFieldError("nom_formation") && <FieldError>{fieldErrors.nom_formation}</FieldError>}
                  <FieldDescription>Nom affiché publiquement sur la plateforme</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="nom_entreprise">Nom légal de l&apos;entreprise <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="nom_entreprise"
                    type="text"
                    placeholder="École de théâtre Paris SARL"
                    value={formData.nom_entreprise || ''}
                    onChange={(e) => updateFormData({ nom_entreprise: e.target.value })}
                    onBlur={() => markTouched("nom_entreprise")}
                    aria-invalid={showFieldError("nom_entreprise")}
                    className={getFieldClassName("nom_entreprise")}
                    required
                  />
                  {showFieldError("nom_entreprise") && <FieldError>{fieldErrors.nom_entreprise}</FieldError>}
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="type_juridique">Statut juridique <span className="text-red-500">*</span></FieldLabel>
                    <select
                      id="type_juridique"
                      value={formData.type_juridique || ''}
                      onChange={(e) => updateFormData({ type_juridique: e.target.value as TypeJuridique })}
                      onBlur={() => markTouched("type_juridique")}
                      aria-invalid={showFieldError("type_juridique")}
                      className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        showFieldError("type_juridique") && "border-red-500 focus-visible:ring-red-200"
                      )}
                      required
                    >
                      <option value="">Sélectionnez...</option>
                      {Object.entries(TYPE_JURIDIQUE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    {showFieldError("type_juridique") && <FieldError>{fieldErrors.type_juridique}</FieldError>}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="numero_legal">SIREN / SIRET <span className="text-red-500">*</span></FieldLabel>
                    <Input
                      id="numero_legal"
                      type="text"
                      placeholder="123456789"
                      value={formData.numero_legal || ''}
                      onChange={(e) => updateFormData({ numero_legal: e.target.value })}
                      onBlur={() => markTouched("numero_legal")}
                      aria-invalid={showFieldError("numero_legal")}
                      className={getFieldClassName("numero_legal")}
                      required
                    />
                    {showFieldError("numero_legal") && <FieldError>{fieldErrors.numero_legal}</FieldError>}
                    <FieldDescription>9 chiffres (SIREN) ou 14 chiffres (SIRET)</FieldDescription>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="telephone">Téléphone de l&apos;organisme <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="+33 1 XX XX XX XX"
                    value={formData.telephone || ''}
                    onChange={(e) => updateFormData({ telephone: e.target.value })}
                    onBlur={() => {
                      markTouched("telephone")
                      updateFormData({ telephone: normalizePhone(formData.telephone) })
                    }}
                    aria-invalid={showFieldError("telephone")}
                    className={getFieldClassName("telephone")}
                    required
                  />
                  {showFieldError("telephone") && <FieldError>{fieldErrors.telephone}</FieldError>}
                  <FieldDescription>Utilisé comme téléphone de la structure dans Stripe</FieldDescription>
                </Field>
              </div>
            </div>

            {/* Adresse du siège */}
            <div className="border-b pb-6">
              <h3 className="font-medium mb-4">Adresse du siège social</h3>

              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="siege_rue">Adresse <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="siege_rue"
                    type="text"
                    placeholder="45 avenue des Champs-Élysées"
                    value={formData.siege_rue || ''}
                    onChange={(e) => updateFormData({ siege_rue: e.target.value })}
                    onBlur={() => markTouched("siege_rue")}
                    aria-invalid={showFieldError("siege_rue")}
                    className={getFieldClassName("siege_rue")}
                    required
                  />
                  {showFieldError("siege_rue") && <FieldError>{fieldErrors.siege_rue}</FieldError>}
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="siege_code_postal">Code postal <span className="text-red-500">*</span></FieldLabel>
                    <Input
                      id="siege_code_postal"
                      type="text"
                      placeholder="75008"
                      value={formData.siege_code_postal || ''}
                      onChange={(e) => updateFormData({ siege_code_postal: e.target.value })}
                      onBlur={() => markTouched("siege_code_postal")}
                      aria-invalid={showFieldError("siege_code_postal")}
                      className={getFieldClassName("siege_code_postal")}
                      required
                    />
                    {showFieldError("siege_code_postal") && <FieldError>{fieldErrors.siege_code_postal}</FieldError>}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="siege_ville">Ville <span className="text-red-500">*</span></FieldLabel>
                    <Input
                      id="siege_ville"
                      type="text"
                      placeholder="Paris"
                      value={formData.siege_ville || ''}
                      onChange={(e) => updateFormData({ siege_ville: e.target.value })}
                      onBlur={() => markTouched("siege_ville")}
                      aria-invalid={showFieldError("siege_ville")}
                      className={getFieldClassName("siege_ville")}
                      required
                    />
                    {showFieldError("siege_ville") && <FieldError>{fieldErrors.siege_ville}</FieldError>}
                  </Field>
                </div>
              </div>
            </div>

            {/* Représentant légal */}
            <div>
              <h3 className="font-medium mb-4">Représentant légal</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="representant_nom">Nom <span className="text-red-500">*</span></FieldLabel>
                    <Input
                      id="representant_nom"
                      type="text"
                      placeholder="Martin"
                      value={formData.representant_nom || ''}
                      onChange={(e) => updateFormData({ representant_nom: e.target.value })}
                      onBlur={() => markTouched("representant_nom")}
                      aria-invalid={showFieldError("representant_nom")}
                      className={getFieldClassName("representant_nom")}
                      required
                    />
                    {showFieldError("representant_nom") && <FieldError>{fieldErrors.representant_nom}</FieldError>}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="representant_prenom">Prénom <span className="text-red-500">*</span></FieldLabel>
                    <Input
                      id="representant_prenom"
                      type="text"
                      placeholder="Sophie"
                      value={formData.representant_prenom || ''}
                      onChange={(e) => updateFormData({ representant_prenom: e.target.value })}
                      onBlur={() => markTouched("representant_prenom")}
                      aria-invalid={showFieldError("representant_prenom")}
                      className={getFieldClassName("representant_prenom")}
                      required
                    />
                    {showFieldError("representant_prenom") && <FieldError>{fieldErrors.representant_prenom}</FieldError>}
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="representant_telephone">Téléphone du représentant légal <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="representant_telephone"
                    type="tel"
                    placeholder="+33 6 XX XX XX XX"
                    value={formData.representant_telephone || ''}
                    onChange={(e) => updateFormData({ representant_telephone: e.target.value })}
                    onBlur={() => {
                      markTouched("representant_telephone")
                      updateFormData({ representant_telephone: normalizePhone(formData.representant_telephone) })
                    }}
                    aria-invalid={showFieldError("representant_telephone")}
                    className={getFieldClassName("representant_telephone")}
                    required
                  />
                  {showFieldError("representant_telephone") && <FieldError>{fieldErrors.representant_telephone}</FieldError>}
                  <FieldDescription>Numéro personnel utilisé pour la vérification Stripe du représentant</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="representant_date_naissance">Date de naissance <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="representant_date_naissance"
                    type="date"
                    value={formData.representant_date_naissance || ''}
                    onChange={(e) => updateFormData({ representant_date_naissance: e.target.value })}
                    onBlur={() => markTouched("representant_date_naissance")}
                    max={new Date().toISOString().split('T')[0]}
                    aria-invalid={showFieldError("representant_date_naissance")}
                    className={getFieldClassName("representant_date_naissance")}
                    required
                  />
                  {showFieldError("representant_date_naissance") && <FieldError>{fieldErrors.representant_date_naissance}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="representant_adresse_rue">Adresse <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="representant_adresse_rue"
                    type="text"
                    placeholder="10 rue de la Paix"
                    value={formData.representant_adresse_rue || ''}
                    onChange={(e) => updateFormData({ representant_adresse_rue: e.target.value })}
                    onBlur={() => markTouched("representant_adresse_rue")}
                    aria-invalid={showFieldError("representant_adresse_rue")}
                    className={getFieldClassName("representant_adresse_rue")}
                    required
                  />
                  {showFieldError("representant_adresse_rue") && <FieldError>{fieldErrors.representant_adresse_rue}</FieldError>}
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="representant_adresse_code_postal">Code postal <span className="text-red-500">*</span></FieldLabel>
                    <Input
                      id="representant_adresse_code_postal"
                      type="text"
                      placeholder="75002"
                      value={formData.representant_adresse_code_postal || ''}
                      onChange={(e) => updateFormData({ representant_adresse_code_postal: e.target.value })}
                      onBlur={() => markTouched("representant_adresse_code_postal")}
                      aria-invalid={showFieldError("representant_adresse_code_postal")}
                      className={getFieldClassName("representant_adresse_code_postal")}
                      required
                    />
                    {showFieldError("representant_adresse_code_postal") && <FieldError>{fieldErrors.representant_adresse_code_postal}</FieldError>}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="representant_adresse_ville">Ville <span className="text-red-500">*</span></FieldLabel>
                    <Input
                      id="representant_adresse_ville"
                      type="text"
                      placeholder="Paris"
                      value={formData.representant_adresse_ville || ''}
                      onChange={(e) => updateFormData({ representant_adresse_ville: e.target.value })}
                      onBlur={() => markTouched("representant_adresse_ville")}
                      aria-invalid={showFieldError("representant_adresse_ville")}
                      className={getFieldClassName("representant_adresse_ville")}
                      required
                    />
                    {showFieldError("representant_adresse_ville") && <FieldError>{fieldErrors.representant_adresse_ville}</FieldError>}
                  </Field>
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

        {/* ÉTAPE 3 : COMPTE ET PAIEMENT */}
        {currentStep === 3 && !isSuccess && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Compte et informations bancaires
              </h2>
              <p className="text-sm text-muted-foreground">
                Dernière étape pour finaliser votre inscription
              </p>
            </div>

            {/* Compte */}
            <div className="border-b pb-6">
              <h3 className="font-medium mb-4">Créer votre compte</h3>

              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="email">Adresse e-mail <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@exemple.fr"
                    value={formData.email || ''}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                    onBlur={() => markTouched("email")}
                    aria-invalid={showFieldError("email")}
                    className={getFieldClassName("email")}
                    required
                  />
                  {showFieldError("email") && <FieldError>{fieldErrors.email}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Mot de passe <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password || ''}
                    onChange={(e) => updateFormData({ password: e.target.value })}
                    onBlur={() => markTouched("password")}
                    aria-invalid={showFieldError("password")}
                    className={getFieldClassName("password")}
                    required
                  />
                  {showFieldError("password") && <FieldError>{fieldErrors.password}</FieldError>}
                  <PasswordStrengthPanel password={formData.password || ""} />
                </Field>
              </div>
            </div>

            {/* Informations bancaires */}
            <div>
              <h3 className="font-medium mb-4">Informations bancaires</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ces informations sont nécessaires pour recevoir vos paiements
              </p>

              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="nom_titulaire_compte">Nom du titulaire du compte <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="nom_titulaire_compte"
                    type="text"
                    placeholder="Nom de la personne ou de l'entreprise"
                    value={formData.nom_titulaire_compte || ''}
                    onChange={(e) => updateFormData({ nom_titulaire_compte: e.target.value })}
                    onBlur={() => markTouched("nom_titulaire_compte")}
                    aria-invalid={showFieldError("nom_titulaire_compte")}
                    className={getFieldClassName("nom_titulaire_compte")}
                    required
                  />
                  {showFieldError("nom_titulaire_compte") && <FieldError>{fieldErrors.nom_titulaire_compte}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="iban">IBAN <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="iban"
                    type="text"
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                    value={formData.iban || ''}
                    onChange={(e) => {
                      const cleaned = normalizeIban(e.target.value)
                      const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
                      updateFormData({ iban: formatted })
                    }}
                    onBlur={() => markTouched("iban")}
                    className={cn("font-mono", getFieldClassName("iban"))}
                    aria-invalid={showFieldError("iban")}
                    required
                    maxLength={34}
                  />
                  {showFieldError("iban") && <FieldError>{fieldErrors.iban}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="bic_swift">BIC / SWIFT <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="bic_swift"
                    type="text"
                    placeholder="BNPAFRPP"
                    value={formData.bic_swift || ''}
                    onChange={(e) => updateFormData({ bic_swift: normalizeBic(e.target.value) })}
                    onBlur={() => markTouched("bic_swift")}
                    className={cn("font-mono", getFieldClassName("bic_swift"))}
                    aria-invalid={showFieldError("bic_swift")}
                    required
                    maxLength={11}
                  />
                  {showFieldError("bic_swift") && <FieldError>{fieldErrors.bic_swift}</FieldError>}
                  <FieldDescription>8 ou 11 caractères</FieldDescription>
                </Field>
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
                Inscription réussie !
              </h2>
              <p className="text-muted-foreground">
                Votre compte a été créé avec succès. Redirection en cours...
              </p>
            </div>
          </div>
        )}

        {/* Boutons de navigation */}
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
