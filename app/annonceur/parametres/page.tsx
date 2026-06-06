"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AppModal } from "@/components/ui/app-modal"
import { Loader2, Save, CheckCircle2, Trash2 } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import type { Annonceur } from "@/types"
import {
  getAgeFromDate,
  isValidBic,
  isValidEmail,
  isValidFrenchBusinessId,
  isValidIban,
  isValidPhone,
  isValidPostalCode,
  isValidWebsiteUrl,
  normalizeBic,
  normalizeBusinessId,
  normalizeCountry,
  normalizeEmail,
  normalizeHumanText,
  normalizeIban,
  normalizePhone,
  normalizePostalCode,
  normalizeText,
  normalizeWebsiteUrl,
} from "@/lib/signup-validation"
import { StripeConnectSection } from "./_components/stripe-connect-section"
import { AdvertiserProfileForm } from "./_components/advertiser-profile-form"
import type { AnnonceurSettingsForm, StripeConnectStatus } from "./_lib/types"

type StripeApiErrorResponse = {
  error?: string
  param?: string | null
}


const EMPTY_FORM_DATA: AnnonceurSettingsForm = {
  nom_formation: "",
  email: "",
  iban: "",
  nom_titulaire_compte: "",
  bic_swift: "",
  telephone: "",
  nom_entreprise: "",
  site_internet: "",
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

const WEBSITE_PREFIX = "www."

function formatWebsiteInput(value: string | null | undefined): string {
  const raw = normalizeText(value)
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")

  return raw ? `${WEBSITE_PREFIX}${raw}` : ""
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
    site_internet: formatWebsiteInput(annonceur.site_internet),
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
  const [stripeAction, setStripeAction] = useState<"onboarding" | "dashboard" | null>(null)
  const [stripeError, setStripeError] = useState("")
  const [formData, setFormData] = useState<AnnonceurSettingsForm>(EMPTY_FORM_DATA)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  const lockedEmail = normalizeEmail(annonceur?.email || formData.email)
  const maxBirthDate = getTodayIsoDate()

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        fetchAnnonceurData(),
        fetchStripeStatus(false),
      ])

      void fetchStripeStatus(true, { showLoading: false })
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

  const fetchStripeStatus = async (
    refresh: boolean,
    options: { showLoading?: boolean } = {}
  ) => {
    const { showLoading = true } = options
    try {
      if (showLoading) {
        setStripeLoading(true)
      }
      setStripeError("")

      const response = await fetch(`/api/stripe/connect/status?refresh=${refresh ? "true" : "false"}`)
      const data = await response.json()

      if (!response.ok) {
        setStripeError(data?.error || "Impossible de charger le statut Stripe")
        return
      }

      setStripeStatus(data as StripeConnectStatus)
    } catch (fetchError) {
      console.error("Erreur statut Stripe Connect:", fetchError)
      setStripeError(fetchError instanceof Error ? fetchError.message : "Erreur lors du chargement Stripe")
    } finally {
      if (showLoading) {
        setStripeLoading(false)
      }
    }
  }

  const handleStartStripeOnboarding = async () => {
    try {
      setStripeAction("onboarding")
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
        setStripeAction(null)
        return
      }

      window.location.assign(data.url as string)
    } catch (actionError) {
      setStripeError(actionError instanceof Error ? actionError.message : "Erreur Stripe Connect")
      setStripeAction(null)
    }
  }

  const handleOpenStripeDashboard = async () => {
    try {
      setStripeAction("dashboard")
      setStripeError("")

      const response = await fetch("/api/stripe/connect/dashboard-link", {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Impossible d’ouvrir le dashboard Stripe")
      }

      window.open(data.url as string, "_blank", "noopener,noreferrer")
      setStripeAction(null)
    } catch (actionError) {
      console.error("Erreur ouverture dashboard Stripe:", actionError)
      setStripeError(actionError instanceof Error ? actionError.message : "Erreur Stripe Connect")
      setStripeAction(null)
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

      if (field === "site_internet" && typeof value === "string") {
        return { ...prev, site_internet: formatWebsiteInput(value) }
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
    if (normalizeWebsiteUrl(formData.site_internet) && !isValidWebsiteUrl(formData.site_internet)) {
      setError("Le site internet de l'entreprise n'est pas valide")
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
        site_internet: normalizeWebsiteUrl(formData.site_internet) || null,
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

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true)
      setDeleteError("")

      const response = await fetch("/api/annonceur/compte", { method: "DELETE" })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || "Suppression du compte impossible.")
      }

      const supabase = createBrowserSupabaseClient()
      await supabase.auth.signOut().catch(() => undefined)
      window.location.href = "/connexion"
    } catch (deleteAccountError) {
      console.error("Erreur suppression compte annonceur:", deleteAccountError)
      setDeleteError(
        deleteAccountError instanceof Error
          ? deleteAccountError.message
          : "Suppression du compte impossible."
      )
      setDeleteLoading(false)
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
  const stripeActionLoading = stripeAction !== null

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Mes informations
        </h1>
        <p className="text-gray-600 text-base sm:text-lg">
          Gérez vos informations juridiques et bancaires
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">

          <AdvertiserProfileForm
            formData={formData}
            annonceur={annonceur}
            lockedEmail={lockedEmail}
            maxBirthDate={maxBirthDate}
            showIban={showIban}
            onToggleIban={() => setShowIban((prev) => !prev)}
            onFieldChange={handleInputChange}
            formatWebsiteInput={formatWebsiteInput}
            normalizeCountryField={normalizeCountryField}
            normalizePhoneField={normalizePhoneField}
            maskIban={maskIban}
          />

          {annonceur?.identite_verifiee ? (
            <StripeConnectSection
              loading={stripeLoading}
              status={stripeStatus}
              dashboardReady={stripeDashboardReady}
              connected={stripeConnected}
              actionLoading={stripeActionLoading}
              action={stripeAction}
              error={stripeError}
              onStartOnboarding={handleStartStripeOnboarding}
              onOpenDashboard={handleOpenStripeDashboard}
            />
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

          <Card className="border-red-200">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium text-gray-900">Supprimer mon compte annonceur</p>
                <p className="text-sm text-gray-600">
                  Votre profil sera anonymisé et vos opportunités seront fermées.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-red-300 text-red-700 hover:bg-red-50 sm:w-auto"
                onClick={() => {
                  setDeleteError("")
                  setDeleteModalOpen(true)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer mon compte
              </Button>
            </CardContent>
          </Card>

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

      <AppModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleteLoading) setDeleteModalOpen(false)
        }}
        title="Supprimer votre compte annonceur ?"
        description="Cette action anonymise votre profil, ferme vos opportunités et supprime votre accès de connexion."
        tone="warning"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteLoading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer définitivement"
              )}
            </Button>
          </>
        }
      >
        {deleteError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {deleteError}
          </div>
        )}
      </AppModal>
    </div>
  )
}
