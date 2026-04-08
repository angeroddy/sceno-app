"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Eye, EyeOff, CheckCircle2, ExternalLink, AlertCircle } from "lucide-react"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import {
  TYPE_JURIDIQUE_LABELS,
  type Annonceur,
  type TypeJuridique,
} from "@/app/types"
import {
  getAgeFromDate,
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
  normalizeIban,
  normalizePhone,
  normalizePostalCode,
  normalizeText,
} from "@/app/lib/signup-validation"

interface StripeConnectStatus {
  connected: boolean
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
  stripe_details_submitted: boolean
  stripe_requirements_currently_due: string[]
  stripe_requirements_pending_verification: string[]
  stripe_requirements_eventually_due: string[]
  stripe_requirements_disabled_reason: string | null
  stripe_has_pending_representative_verification: boolean
}

type StripeApiErrorResponse = {
  error?: string
  param?: string | null
}

type AnnonceurSettingsForm = {
  nom_formation: string
  email: string
  iban: string
  nom_titulaire_compte: string
  bic_swift: string
  telephone: string
  nom_entreprise: string
  type_juridique: TypeJuridique | ""
  pays_entreprise: string
  numero_legal: string
  siege_rue: string
  siege_ville: string
  siege_code_postal: string
  siege_pays: string
  representant_nom: string
  representant_prenom: string
  representant_telephone: string
  representant_date_naissance: string
  representant_adresse_rue: string
  representant_adresse_ville: string
  representant_adresse_code_postal: string
  representant_adresse_pays: string
}

const EMPTY_FORM_DATA: AnnonceurSettingsForm = {
  nom_formation: "",
  email: "",
  iban: "",
  nom_titulaire_compte: "",
  bic_swift: "",
  telephone: "",
  nom_entreprise: "",
  type_juridique: "",
  pays_entreprise: "France",
  numero_legal: "",
  siege_rue: "",
  siege_ville: "",
  siege_code_postal: "",
  siege_pays: "France",
  representant_nom: "",
  representant_prenom: "",
  representant_telephone: "",
  representant_date_naissance: "",
  representant_adresse_rue: "",
  representant_adresse_ville: "",
  representant_adresse_code_postal: "",
  representant_adresse_pays: "France",
}

function toFormData(annonceur: Annonceur): AnnonceurSettingsForm {
  return {
    nom_formation: annonceur.nom_formation || "",
    email: normalizeEmail(annonceur.email),
    iban: annonceur.iban || "",
    nom_titulaire_compte: annonceur.nom_titulaire_compte || "",
    bic_swift: normalizeBic(annonceur.bic_swift || ""),
    telephone: annonceur.telephone || "",
    nom_entreprise: annonceur.nom_entreprise || "",
    type_juridique: annonceur.type_juridique || "",
    pays_entreprise: annonceur.pays_entreprise || "France",
    numero_legal: annonceur.numero_legal || "",
    siege_rue: annonceur.siege_rue || "",
    siege_ville: annonceur.siege_ville || "",
    siege_code_postal: annonceur.siege_code_postal || "",
    siege_pays: annonceur.siege_pays || "France",
    representant_nom: annonceur.representant_nom || "",
    representant_prenom: annonceur.representant_prenom || "",
    representant_telephone: annonceur.representant_telephone || "",
    representant_date_naissance: annonceur.representant_date_naissance || "",
    representant_adresse_rue: annonceur.representant_adresse_rue || "",
    representant_adresse_ville: annonceur.representant_adresse_ville || "",
    representant_adresse_code_postal: annonceur.representant_adresse_code_postal || "",
    representant_adresse_pays: annonceur.representant_adresse_pays || "France",
  }
}

function getTodayIsoDate(): string {
  return new Date().toISOString().split("T")[0]
}

function scrollToHashSection() {
  if (typeof window === "undefined") return

  const hash = window.location.hash.replace("#", "")
  if (!hash) return

  const target = document.getElementById(hash)
  if (!target) return

  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "start" })
  })
}

