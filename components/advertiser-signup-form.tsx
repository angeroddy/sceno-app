"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Stepper } from "@/components/ui/stepper"
import { Loader2, Building2, User } from "lucide-react"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { createClient } from "@/app/lib/supabase-client"
import type {
  TypeJuridique,
  TypePieceIdentite,
  InscriptionAnnonceurForm
} from "@/app/types"
import {
  TYPE_JURIDIQUE_LABELS,
  TYPE_PIECE_IDENTITE_LABELS
} from "@/app/types"

const STEPS = [
  "Type de compte",
  "Informations",
  "Compte et paiement"
]

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
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const updateFormData = (updates: Partial<InscriptionAnnonceurForm>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setError("")
  }

  // ============================================
  // VALIDATION PAR ÉTAPE
  // ============================================

  const validateStep1 = (): boolean => {
    if (!formData.type_annonceur) {
      setError("Veuillez sélectionner un type de compte")
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    if (formData.type_annonceur === 'personne_physique') {
      // Validation personne physique
      if (!formData.nom?.trim()) {
        setError("Le nom est obligatoire")
        return false
      }
      if (!formData.prenom?.trim()) {
        setError("Le prénom est obligatoire")
        return false
      }
      if (!formData.date_naissance) {
        setError("La date de naissance est obligatoire")
        return false
      }
      // Vérifier que la personne a au moins 18 ans
      const birthDate = new Date(formData.date_naissance)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (age < 18 || (age === 18 && monthDiff < 0)) {
        setError("Vous devez avoir au moins 18 ans pour vous inscrire")
        return false
      }
      if (!formData.adresse_rue?.trim()) {
        setError("L'adresse est obligatoire")
        return false
      }
      if (!formData.adresse_ville?.trim()) {
        setError("La ville est obligatoire")
        return false
      }
      if (!formData.adresse_code_postal?.trim()) {
        setError("Le code postal est obligatoire")
        return false
      }
      if (!formData.telephone?.trim()) {
        setError("Le numéro de téléphone est obligatoire")
        return false
      }
      if (!formData.type_piece_identite) {
        setError("Veuillez sélectionner le type de pièce d'identité")
        return false
      }
      // Upload de pièce sera fait après inscription dans l'espace personnel
    } else if (formData.type_annonceur === 'entreprise') {
      // Validation entreprise
      if (!formData.nom_formation?.trim()) {
        setError("Le nom de l'organisme est obligatoire")
        return false
      }
      if (!formData.nom_entreprise?.trim()) {
        setError("Le nom de l'entreprise est obligatoire")
        return false
      }
      if (!formData.type_juridique) {
        setError("Veuillez sélectionner le statut juridique")
        return false
      }
      if (!formData.numero_legal?.trim()) {
        setError("Le numéro SIREN/SIRET est obligatoire")
        return false
      }
      // Validation basique du SIREN (9 chiffres)
      if (formData.pays_entreprise === 'France') {
        const sirenRegex = /^\d{9}(\d{5})?$/
        if (!sirenRegex.test(formData.numero_legal.replace(/\s/g, ''))) {
          setError("Le numéro SIREN doit contenir 9 chiffres (ou SIRET 14 chiffres)")
          return false
        }
      }
      if (!formData.siege_rue?.trim()) {
        setError("L'adresse du siège social est obligatoire")
        return false
      }
      if (!formData.siege_ville?.trim()) {
        setError("La ville du siège social est obligatoire")
        return false
      }
      if (!formData.siege_code_postal?.trim()) {
        setError("Le code postal du siège social est obligatoire")
        return false
      }
      if (!formData.telephone?.trim()) {
        setError("Le numéro de téléphone est obligatoire")
        return false
      }

      // Validation représentant légal
      if (!formData.representant_nom?.trim()) {
        setError("Le nom du représentant légal est obligatoire")
        return false
      }
      if (!formData.representant_prenom?.trim()) {
        setError("Le prénom du représentant légal est obligatoire")
        return false
      }
      if (!formData.representant_date_naissance) {
        setError("La date de naissance du représentant légal est obligatoire")
        return false
      }
      // Vérifier que le représentant a au moins 18 ans
      const repBirthDate = new Date(formData.representant_date_naissance)
      const today = new Date()
      const repAge = today.getFullYear() - repBirthDate.getFullYear()
      const repMonthDiff = today.getMonth() - repBirthDate.getMonth()
      if (repAge < 18 || (repAge === 18 && repMonthDiff < 0)) {
        setError("Le représentant légal doit avoir au moins 18 ans")
        return false
      }
      if (!formData.representant_adresse_rue?.trim()) {
        setError("L'adresse du représentant légal est obligatoire")
        return false
      }
      if (!formData.representant_adresse_ville?.trim()) {
        setError("La ville du représentant légal est obligatoire")
        return false
      }
      if (!formData.representant_adresse_code_postal?.trim()) {
        setError("Le code postal du représentant légal est obligatoire")
        return false
      }
      if (!formData.representant_type_piece_identite) {
        setError("Veuillez sélectionner le type de pièce d'identité du représentant")
        return false
      }
      // Upload de pièce sera fait après inscription dans l'espace personnel
    }
    return true
  }

  const validateStep3 = (): boolean => {
    if (!formData.email?.trim()) {
      setError("L'adresse e-mail est obligatoire")
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError("Veuillez entrer une adresse e-mail valide")
      return false
    }
    if (!formData.password) {
      setError("Le mot de passe est obligatoire")
      return false
    }
    if (formData.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères")
      return false
    }
    if (!formData.iban?.trim()) {
      setError("L'IBAN est obligatoire")
      return false
    }
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/
    if (!ibanRegex.test(formData.iban.replace(/\s/g, ''))) {
      setError("Le format de l'IBAN n'est pas valide")
      return false
    }
    const ibanClean = formData.iban.replace(/\s/g, '')
    if (ibanClean.length < 15 || ibanClean.length > 34) {
      setError("L'IBAN doit contenir entre 15 et 34 caractères")
      return false
    }
    if (!formData.nom_titulaire_compte?.trim()) {
      setError("Le nom du titulaire du compte est obligatoire")
      return false
    }
    if (!formData.bic_swift?.trim()) {
      setError("Le code BIC/SWIFT est obligatoire")
      return false
    }
    const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/
    if (!bicRegex.test(formData.bic_swift)) {
      setError("Le format du code BIC/SWIFT n'est pas valide")
      return false
    }
    return true
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === 3 && validateStep3()) {
      setIsLoading(true)
      setError("")

      try {
        const supabase = createClient()

        // 1. Créer l'utilisateur dans Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email!,
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

        // 2. Créer le profil annonceur dans la table (upload de pièces sera fait après)
        const profileData: any = {
          auth_user_id: authData.user.id,
          email: formData.email,
          type_annonceur: formData.type_annonceur,
          telephone: formData.telephone,
          iban: formData.iban!.replace(/\s/g, ''),
          nom_titulaire_compte: formData.nom_titulaire_compte,
          bic_swift: formData.bic_swift,
        }

        if (formData.type_annonceur === 'personne_physique') {
          // Ajouter les champs personne physique
          profileData.nom = formData.nom
          profileData.prenom = formData.prenom
          profileData.date_naissance = formData.date_naissance
          profileData.adresse_rue = formData.adresse_rue
          profileData.adresse_ville = formData.adresse_ville
          profileData.adresse_code_postal = formData.adresse_code_postal
          profileData.adresse_pays = formData.adresse_pays || 'France'
          profileData.type_piece_identite = formData.type_piece_identite
          profileData.piece_identite_url = null // Sera uploadé après dans l'espace personnel
          profileData.nom_formation = `${formData.prenom} ${formData.nom}` // Nom d'affichage par défaut
        } else if (formData.type_annonceur === 'entreprise') {
          // Ajouter les champs entreprise
          profileData.nom_formation = formData.nom_formation
          profileData.nom_entreprise = formData.nom_entreprise
          profileData.type_juridique = formData.type_juridique
          profileData.pays_entreprise = formData.pays_entreprise || 'France'
          profileData.numero_legal = formData.numero_legal
          profileData.siege_rue = formData.siege_rue
          profileData.siege_ville = formData.siege_ville
          profileData.siege_code_postal = formData.siege_code_postal
          profileData.siege_pays = formData.siege_pays || 'France'
          profileData.representant_nom = formData.representant_nom
          profileData.representant_prenom = formData.representant_prenom
          profileData.representant_date_naissance = formData.representant_date_naissance
          profileData.representant_adresse_rue = formData.representant_adresse_rue
          profileData.representant_adresse_ville = formData.representant_adresse_ville
          profileData.representant_adresse_code_postal = formData.representant_adresse_code_postal
          profileData.representant_adresse_pays = formData.representant_adresse_pays || 'France'
          profileData.representant_type_piece_identite = formData.representant_type_piece_identite
          profileData.representant_piece_identite_url = null // Sera uploadé après dans l'espace personnel
        }

        const { error: profileError } = await supabase
          .from('annonceurs')
          .insert(profileData)

        if (profileError) {
          console.error('Erreur lors de la création du profil:', profileError)
          if (profileError.message.toLowerCase().includes('duplicate') ||
              profileError.message.toLowerCase().includes('unique')) {
            setError("Un compte existe déjà avec cet email")
          } else {
            setError("Une erreur s'est produite lors de la création du profil. Veuillez réessayer")
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

  // ============================================
  // RENDER
  // ============================================

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-4 text-center mb-6">
          <h1 className="text-2xl font-bold">Inscription Annonceur</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Créez votre compte pour publier des opportunités et gérer vos offres
          </p>
        </div>

        {/* Stepper */}
        <Stepper steps={STEPS} currentStep={currentStep} className="mb-8" />

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
                Ces informations sont nécessaires pour vérifier votre identité
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
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="prenom">Prénom <span className="text-red-500">*</span></FieldLabel>
                <Input
                  id="prenom"
                  type="text"
                  placeholder="Jean"
                  value={formData.prenom || ''}
                  onChange={(e) => updateFormData({ prenom: e.target.value })}
                  required
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="date_naissance">Date de naissance <span className="text-red-500">*</span></FieldLabel>
              <Input
                id="date_naissance"
                type="date"
                value={formData.date_naissance || ''}
                onChange={(e) => updateFormData({ date_naissance: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                required
              />
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
                required
              />
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
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="adresse_ville">Ville <span className="text-red-500">*</span></FieldLabel>
                <Input
                  id="adresse_ville"
                  type="text"
                  placeholder="Paris"
                  value={formData.adresse_ville || ''}
                  onChange={(e) => updateFormData({ adresse_ville: e.target.value })}
                  required
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="telephone">Numéro de téléphone <span className="text-red-500">*</span></FieldLabel>
              <Input
                id="telephone"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={formData.telephone || ''}
                onChange={(e) => updateFormData({ telephone: e.target.value })}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="type_piece_identite">Type de pièce d'identité <span className="text-red-500">*</span></FieldLabel>
              <select
                id="type_piece_identite"
                value={formData.type_piece_identite || ''}
                onChange={(e) => updateFormData({ type_piece_identite: e.target.value as TypePieceIdentite })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="">Sélectionnez...</option>
                {Object.entries(TYPE_PIECE_IDENTITE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
              ℹ️ Vous pourrez uploader votre pièce d'identité après l'inscription dans votre espace personnel.
            </div>

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
                Ces informations sont nécessaires pour vérifier votre identité juridique
              </p>
            </div>

            {/* Informations de l'organisme */}
            <div className="border-b pb-6">
              <h3 className="font-medium mb-4">Informations générales</h3>

              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="nom_formation">Nom de l'organisme <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="nom_formation"
                    type="text"
                    placeholder="École de théâtre Paris"
                    value={formData.nom_formation || ''}
                    onChange={(e) => updateFormData({ nom_formation: e.target.value })}
                    required
                  />
                  <FieldDescription>Nom affiché publiquement sur la plateforme</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="nom_entreprise">Nom légal de l'entreprise <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="nom_entreprise"
                    type="text"
                    placeholder="École de théâtre Paris SARL"
                    value={formData.nom_entreprise || ''}
                    onChange={(e) => updateFormData({ nom_entreprise: e.target.value })}
                    required
                  />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="type_juridique">Statut juridique <span className="text-red-500">*</span></FieldLabel>
                    <select
                      id="type_juridique"
                      value={formData.type_juridique || ''}
                      onChange={(e) => updateFormData({ type_juridique: e.target.value as TypeJuridique })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Sélectionnez...</option>
                      {Object.entries(TYPE_JURIDIQUE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="numero_legal">SIREN / SIRET <span className="text-red-500">*</span></FieldLabel>
                    <Input
                      id="numero_legal"
                      type="text"
                      placeholder="123456789"
                      value={formData.numero_legal || ''}
                      onChange={(e) => updateFormData({ numero_legal: e.target.value })}
                      required
                    />
                    <FieldDescription>9 chiffres (SIREN) ou 14 chiffres (SIRET)</FieldDescription>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="telephone">Numéro de téléphone <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="+33 1 23 45 67 89"
                    value={formData.telephone || ''}
                    onChange={(e) => updateFormData({ telephone: e.target.value })}
                    required
                  />
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
                    required
                  />
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
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="siege_ville">Ville <span className="text-red-500">*</span></FieldLabel>
                    <Input
                      id="siege_ville"
                      type="text"
                      placeholder="Paris"
                      value={formData.siege_ville || ''}
                      onChange={(e) => updateFormData({ siege_ville: e.target.value })}
                      required
                    />
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
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="representant_prenom">Prénom <span className="text-red-500">*</span></FieldLabel>
                    <Input
                      id="representant_prenom"
                      type="text"
                      placeholder="Sophie"
                      value={formData.representant_prenom || ''}
                      onChange={(e) => updateFormData({ representant_prenom: e.target.value })}
                      required
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="representant_date_naissance">Date de naissance <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="representant_date_naissance"
                    type="date"
                    value={formData.representant_date_naissance || ''}
                    onChange={(e) => updateFormData({ representant_date_naissance: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="representant_adresse_rue">Adresse <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="representant_adresse_rue"
                    type="text"
                    placeholder="10 rue de la Paix"
                    value={formData.representant_adresse_rue || ''}
                    onChange={(e) => updateFormData({ representant_adresse_rue: e.target.value })}
                    required
                  />
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
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="representant_adresse_ville">Ville <span className="text-red-500">*</span></FieldLabel>
                    <Input
                      id="representant_adresse_ville"
                      type="text"
                      placeholder="Paris"
                      value={formData.representant_adresse_ville || ''}
                      onChange={(e) => updateFormData({ representant_adresse_ville: e.target.value })}
                      required
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="representant_type_piece_identite">Type de pièce d'identité <span className="text-red-500">*</span></FieldLabel>
                  <select
                    id="representant_type_piece_identite"
                    value={formData.representant_type_piece_identite || ''}
                    onChange={(e) => updateFormData({ representant_type_piece_identite: e.target.value as TypePieceIdentite })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Sélectionnez...</option>
                    {Object.entries(TYPE_PIECE_IDENTITE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </Field>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
                  ℹ️ Vous pourrez uploader la pièce d'identité du représentant légal après l'inscription dans votre espace personnel.
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
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Mot de passe <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password || ''}
                    onChange={(e) => updateFormData({ password: e.target.value })}
                    required
                  />
                  <FieldDescription>Minimum 8 caractères</FieldDescription>
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
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="iban">IBAN <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="iban"
                    type="text"
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                    value={formData.iban || ''}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\s/g, '').toUpperCase()
                      const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
                      updateFormData({ iban: formatted })
                    }}
                    className="font-mono"
                    required
                    maxLength={34}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="bic_swift">BIC / SWIFT <span className="text-red-500">*</span></FieldLabel>
                  <Input
                    id="bic_swift"
                    type="text"
                    placeholder="BNPAFRPP"
                    value={formData.bic_swift || ''}
                    onChange={(e) => updateFormData({ bic_swift: e.target.value.toUpperCase() })}
                    className="font-mono"
                    required
                    maxLength={11}
                  />
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
