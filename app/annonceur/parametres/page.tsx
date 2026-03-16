"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Eye, EyeOff, CheckCircle2, ExternalLink, AlertCircle } from "lucide-react"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import {
  isValidBic,
  isValidEmail,
  isValidIban,
  normalizeBic,
  normalizeEmail,
  normalizeHumanText,
  normalizeIban,
} from "@/app/lib/signup-validation"
import type { Annonceur } from "@/app/types"

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

  const [formData, setFormData] = useState({
    nom_formation: "",
    email: "",
    iban: "",
    nom_titulaire_compte: "",
    bic_swift: "",
  })

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        fetchAnnonceurData(),
        fetchStripeStatus(true),
      ])
    }

    void initialize()
  }, [])

  const fetchAnnonceurData = async () => {
    try {
      const supabase = createBrowserSupabaseClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: annonceurData } = await supabase
        .from('annonceurs')
        .select('*')
        .eq('auth_user_id', user.id)
        .single<Annonceur>()

      if (annonceurData) {
        setAnnonceur(annonceurData)
        setFormData({
          nom_formation: annonceurData.nom_formation,
          email: normalizeEmail(annonceurData.email),
          iban: annonceurData.iban || "",
          nom_titulaire_compte: annonceurData.nom_titulaire_compte || "",
          bic_swift: normalizeBic(annonceurData.bic_swift || ""),
        })
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStripeStatus = async (refresh: boolean) => {
    try {
      setStripeLoading(true)
      setStripeError("")

      const response = await fetch(`/api/stripe/connect/status?refresh=${refresh ? 'true' : 'false'}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Impossible de charger le statut Stripe')
      }

      setStripeStatus(data as StripeConnectStatus)
    } catch (err) {
      console.error('Erreur statut Stripe Connect:', err)
      setStripeError(err instanceof Error ? err.message : 'Erreur lors du chargement Stripe')
    } finally {
      setStripeLoading(false)
    }
  }

  const handleCreateOrSyncStripeAccount = async () => {
    try {
      setStripeActionLoading(true)
      setStripeError("")

      const response = await fetch('/api/stripe/connect/account', {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Impossible de créer le compte Stripe')
      }

      setStripeStatus(data as StripeConnectStatus)
      await fetchStripeStatus(true)
    } catch (err) {
      console.error('Erreur create/sync Stripe:', err)
      setStripeError(err instanceof Error ? err.message : 'Erreur Stripe Connect')
    } finally {
      setStripeActionLoading(false)
    }
  }

  const handleStartStripeOnboarding = async () => {
    try {
      setStripeActionLoading(true)
      setStripeError("")

      const response = await fetch('/api/stripe/connect/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnPath: '/annonceur/parametres?stripe=return',
          refreshPath: '/annonceur/parametres?stripe=refresh',
        }),
      })
      const data = await response.json()

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Impossible de générer le lien Stripe')
      }

      window.location.href = data.url as string
    } catch (err) {
      console.error('Erreur onboarding Stripe:', err)
      setStripeError(err instanceof Error ? err.message : 'Erreur Stripe Connect')
    } finally {
      setStripeActionLoading(false)
    }
  }

  const handleOpenStripeDashboard = async () => {
    try {
      setStripeActionLoading(true)
      setStripeError("")

      const response = await fetch('/api/stripe/connect/dashboard-link', {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Impossible d’ouvrir le dashboard Stripe')
      }

      window.location.href = data.url as string
    } catch (err) {
      console.error('Erreur ouverture dashboard Stripe:', err)
      setStripeError(err instanceof Error ? err.message : 'Erreur Stripe Connect')
    } finally {
      setStripeActionLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    // Formatage automatique de l'IBAN
    if (field === "iban") {
      const cleaned = normalizeIban(value)
      const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
      setFormData(prev => ({ ...prev, [field]: formatted }))
    } else if (field === "bic_swift") {
      // Formatage automatique du BIC/SWIFT (majuscules)
      setFormData(prev => ({ ...prev, [field]: normalizeBic(value) }))
    } else if (field === "email") {
      setFormData(prev => ({ ...prev, [field]: normalizeEmail(value) }))
    } else if (field === "nom_formation" || field === "nom_titulaire_compte") {
      setFormData(prev => ({ ...prev, [field]: value }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    setError("")
    setSuccess(false)
  }

  const validateForm = (): boolean => {
    if (!normalizeHumanText(formData.nom_formation)) {
      setError("Le nom de l'organisme est obligatoire")
      return false
    }
    if (!normalizeEmail(formData.email)) {
      setError("L'email est obligatoire")
      return false
    }
    if (!isValidEmail(formData.email)) {
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
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return
    if (!annonceur) return

    setSaving(true)
    setError("")
    setSuccess(false)

    try {
      const supabase = createBrowserSupabaseClient()

      const updatePayload = {
        nom_formation: normalizeHumanText(formData.nom_formation),
        email: normalizeEmail(formData.email),
        iban: normalizeIban(formData.iban),
        nom_titulaire_compte: normalizeHumanText(formData.nom_titulaire_compte),
        bic_swift: normalizeBic(formData.bic_swift),
      }

      const { error: updateError } = await supabase
        .from('annonceurs')
        .update(updatePayload as unknown as never)
        .eq('id', annonceur.id)

      if (updateError) {
        console.error('Erreur lors de la mise à jour:', updateError)
        setError("Une erreur s'est produite lors de la mise à jour")
        return
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      // Rafraîchir les données
      await fetchAnnonceurData()
    } catch (error) {
      console.error('Erreur:', error)
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
    const cleaned = iban.replace(/\s/g, '')
    if (cleaned.length <= 8) return iban
    const firstFour = cleaned.substring(0, 4)
    const lastFour = cleaned.substring(cleaned.length - 4)
    const masked = firstFour + '*'.repeat(cleaned.length - 8) + lastFour
    return masked.match(/.{1,4}/g)?.join(' ') || masked
  }

  const stripeDashboardReady = Boolean(
    stripeStatus?.stripe_onboarding_complete &&
    stripeStatus?.stripe_charges_enabled &&
    stripeStatus?.stripe_payouts_enabled
  )

  const pendingStripeItems = [
    ...(stripeStatus?.stripe_requirements_currently_due ?? []),
    ...(stripeStatus?.stripe_requirements_pending_verification ?? []),
  ]

  const formatStripeRequirement = (value: string) => {
    const normalized = value.replace(/\[\d+\]/g, '')

    const exactLabels: Record<string, string> = {
      'individual.first_name': 'Prénom du titulaire du compte',
      'individual.last_name': 'Nom du titulaire du compte',
      'individual.phone': 'Numéro de téléphone du titulaire du compte',
      'individual.email': 'Adresse e-mail du titulaire du compte',
      'individual.address.line1': 'Adresse du titulaire du compte',
      'individual.address.city': 'Ville du titulaire du compte',
      'individual.address.postal_code': 'Code postal du titulaire du compte',
      'individual.address.country': 'Pays du titulaire du compte',
      'individual.dob.day': 'Jour de naissance du titulaire du compte',
      'individual.dob.month': 'Mois de naissance du titulaire du compte',
      'individual.dob.year': 'Année de naissance du titulaire du compte',
      'representative.first_name': 'Prénom du représentant légal',
      'representative.last_name': 'Nom du représentant légal',
      'representative.phone': 'Numéro de téléphone du représentant légal',
      'representative.email': 'Adresse e-mail du représentant légal',
      'representative.address.line1': 'Adresse du représentant légal',
      'representative.address.city': 'Ville du représentant légal',
      'representative.address.postal_code': 'Code postal du représentant légal',
      'representative.address.country': 'Pays du représentant légal',
      'representative.dob.day': 'Jour de naissance du représentant légal',
      'representative.dob.month': 'Mois de naissance du représentant légal',
      'representative.dob.year': 'Année de naissance du représentant légal',
      'company.name': "Nom légal de l'entreprise",
      'company.tax_id': "Numéro d'identification de l'entreprise",
      'company.address.line1': "Adresse du siège social",
      'company.address.city': "Ville du siège social",
      'company.address.postal_code': "Code postal du siège social",
      'company.address.country': "Pays du siège social",
      'business_profile.name': "Nom affiché de l'organisme",
      'external_account': 'Compte bancaire',
    }

    if (exactLabels[normalized]) {
      return exactLabels[normalized]
    }

    if (normalized.startsWith('representative.verification')) {
      return 'Vérifier le représentant de compte'
    }

    if (normalized.startsWith('individual.verification')) {
      return "Vérifier l'identité du titulaire du compte"
    }

    if (normalized.startsWith('person.verification')) {
      return 'Vérifier la personne rattachée au compte'
    }

    return 'Informations complémentaires à fournir dans Stripe'
  }


  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Mes informations
        </h1>
        <p className="text-gray-600 text-base sm:text-lg">
          Gérez les informations de votre organisme
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Informations de l'organisme */}
          <Card>
            <CardHeader>
              <CardTitle>Informations de l&apos;organisme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom_formation">
                  Nom de l&apos;organisme <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nom_formation"
                  type="text"
                  value={formData.nom_formation}
                  onChange={(e) => handleInputChange("nom_formation", e.target.value)}
                  placeholder="École de théâtre Paris"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@ecole-theatre.fr"
                />
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


          {/* Informations bancaires */}
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
                  Le nom associé au compte bancaire (vous ou votre entreprise)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="iban">
                  IBAN <span className="text-red-500">*</span>
                </Label>
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
                    type={showIban ? "text" : "password"}
                    value={showIban ? formData.iban : maskIban(formData.iban)}
                    onChange={(e) => handleInputChange("iban", e.target.value)}
                    className="pl-12 pr-12 font-mono text-base tracking-wider bg-linear-to-r from-gray-50 to-white border-2 border-gray-200 focus:border-[#E63832] focus:ring-2 focus:ring-[#E63832]/20 transition-all"
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                    maxLength={34}
                  />
                  <button
                    type="button"
                    onClick={() => setShowIban(!showIban)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                  >
                    {showIban ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Votre IBAN est sécurisé et sera utilisé uniquement pour vos paiements
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bic_swift">
                  BIC / SWIFT <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bic_swift"
                  type="text"
                  value={formData.bic_swift}
                  onChange={(e) => handleInputChange("bic_swift", e.target.value)}
                  className="font-mono text-base tracking-wider"
                  placeholder="BNPAFRPP"
                  maxLength={11}
                />
                <p className="text-xs text-gray-500">
                  Code d&apos;identification de votre banque (8 ou 11 caractères)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Connect */}
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
                            'Créer / Synchroniser le compte Stripe'
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
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-700">
                        {stripeStatus?.stripe_has_pending_representative_verification
                          ? "Stripe attend encore la vérification du représentant de compte avant d'activer les paiements."
                          : "Le compte Stripe est créé, mais il manque encore une validation ou une vérification avant l'activation des paiements."}
                      </div>

                      {pendingStripeItems.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                          <p className="font-medium mb-2">Actions restantes côté Stripe</p>
                          <ul className="list-disc pl-5 space-y-1">
                            {Array.from(new Set(pendingStripeItems)).map((item) => (
                              <li key={item}>{formatStripeRequirement(item)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
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

          {/* Messages */}
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

          {/* Bouton de sauvegarde */}
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