export default function ParametresPage() {
  const [annonceur, setAnnonceur] = useState<Annonceur | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showIban, setShowIban] = useState(false)
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null)
  const [stripeLoading, setStripeLoading] = useState(true)
  const [stripeActionLoading, setStripeActionLoading] = useState(false)
  const [stripeError, setStripeError] = useState("")
  const [formData, setFormData] = useState<AnnonceurSettingsForm>(EMPTY_FORM_DATA)

  const lockedEmail = normalizeEmail(annonceur?.email || formData.email)
  const maxBirthDate = getTodayIsoDate()

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        fetchAnnonceurData(),
        fetchStripeStatus(true),
      ])
    }

    void initialize()
  }, [])

  useEffect(() => {
    scrollToHashSection()

    const handleHashChange = () => {
      scrollToHashSection()
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  useEffect(() => {
    if (!loading) {
      scrollToHashSection()
    }
  }, [loading, stripeLoading])

  const fetchAnnonceurData = async () => {
    try {
      const supabase = createBrowserSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: annonceurData } = await supabase
        .from("annonceurs")
        .select("*")
        .eq("auth_user_id", user.id)
        .single<Annonceur>()

      if (annonceurData) {
        setAnnonceur(annonceurData)
        setFormData(toFormData(annonceurData))
      }
    } catch (fetchError) {
      console.error("Erreur lors du chargement des données:", fetchError)
    } finally {
      setLoading(false)
    }
  }

  const fetchStripeStatus = async (refresh: boolean) => {
    try {
      setStripeLoading(true)
      setStripeError("")

      const response = await fetch(`/api/stripe/connect/status?refresh=${refresh ? "true" : "false"}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Impossible de charger le statut Stripe")
      }

      setStripeStatus(data as StripeConnectStatus)
    } catch (fetchError) {
      console.error("Erreur statut Stripe Connect:", fetchError)
      setStripeError(fetchError instanceof Error ? fetchError.message : "Erreur lors du chargement Stripe")
    } finally {
      setStripeLoading(false)
    }
  }

  const handleCreateOrSyncStripeAccount = async () => {
    try {
      setStripeActionLoading(true)
      setStripeError("")

      const response = await fetch("/api/stripe/connect/account", {
        method: "POST",
      })
      const data = await response.json() as StripeConnectStatus | StripeApiErrorResponse

      if (!response.ok) {
        const message =
          (data as StripeApiErrorResponse)?.param === "representative.phone"
            ? "Stripe refuse le téléphone du représentant légal. Vérifiez le champ « Téléphone du représentant »."
            : (data as StripeApiErrorResponse)?.error || "Impossible de créer le compte Stripe"
        setStripeError(message)
        return
      }

      setStripeStatus(data as StripeConnectStatus)
      await fetchStripeStatus(true)
    } catch (actionError) {
      setStripeError(actionError instanceof Error ? actionError.message : "Erreur Stripe Connect")
    } finally {
      setStripeActionLoading(false)
    }
  }

  const handleStartStripeOnboarding = async () => {
    try {
      setStripeActionLoading(true)
      setStripeError("")

      const response = await fetch("/api/stripe/connect/onboarding-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnPath: "/annonceur/parametres?stripe=return",
          refreshPath: "/annonceur/parametres?stripe=refresh",
        }),
      })
      const data = await response.json() as { url?: string } & StripeApiErrorResponse

      if (!response.ok || !data?.url) {
        const message =
          data?.param === "representative.phone"
            ? "Stripe refuse le téléphone du représentant légal. Vérifiez le champ « Téléphone du représentant »."
            : data?.error || "Impossible de générer le lien Stripe"
        setStripeError(message)
        return
      }

      window.location.href = data.url as string
    } catch (actionError) {
      setStripeError(actionError instanceof Error ? actionError.message : "Erreur Stripe Connect")
    } finally {
      setStripeActionLoading(false)
    }
  }

  const handleOpenStripeDashboard = async () => {
    try {
      setStripeActionLoading(true)
      setStripeError("")

      const response = await fetch("/api/stripe/connect/dashboard-link", {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Impossible d’ouvrir le dashboard Stripe")
      }

      window.location.href = data.url as string
    } catch (actionError) {
      console.error("Erreur ouverture dashboard Stripe:", actionError)
      setStripeError(actionError instanceof Error ? actionError.message : "Erreur Stripe Connect")
    } finally {
      setStripeActionLoading(false)
    }
  }

  const handleInputChange = (
    field: keyof AnnonceurSettingsForm,
    value: string
  ) => {
    setFormData((prev) => {
      if (field === "email") {
        return prev
      }

      if (field === "iban" && typeof value === "string") {
        const cleaned = normalizeIban(value)
        const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned
        return { ...prev, [field]: formatted }
      }

      if (field === "bic_swift" && typeof value === "string") {
        return { ...prev, [field]: normalizeBic(value) }
      }

      return { ...prev, [field]: value }
    })

    setError("")
    setSuccess(false)
  }

  const normalizePhoneField = (field: "telephone" | "representant_telephone") => {
    handleInputChange(field, normalizePhone(formData[field]))
  }

  const normalizeCountryField = (
    field:
      | "pays_entreprise"
      | "siege_pays"
      | "representant_adresse_pays"
  ) => {
    handleInputChange(field, normalizeCountry(formData[field]))
  }

  const validateForm = (): boolean => {
    if (!normalizeHumanText(formData.nom_formation)) {
      setError("Le nom affiché de l'organisme est obligatoire")
      return false
    }
    if (!lockedEmail) {
      setError("L'email est obligatoire")
      return false
    }
    if (!isValidEmail(lockedEmail)) {
      setError("L'email n'est pas valide")
      return false
    }
    if (!normalizeIban(formData.iban)) {
      setError("L'IBAN est obligatoire")
      return false
    }
    if (!isValidIban(formData.iban)) {
      setError("Le format de l'IBAN n'est pas valide")
      return false
    }
    if (!normalizeHumanText(formData.nom_titulaire_compte)) {
      setError("Le nom du titulaire du compte est obligatoire")
      return false
    }
    if (!normalizeBic(formData.bic_swift)) {
      setError("Le code BIC/SWIFT est obligatoire")
      return false
    }
    if (!isValidBic(formData.bic_swift)) {
      setError("Le format du code BIC/SWIFT n'est pas valide (8 ou 11 caractères)")
      return false
    }

    if (!normalizeText(formData.telephone)) {
      setError("Le téléphone de l'organisme est obligatoire")
      return false
    }
    if (!isValidPhone(formData.telephone)) {
      setError("Le téléphone de l'organisme n'est pas valide")
      return false
    }

    if (!normalizeText(formData.nom_entreprise)) {
      setError("Le nom légal de l'entreprise est obligatoire")
      return false
    }
    if (!formData.type_juridique) {
      setError("Le statut juridique est obligatoire")
      return false
    }
    if (!normalizeText(formData.numero_legal)) {
      setError("Le numéro légal de l'entreprise est obligatoire")
      return false
    }
    if (
      normalizeCountry(formData.pays_entreprise || "France") === "France" &&
      !isValidFrenchBusinessId(formData.numero_legal)
    ) {
      setError("Le numéro SIREN doit contenir 9 chiffres, le SIRET 14")
      return false
    }
    if (!normalizeText(formData.siege_rue) || !normalizeText(formData.siege_ville)) {
      setError("L'adresse complète du siège social est obligatoire")
      return false
    }
    if (!normalizeText(formData.siege_code_postal)) {
      setError("Le code postal du siège social est obligatoire")
      return false
    }
    if (!isValidPostalCode(formData.siege_code_postal, formData.siege_pays || formData.pays_entreprise || "France")) {
      setError("Le code postal du siège social n'est pas valide")
      return false
    }
    if (!normalizeText(formData.representant_nom) || !normalizeText(formData.representant_prenom)) {
      setError("Le nom et le prénom du représentant légal sont obligatoires")
      return false
    }
    if (!normalizeText(formData.representant_telephone)) {
      setError("Le téléphone du représentant légal est obligatoire")
      return false
    }
    if (!isValidPhone(formData.representant_telephone)) {
      setError("Le téléphone du représentant légal n'est pas valide")
      return false
    }
    if (!formData.representant_date_naissance) {
      setError("La date de naissance du représentant légal est obligatoire")
      return false
    }
    const representativeAge = getAgeFromDate(formData.representant_date_naissance)
    if (representativeAge === null || representativeAge < 18) {
      setError("Le représentant légal doit avoir au moins 18 ans")
      return false
    }
    if (
      !normalizeText(formData.representant_adresse_rue) ||
      !normalizeText(formData.representant_adresse_ville)
    ) {
      setError("L'adresse complète du représentant légal est obligatoire")
      return false
    }
    if (!normalizeText(formData.representant_adresse_code_postal)) {
      setError("Le code postal du représentant légal est obligatoire")
      return false
    }
    if (
      !isValidPostalCode(
        formData.representant_adresse_code_postal,
        formData.representant_adresse_pays || formData.siege_pays || formData.pays_entreprise || "France"
      )
    ) {
      setError("Le code postal du représentant légal n'est pas valide")
      return false
    }

    return true
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!validateForm() || !annonceur) return

    setSaving(true)
    setError("")
    setSuccess(false)

    try {
      const supabase = createBrowserSupabaseClient()
      const updatePayload: Partial<Annonceur> = {
        nom_formation: normalizeHumanText(formData.nom_formation),
        iban: normalizeIban(formData.iban),
        nom_titulaire_compte: normalizeHumanText(formData.nom_titulaire_compte),
        bic_swift: normalizeBic(formData.bic_swift),
        telephone: normalizePhone(formData.telephone) || null,
        nom: null,
        prenom: null,
        date_naissance: null,
        adresse_rue: null,
        adresse_ville: null,
        adresse_code_postal: null,
        adresse_pays: null,
        nom_entreprise: normalizeHumanText(formData.nom_entreprise) || null,
        type_juridique: formData.type_juridique || null,
        pays_entreprise: normalizeCountry(formData.pays_entreprise || "France") || "France",
        numero_legal: normalizeBusinessId(formData.numero_legal) || null,
        siege_rue: normalizeHumanText(formData.siege_rue) || null,
        siege_ville: normalizeHumanText(formData.siege_ville) || null,
        siege_code_postal:
          normalizePostalCode(formData.siege_code_postal, formData.siege_pays || formData.pays_entreprise || "France") || null,
        siege_pays: normalizeCountry(formData.siege_pays || "France") || "France",
        representant_nom: normalizeHumanText(formData.representant_nom) || null,
        representant_prenom: normalizeHumanText(formData.representant_prenom) || null,
        representant_telephone: normalizePhone(formData.representant_telephone) || null,
        representant_date_naissance: formData.representant_date_naissance || null,
        representant_adresse_rue: normalizeHumanText(formData.representant_adresse_rue) || null,
        representant_adresse_ville: normalizeHumanText(formData.representant_adresse_ville) || null,
        representant_adresse_code_postal:
          normalizePostalCode(
            formData.representant_adresse_code_postal,
            formData.representant_adresse_pays || formData.siege_pays || formData.pays_entreprise || "France"
          ) || null,
        representant_adresse_pays:
          normalizeCountry(formData.representant_adresse_pays || "France") || "France",
      }

      const { error: updateError } = await supabase
        .from("annonceurs")
        .update(updatePayload as unknown as never)
        .eq("id", annonceur.id)

      if (updateError) {
        console.error("Erreur lors de la mise à jour:", updateError)
        setError("Une erreur s'est produite lors de la mise à jour")
        return
      }

      if (stripeStatus?.connected) {
        try {
          const stripeResponse = await fetch("/api/stripe/connect/account", { method: "POST" })
          const stripeData = await stripeResponse.json()

          if (!stripeResponse.ok) {
            throw new Error(stripeData?.error || "Impossible de synchroniser Stripe")
          }
        } catch (syncError) {
          console.error("Erreur de synchronisation Stripe après sauvegarde:", syncError)
          setStripeError(syncError instanceof Error ? syncError.message : "Erreur Stripe Connect")
        }
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      await Promise.all([
        fetchAnnonceurData(),
        fetchStripeStatus(true),
      ])
    } catch (submitError) {
      console.error("Erreur:", submitError)
      setError("Une erreur inattendue s'est produite")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E63832]"></div>
      </div>
    )
  }

  const maskIban = (iban: string) => {
    if (!iban) return ""
    const cleaned = iban.replace(/\s/g, "")
    if (cleaned.length <= 8) return iban
    const firstFour = cleaned.substring(0, 4)
    const lastFour = cleaned.substring(cleaned.length - 4)
    const masked = firstFour + "*".repeat(cleaned.length - 8) + lastFour
    return masked.match(/.{1,4}/g)?.join(" ") || masked
  }

  const stripeDashboardReady = Boolean(
    stripeStatus?.stripe_onboarding_complete &&
    stripeStatus?.stripe_charges_enabled &&
    stripeStatus?.stripe_payouts_enabled
  )
  const stripeConnected = Boolean(stripeStatus?.connected)

  const pendingStripeItems = [
    ...(stripeStatus?.stripe_requirements_currently_due ?? []),
    ...(stripeStatus?.stripe_requirements_pending_verification ?? []),
  ]

  const formatStripeRequirement = (value: string) => {
    const normalized = value.replace(/\[\d+\]/g, "")

    const exactLabels: Record<string, string> = {
      "representative.first_name": "Prénom du représentant légal",
      "representative.last_name": "Nom du représentant légal",
      "representative.phone": "Numéro de téléphone du représentant légal",
      "representative.email": "Adresse e-mail du représentant légal",
      "representative.address.line1": "Adresse du représentant légal",
      "representative.address.city": "Ville du représentant légal",
      "representative.address.postal_code": "Code postal du représentant légal",
      "representative.address.country": "Pays du représentant légal",
      "representative.dob.day": "Jour de naissance du représentant légal",
      "representative.dob.month": "Mois de naissance du représentant légal",
      "representative.dob.year": "Année de naissance du représentant légal",
      "company.name": "Nom légal de l'entreprise",
      "company.tax_id": "Numéro d'identification de l'entreprise",
      "company.phone": "Téléphone de l'entreprise",
      "company.address.line1": "Adresse du siège social",
      "company.address.city": "Ville du siège social",
      "company.address.postal_code": "Code postal du siège social",
      "company.address.country": "Pays du siège social",
      "business_profile.name": "Nom affiché de l'organisme",
      "external_account": "Compte bancaire",
    }

    if (exactLabels[normalized]) {
      return exactLabels[normalized]
    }

    if (normalized.startsWith("representative.verification")) {
      return "Vérifier le représentant de compte"
    }

    if (normalized.startsWith("person.verification")) {
      return "Vérifier la personne rattachée au compte"
    }

    return "Informations complémentaires à fournir dans Stripe"
  }

  const summarizedPendingStripeItems = Array.from(
    pendingStripeItems.reduce((accumulator, item) => {
      const label = formatStripeRequirement(item)
      accumulator.set(label, (accumulator.get(label) ?? 0) + 1)
      return accumulator
    }, new Map<string, number>())
  ).map(([label, count]) =>
    count > 1 && label === "Informations complémentaires à fournir dans Stripe"
      ? `${label} (${count} éléments)`
      : label
  )

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Mes informations
        </h1>
        <p className="text-gray-600 text-base sm:text-lg">
          Gérez les informations juridiques et bancaires utilisées pour Stripe Connect
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div id="validation-compte" className="scroll-mt-28">
          <Card>
            <CardHeader>
              <CardTitle>Profil juridique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Type de compte</Label>
                <Input value="Entreprise" readOnly />
                <p className="text-xs text-gray-500">
                  Les comptes annonceur sont désormais limités aux entreprises.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nom_formation">Nom affiché de l&apos;organisme <span className="text-red-500">*</span></Label>
                <Input
                  id="nom_formation"
                  type="text"
                  value={formData.nom_formation}
                  onChange={(e) => handleInputChange("nom_formation", e.target.value)}
                  placeholder="Nom affiché publiquement"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email du compte <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={lockedEmail}
                  placeholder="contact@organisme.fr"
                  readOnly
                  aria-readonly="true"
                  className="bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500">
                  L&apos;email du compte ne peut pas être modifié depuis cet espace.
                </p>
              </div>

              {annonceur?.email_verifie ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Email vérifié</span>
                </div>
              ) : (
                <div className="text-sm text-orange-600">
                  Email non vérifié. Vérifiez votre boîte de réception.
                </div>
              )}

              {annonceur?.identite_verifiee ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Compte vérifié</span>
                </div>
              ) : (
                <div className="text-sm text-orange-600">
                  Compte en cours de vérification par l&apos;équipe Scenio
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          <>
            <Card>
              <CardHeader>
                <CardTitle>Informations de l&apos;entreprise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom_entreprise">Nom légal de l&apos;entreprise <span className="text-red-500">*</span></Label>
                    <Input
                      id="nom_entreprise"
                      type="text"
                      value={formData.nom_entreprise}
                      onChange={(e) => handleInputChange("nom_entreprise", e.target.value)}
                      placeholder="Nom légal de la société"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type_juridique">Statut juridique <span className="text-red-500">*</span></Label>
                      <select
                        id="type_juridique"
                        value={formData.type_juridique}
                        onChange={(e) => handleInputChange("type_juridique", e.target.value as TypeJuridique)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Sélectionnez...</option>
                        {Object.entries(TYPE_JURIDIQUE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero_legal">Numéro légal / SIREN / SIRET <span className="text-red-500">*</span></Label>
                      <Input
                        id="numero_legal"
                        type="text"
                        value={formData.numero_legal}
                        onChange={(e) => handleInputChange("numero_legal", e.target.value)}
                        placeholder="123456789"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pays_entreprise">Pays d&apos;immatriculation <span className="text-red-500">*</span></Label>
                      <Input
                        id="pays_entreprise"
                        type="text"
                        value={formData.pays_entreprise}
                        onChange={(e) => handleInputChange("pays_entreprise", e.target.value)}
                        onBlur={() => normalizeCountryField("pays_entreprise")}
                        placeholder="France"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telephone">Téléphone de l&apos;organisme <span className="text-red-500">*</span></Label>
                      <Input
                        id="telephone"
                        type="tel"
                        value={formData.telephone}
                        onChange={(e) => handleInputChange("telephone", e.target.value)}
                        onBlur={() => normalizePhoneField("telephone")}
                        placeholder="+33 1 XX XX XX XX"
                      />
                    </div>
                  </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Adresse du siège social</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="siege_rue">Adresse <span className="text-red-500">*</span></Label>
                    <Input
                      id="siege_rue"
                      type="text"
                      value={formData.siege_rue}
                      onChange={(e) => handleInputChange("siege_rue", e.target.value)}
                      placeholder="45 avenue des Champs-Élysées"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="siege_code_postal">Code postal <span className="text-red-500">*</span></Label>
                      <Input
                        id="siege_code_postal"
                        type="text"
                        value={formData.siege_code_postal}
                        onChange={(e) => handleInputChange("siege_code_postal", e.target.value)}
                        placeholder="75008"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siege_ville">Ville <span className="text-red-500">*</span></Label>
                      <Input
                        id="siege_ville"
                        type="text"
                        value={formData.siege_ville}
                        onChange={(e) => handleInputChange("siege_ville", e.target.value)}
                        placeholder="Paris"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siege_pays">Pays du siège <span className="text-red-500">*</span></Label>
                    <Input
                      id="siege_pays"
                      type="text"
                      value={formData.siege_pays}
                      onChange={(e) => handleInputChange("siege_pays", e.target.value)}
                      onBlur={() => normalizeCountryField("siege_pays")}
                      placeholder="France"
                    />
                  </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Représentant légal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="representant_nom">Nom <span className="text-red-500">*</span></Label>
                      <Input
                        id="representant_nom"
                        type="text"
                        value={formData.representant_nom}
                        onChange={(e) => handleInputChange("representant_nom", e.target.value)}
                        placeholder="Martin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="representant_prenom">Prénom <span className="text-red-500">*</span></Label>
                      <Input
                        id="representant_prenom"
                        type="text"
                        value={formData.representant_prenom}
                        onChange={(e) => handleInputChange("representant_prenom", e.target.value)}
                        placeholder="Sophie"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="representant_telephone">Téléphone du représentant <span className="text-red-500">*</span></Label>
                      <Input
                        id="representant_telephone"
                        type="tel"
                        value={formData.representant_telephone}
                        onChange={(e) => handleInputChange("representant_telephone", e.target.value)}
                        onBlur={() => normalizePhoneField("representant_telephone")}
                        placeholder="+33 6 XX XX XX XX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="representant_date_naissance">Date de naissance <span className="text-red-500">*</span></Label>
                      <Input
                        id="representant_date_naissance"
                        type="date"
                        value={formData.representant_date_naissance}
                        onChange={(e) => handleInputChange("representant_date_naissance", e.target.value)}
                        max={maxBirthDate}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="representant_adresse_rue">Adresse <span className="text-red-500">*</span></Label>
                    <Input
                      id="representant_adresse_rue"
                      type="text"
                      value={formData.representant_adresse_rue}
                      onChange={(e) => handleInputChange("representant_adresse_rue", e.target.value)}
                      placeholder="10 rue de la Paix"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="representant_adresse_code_postal">Code postal <span className="text-red-500">*</span></Label>
                      <Input
                        id="representant_adresse_code_postal"
                        type="text"
                        value={formData.representant_adresse_code_postal}
                        onChange={(e) => handleInputChange("representant_adresse_code_postal", e.target.value)}
                        placeholder="75002"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="representant_adresse_ville">Ville <span className="text-red-500">*</span></Label>
                      <Input
                        id="representant_adresse_ville"
                        type="text"
                        value={formData.representant_adresse_ville}
                        onChange={(e) => handleInputChange("representant_adresse_ville", e.target.value)}
                        placeholder="Paris"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="representant_adresse_pays">Pays <span className="text-red-500">*</span></Label>
                    <Input
                      id="representant_adresse_pays"
                      type="text"
                      value={formData.representant_adresse_pays}
                      onChange={(e) => handleInputChange("representant_adresse_pays", e.target.value)}
                      onBlur={() => normalizeCountryField("representant_adresse_pays")}
                      placeholder="France"
                    />
                  </div>
              </CardContent>
            </Card>
          </>

          <Card>
            <CardHeader>
              <CardTitle>Informations bancaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom_titulaire_compte">
                  Nom du titulaire du compte <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nom_titulaire_compte"
                  type="text"
                  value={formData.nom_titulaire_compte}
                  onChange={(e) => handleInputChange("nom_titulaire_compte", e.target.value)}
                  placeholder="Nom de la personne ou de l'entreprise"
                />
                <p className="text-xs text-gray-500">
                  Conservé côté plateforme, mais le compte bancaire final doit être confirmé dans Stripe.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="iban">IBAN <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="iban"
                    type={showIban ? "text" : "password"}
                    value={showIban ? formData.iban : maskIban(formData.iban)}
                    onChange={(e) => handleInputChange("iban", e.target.value)}
                    className="pl-4 pr-12 font-mono text-base tracking-wider"
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                    maxLength={34}
                  />
                  <button
                    type="button"
                    onClick={() => setShowIban((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                  >
                    {showIban ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bic_swift">BIC / SWIFT <span className="text-red-500">*</span></Label>
                <Input
                  id="bic_swift"
                  type="text"
                  value={formData.bic_swift}
                  onChange={(e) => handleInputChange("bic_swift", e.target.value)}
                  className="font-mono text-base tracking-wider"
                  placeholder="BNPAFRPP"
                  maxLength={11}
                />
              </div>
            </CardContent>
          </Card>

          {annonceur?.identite_verifiee ? (
            <div id="stripe-connect" className="scroll-mt-28">
              <Card>
                <CardHeader>
                  <CardTitle>Paiements Stripe Connect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stripeLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Chargement du statut Stripe...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p>
                          Compte Connect:{" "}
                          <span className={stripeStatus?.connected ? "text-green-700 font-medium" : "text-orange-700 font-medium"}>
                            {stripeStatus?.connected ? "Créé" : "Non créé"}
                          </span>
                        </p>
                        <p>
                          Onboarding:{" "}
                          <span className={stripeStatus?.stripe_onboarding_complete ? "text-green-700 font-medium" : "text-orange-700 font-medium"}>
                            {stripeStatus?.stripe_onboarding_complete ? "Terminé" : "Incomplet"}
                          </span>
                        </p>
                        <p>
                          Paiements entrants:{" "}
                          <span className={stripeStatus?.stripe_charges_enabled ? "text-green-700 font-medium" : "text-orange-700 font-medium"}>
                            {stripeStatus?.stripe_charges_enabled ? "Activés" : "Désactivés"}
                          </span>
                        </p>
                        <p>
                          Virements:{" "}
                          <span className={stripeStatus?.stripe_payouts_enabled ? "text-green-700 font-medium" : "text-orange-700 font-medium"}>
                            {stripeStatus?.stripe_payouts_enabled ? "Activés" : "Désactivés"}
                          </span>
                        </p>
                        {stripeStatus?.stripe_account_id && (
                          <p className="text-xs text-gray-500 font-mono">
                            {stripeStatus.stripe_account_id}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                        {stripeDashboardReady ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={handleOpenStripeDashboard}
                            disabled={stripeActionLoading}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ouvrir mon dashboard Stripe
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={handleCreateOrSyncStripeAccount}
                              disabled={stripeActionLoading}
                            >
                              {stripeActionLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Synchronisation...
                                </>
                              ) : (
                                "Créer / Synchroniser le compte Stripe"
                              )}
                            </Button>

                            <Button
                              type="button"
                              className="w-full sm:w-auto bg-[#E63832] hover:bg-[#E63832]/90"
                              onClick={handleStartStripeOnboarding}
                              disabled={stripeActionLoading}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Compléter l&apos;onboarding Stripe
                            </Button>
                          </>
                        )}
                      </div>

                      {stripeDashboardReady ? (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-700">
                          Votre compte Stripe est prêt à recevoir les paiements.
                        </div>
                      ) : stripeConnected ? (
                        <div className="space-y-3">
                          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-700">
                            {stripeStatus?.stripe_has_pending_representative_verification
                              ? "Stripe attend encore la vérification du représentant de compte avant d'activer les paiements."
                              : "Le compte Stripe est créé, mais il manque encore une validation ou une vérification avant l'activation des paiements."}
                          </div>

                          {summarizedPendingStripeItems.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                              <p className="font-medium mb-2">Actions restantes côté Stripe</p>
                              <p className="mb-3 text-amber-700">
                                Stripe demande encore quelques informations avant d&apos;activer complètement le compte.
                              </p>
                              <ul className="list-disc pl-5 space-y-1">
                                {summarizedPendingStripeItems.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-700">
                          Aucun compte Stripe Connect n&apos;est encore créé. Vous pouvez le créer maintenant ou lancer directement l&apos;onboarding Stripe.
                        </div>
                      )}
                    </>
                  )}

                  {stripeError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{stripeError}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Vos informations ont été mises à jour avec succès</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-[#E63832] hover:bg-[#E63832]/90 px-8"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
