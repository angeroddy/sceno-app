"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RichTextEditor } from "@/components/opportunity/rich-text-editor"
import { Upload, Loader2, CheckCircle2, AlertCircle, ShieldAlert, Calendar, Info, Clock3, ChevronLeft, ChevronRight } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import type { OpportunityType, OpportunityModel } from "@/types"
import { OPPORTUNITY_TYPE_LABELS } from "@/types"
import { getCroppedImage } from "@/lib/crop-image"
import { OpportunityImageCropper } from "./_components/opportunity-image-cropper"
import { PublishingPrinciplesModal } from "./_components/publishing-principles-modal"
import {
  OpportunityPreviewCard,
  OpportunityPreviewDetail,
  type OpportunityPreviewData,
} from "./_components/opportunity-preview"
import { sanitizeOpportunityHtml } from "@/lib/opportunity-html"
import { getWebsiteInputWithoutWww, normalizeWebsiteUrlWithWwwPrefix } from "@/lib/signup-validation"
import { cn } from "@/lib/utils"
import {
  FRENCH_WEEKDAYS,
  OPPORTUNITY_DATE_MODEL_ERROR,
  combineLocalDateTime,
  formatDateInputValue,
  getCalendarGrid,
  getOpportunityModelForDate,
} from "./_lib/date-helpers"

interface FormData {
  type: OpportunityType | ""
  modele: OpportunityModel | ""
  titre: string
  contenu_mode: "text" | "image" | "text_image" | "image_text"
  resume: string
  image: File | null
  contenu_image: File | null
  lien_infos: string
  prix_base: string
  prix_reduit: string
  nombre_places: string
  date_evenement: string
  contact_telephone: string
  contact_email: string
}

interface PublishingEligibility {
  id: string
  nom_formation: string
  identite_verifiee: boolean
  stripe_onboarding_complete: boolean
  stripe_account_id: string | null
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
}

export default function PublierOpportunitePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    type: "",
    modele: "",
    titre: "",
    contenu_mode: "text",
    resume: "",
    image: null,
    contenu_image: null,
    lien_infos: "",
    prix_base: "",
    prix_reduit: "",
    nombre_places: "",
    date_evenement: "",
    contact_telephone: "",
    contact_email: "",
  })
  const [imagePreview, setImagePreview] = useState<string>("")
  const [rawImageSrc, setRawImageSrc] = useState<string>("")
  const [cropTarget, setCropTarget] = useState<"cover" | "body" | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number
    height: number
    x: number
    y: number
  } | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  const cropperContainerRef = useRef<HTMLDivElement | null>(null)
  const cropAspect = 16 / 9
  const outputType: "image/webp" | "image/jpeg" = "image/webp"
  const quality = 0.85
  const maxSize = 1600
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null)
  const [autoZoomed, setAutoZoomed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [checkingIdentity, setCheckingIdentity] = useState(true)
  const [identityVerified, setIdentityVerified] = useState(false)
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false)
  const [stripeReady, setStripeReady] = useState(false)
  const [advertiserName, setAdvertiserName] = useState("")
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [showPublishingPrinciplesModal, setShowPublishingPrinciplesModal] = useState(false)
  const [publishingPrinciplesStorageKey, setPublishingPrinciplesStorageKey] = useState("")
  const [publishingPrincipleStep, setPublishingPrincipleStep] = useState(0)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const openParametres = (anchor: "validation-compte" | "stripe-connect") => {
    router.push(`/annonceur/parametres#${anchor}`)
  }

  const acceptPublishingPrinciples = () => {
    if (publishingPrinciplesStorageKey) {
      window.localStorage.setItem(publishingPrinciplesStorageKey, "true")
    }
    setShowPublishingPrinciplesModal(false)
  }


  useEffect(() => {
    if (!showPublishingPrinciplesModal) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [showPublishingPrinciplesModal])

  useEffect(() => {
    const checkIdentity = async () => {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/connexion')
          return
        }

        const { data: annonceur, error: annonceurError } = await supabase
          .from('annonceurs')
          .select('id, nom_formation, identite_verifiee, stripe_onboarding_complete, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
          .eq('auth_user_id', user.id)
          .single<PublishingEligibility>()

        if (annonceurError || !annonceur) {
          console.error('Erreur récupération annonceur:', annonceurError)
          setError("Profil annonceur introuvable")
          setCheckingIdentity(false)
          return
        }

        setAdvertiserName(annonceur.nom_formation)
        setIdentityVerified(annonceur.identite_verifiee)
        setStripeOnboardingComplete(Boolean(annonceur.stripe_onboarding_complete))
        const isStripeReady = Boolean(
          annonceur.stripe_onboarding_complete &&
          annonceur.stripe_account_id &&
          annonceur.stripe_charges_enabled &&
          annonceur.stripe_payouts_enabled
        )
        setStripeReady(isStripeReady)

        const principlesStorageKey = `scenio-publishing-principles-accepted:${annonceur.id}`
        setPublishingPrinciplesStorageKey(principlesStorageKey)

        if (annonceur.identite_verifiee && isStripeReady && window.localStorage.getItem(principlesStorageKey) !== "true") {
          setPublishingPrincipleStep(0)
          setShowPublishingPrinciplesModal(true)
        }
      } catch (error) {
        console.error('Erreur lors de la vérification:', error)
        setError("Une erreur s'est produite")
      } finally {
        setCheckingIdentity(false)
      }
    }

    checkIdentity()
  }, [router])

  const handleInputChange = (field: keyof FormData, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError("")
  }

  useEffect(() => {
    if (!formData.date_evenement) return

    const selectedDate = new Date(formData.date_evenement)
    if (Number.isNaN(selectedDate.getTime())) return

    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  }, [formData.date_evenement])

  useEffect(() => {
    if (!isCropping || !cropperContainerRef.current) return
    const observer = new ResizeObserver(() => setAutoZoomed(false))
    observer.observe(cropperContainerRef.current)
    return () => observer.disconnect()
  }, [isCropping])

  useEffect(() => {
    if (!rawImageSrc) return

    const img = new window.Image()
    img.onload = () => {
      setImageInfo({ width: img.width, height: img.height })
      setAutoZoomed(false)
    }
    img.src = rawImageSrc
  }, [rawImageSrc])

  useEffect(() => {
    if (!imageInfo || !cropAspect || autoZoomed) return

    const imageAspect = imageInfo.width / imageInfo.height
    let nextZoom = 1
    if (imageAspect > cropAspect) {
      nextZoom = imageAspect / cropAspect
    } else {
      nextZoom = cropAspect / imageAspect
    }

    setZoom(Math.min(Math.max(nextZoom, 1), 3))
    setAutoZoomed(true)
  }, [imageInfo, cropAspect, autoZoomed])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setRawImageSrc(reader.result as string)
        setCropTarget("cover")
        setIsCropping(true)
        setRotation(0)
        setZoom(1)
        setCrop({ x: 0, y: 0 })
        setCroppedAreaPixels(null)
        setImageInfo(null)
        setAutoZoomed(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const onCropComplete = (_: unknown, croppedPixels: { width: number; height: number; x: number; y: number }) => {
    setCroppedAreaPixels(croppedPixels)
  }

  const applyCrop = async () => {
    if (!rawImageSrc || !croppedAreaPixels || !cropTarget) return

    try {
      const croppedBlob = await getCroppedImage(rawImageSrc, croppedAreaPixels, {
        rotation,
        outputType,
        quality,
        maxSize,
      })
      const ext = outputType === "image/webp" ? "webp" : "jpg"
      const fileName = `opportunite-${Date.now()}.${ext}`
      const croppedFile = new File([croppedBlob], fileName, { type: outputType })

      if (cropTarget === "cover") {
        setFormData(prev => ({ ...prev, image: croppedFile }))
        setImagePreview(URL.createObjectURL(croppedBlob))
      }
      setIsCropping(false)
      setCropTarget(null)
    } catch (error) {
      console.error("Erreur recadrage image:", error)
      setError("Impossible de recadrer l'image. Veuillez réessayer.")
    }
  }

  const previewTitle = formData.titre.trim() || "Titre de l'opportunité"
  const previewOrganizer = (advertiserName || "").trim() || "Votre structure"
  const previewCategory = formData.type ? OPPORTUNITY_TYPE_LABELS[formData.type as OpportunityType] : "Catégorie"
  const previewImage = imagePreview || ""
  const previewDate = formData.date_evenement
    ? new Date(formData.date_evenement)
    : null
  const previewDateLabel = previewDate
    ? previewDate.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "Date de l'événement"
  const previewTimeLabel = previewDate
    ? previewDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "Heure"
  const previewPrice = formData.prix_base ? Number(formData.prix_base) : 0
  const previewReducedPrice = formData.prix_reduit ? Number(formData.prix_reduit) : 0
  const previewDiscount = previewPrice > 0 && previewReducedPrice > 0
    ? Math.floor(((previewPrice - previewReducedPrice) / previewPrice) * 100)
    : 0
  const previewPlaces = formData.nombre_places ? Number(formData.nombre_places) : 0
  const previewResume = sanitizeOpportunityHtml(formData.resume) || "<p>La description apparaîtra ici.</p>"
  const [selectedDatePart, selectedTimePart] = formData.date_evenement
    ? formData.date_evenement.split("T")
    : ["", ""]
  const normalizedTimePart = selectedTimePart?.slice(0, 5) || ""
  const selectedEventDate = formData.date_evenement ? new Date(formData.date_evenement) : null
  const selectedEventDateLabel = selectedEventDate
    ? selectedEventDate.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : "Choisir une date"
  const selectedEventTimeLabel = normalizedTimePart || "Choisir une heure"
  const selectedEventInputLabel = formData.date_evenement
    ? `${selectedEventDate?.toLocaleDateString("fr-FR")} - ${selectedEventTimeLabel}`
    : ""
  const selectedEventMonthLabel = visibleMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  })
  const calendarDays = getCalendarGrid(visibleMonth)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const setEventDatePart = (datePart: string) => {
    handleInputChange("date_evenement", combineLocalDateTime(datePart, normalizedTimePart || "19:00"))
  }

  const setEventTimePart = (timePart: string) => {
    handleInputChange("date_evenement", combineLocalDateTime(selectedDatePart, timePart))
  }

  const preview: OpportunityPreviewData = {
    image: previewImage,
    discount: previewDiscount,
    category: previewCategory,
    title: previewTitle,
    organizer: previewOrganizer,
    dateLabel: previewDateLabel,
    timeLabel: previewTimeLabel,
    price: previewPrice,
    reducedPrice: previewReducedPrice,
    places: previewPlaces,
    resume: previewResume,
  }

  const resetCropper = () => {
    setRawImageSrc("")
    setIsCropping(false)
    setCropTarget(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
  }

  const uploadImage = async (file: File, annonceurId: string, folder = "opportunites"): Promise<string | null> => {
    try {
      const supabase = createBrowserSupabaseClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${annonceurId}-${Date.now()}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Erreur upload image:', uploadError)
        return null
      }

      const { data } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      return null
    }
  }

  const uploadInlineEditorImage = async (file: File): Promise<string | null> => {
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Vous devez être connecté pour ajouter une image")
        return null
      }

      const { data: annonceur, error: annonceurError } = await supabase
        .from("annonceurs")
        .select("id")
        .eq("auth_user_id", user.id)
        .single<{ id: string }>()

      if (annonceurError || !annonceur) {
        setError("Profil annonceur introuvable")
        return null
      }

      return await uploadImage(file, annonceur.id, "opportunites-detail")
    } catch (error) {
      console.error("Erreur upload image éditeur:", error)
      setError("Impossible d'ajouter l'image dans l'éditeur")
      return null
    }
  }

  const validateForm = (): boolean => {
    if (!formData.type) {
      setError("Veuillez sélectionner un type d'opportunité")
      return false
    }
    if (!formData.titre.trim()) {
      setError("Le titre est obligatoire")
      return false
    }
    if (!formData.resume.trim()) {
      setError("La description est obligatoire")
      return false
    }
    // Le lien_infos est optionnel, on vérifie juste le format si fourni
    const normalizedInfoLink = normalizeWebsiteUrlWithWwwPrefix(formData.lien_infos)
    if (normalizedInfoLink) {
      try {
        new URL(normalizedInfoLink)
      } catch {
        setError("Le lien fourni n'est pas une URL valide")
        return false
      }
    }
    if (!formData.prix_base || parseFloat(formData.prix_base) <= 0) {
      setError("Le prix de base doit être supérieur à 0")
      return false
    }
    if (!formData.prix_reduit || parseFloat(formData.prix_reduit) <= 0) {
      setError("Le prix réduit doit être supérieur à 0")
      return false
    }
    if (parseFloat(formData.prix_reduit) >= parseFloat(formData.prix_base)) {
      setError("Le prix réduit doit être inférieur au prix de base")
      return false
    }
    const reduction = ((parseFloat(formData.prix_base) - parseFloat(formData.prix_reduit)) / parseFloat(formData.prix_base)) * 100
    if (reduction < 25) {
      setError("La réduction doit être d'au moins 25%")
      return false
    }
    if (!formData.nombre_places || parseInt(formData.nombre_places) <= 0) {
      setError("Le nombre de places doit être supérieur à 0")
      return false
    }
    if (!formData.date_evenement) {
      setError("La date de l'événement est obligatoire")
      return false
    }
    if (new Date(formData.date_evenement) <= new Date()) {
      setError("La date de l'événement doit être dans le futur")
      return false
    }
    if (!getOpportunityModelForDate(formData.date_evenement)) {
      setError(OPPORTUNITY_DATE_MODEL_ERROR)
      return false
    }
    if (!formData.contact_email.trim()) {
      setError("L'email de contact est obligatoire")
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.contact_email)) {
      setError("L'email de contact n'est pas valide")
      return false
    }

    setError("")
    return true
  }

  const submitOpportunity = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError("")

    try {
      const supabase = createBrowserSupabaseClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Vous devez être connecté")
        setLoading(false)
        return
      }

      const { data: annonceur, error: annonceurError } = await supabase
        .from('annonceurs')
        .select('id, identite_verifiee, stripe_onboarding_complete, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
        .eq('auth_user_id', user.id)
        .single<PublishingEligibility & { id: string }>()

      if (annonceurError || !annonceur) {
        console.error('Erreur récupération annonceur:', annonceurError)
        setError("Profil annonceur introuvable")
        setLoading(false)
        return
      }

      // Vérifier que le compte est vérifié (double sécurité)
      if (!annonceur.identite_verifiee) {
        setError("Votre compte doit être vérifié avant de publier des opportunités")
        setLoading(false)
        return
      }
      if (!annonceur.stripe_onboarding_complete) {
        setError("Finalisez la configuration Stripe avant de publier une opportunité")
        setLoading(false)
        return
      }
      if (
        !annonceur.stripe_account_id ||
        !annonceur.stripe_charges_enabled ||
        !annonceur.stripe_payouts_enabled
      ) {
        setError("Votre compte Stripe Connect doit être entièrement activé avant de publier des opportunités")
        setLoading(false)
        return
      }

      let imageUrl: string | null = null
      if (formData.image) {
        imageUrl = await uploadImage(formData.image, annonceur.id)
      }
      const prixBase = parseFloat(formData.prix_base)
      const prixReduit = parseFloat(formData.prix_reduit)

      const autoModele = getOpportunityModelForDate(formData.date_evenement)
      if (!autoModele) {
        setError(OPPORTUNITY_DATE_MODEL_ERROR)
        setLoading(false)
        return
      }

      const insertPayload = {
        annonceur_id: annonceur.id,
        type: formData.type as OpportunityType,
        modele: autoModele,
        titre: formData.titre,
        contenu_mode: "text",
        resume: formData.resume,
        contenu_image_url: null,
        image_url: imageUrl,
        lien_infos: normalizeWebsiteUrlWithWwwPrefix(formData.lien_infos),
        prix_base: prixBase,
        prix_reduit: prixReduit,
        nombre_places: parseInt(formData.nombre_places),
        places_restantes: parseInt(formData.nombre_places),
        date_evenement: new Date(formData.date_evenement).toISOString(),
        contact_telephone: formData.contact_telephone || null,
        contact_email: formData.contact_email,
        statut: 'en_attente',
      }

      const response = await fetch('/api/annonceur/opportunites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insertPayload),
      })

      const responseData = await response.json().catch(() => null) as { error?: string } | null

      if (!response.ok) {
        setError(responseData?.error || "Impossible de publier l'opportunité. Veuillez vérifier vos informations et réessayer")
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/annonceur/opportunites')
      }, 2000)

    } catch (error) {
      console.error('Erreur:', error)
      setError("Une erreur inattendue s'est produite")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setViewMode("preview")
  }

  // Affichage du loader pendant la vérification
  if (checkingIdentity) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#E63832] mx-auto" />
            <p className="text-gray-600">Vérification de votre compte...</p>
          </div>
        </div>
      </div>
    )
  }

  // Si le compte n'est pas vérifié, afficher un message
  if (!identityVerified) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-10 h-10 text-orange-600" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-orange-900">
                  Vérification du compte requise
                </h2>
                <p className="text-orange-800 text-lg max-w-2xl mx-auto">
                  Votre compte est actuellement en cours de vérification par notre équipe.
                </p>
              </div>

              <div className="bg-white border border-orange-200 rounded-lg p-6 max-w-xl mx-auto text-left">
                <p className="text-sm text-orange-800">
                  Votre compte doit être validé par notre équipe pour que vous puissiez publier une opportunité. Vous serez notifié par mail lorsque ça sera bon !
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stripeOnboardingComplete) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="border-[#6dd0ff] bg-[#6dd0ff]/10">
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-[#6dd0ff]/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-[#0b6f8f]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-2xl font-bold text-[#0b4054]">
                  Configuration Stripe requise
                  </h2>
                  <div className="group relative inline-flex">
                    <button
                      type="button"
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[#0b6f8f]/30 bg-white text-[#0b6f8f]"
                      aria-label="Pourquoi Stripe est requis"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    <div className="pointer-events-none absolute left-1/2 top-9 z-20 w-72 -translate-x-1/2 rounded-md border border-[#6dd0ff] bg-white p-3 text-left text-sm text-gray-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      Stripe est l&apos;intermédiaire que formations-artistiques.fr utilise pour vendre vos places en ligne et qui vérifie au passage votre bonne identité en tant que professionnel.
                    </div>
                  </div>
                </div>
                <p className="text-[#0b4054] text-lg max-w-2xl mx-auto">
                  Votre compte annonceur a bien été validé par nos services mais vous devez désormais configurer Stripe pour publier une opportunité.
                </p>
              </div>

              <div className="bg-white border border-[#6dd0ff] rounded-lg p-6 max-w-xl mx-auto text-left">
                <p className="text-sm text-[#0b4054]">
                  Allez dans vos paramètres et configurez votre compte Stripe.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => openParametres('stripe-connect')}
                  className="bg-[#E63832] hover:bg-[#E63832]/90"
                >
                  Ouvrir mes paramètres
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stripeReady) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-orange-600" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-orange-900">
                  Activation Stripe requise
                </h2>
                <p className="text-orange-800 text-lg max-w-2xl mx-auto">
                  Votre compte Stripe est créé mais vous devez renseigner toutes les informations demandées pour terminer sa configuration. Pour ce faire, veuillez cliquer sur le bouton « Compléter l&apos;onboarding » ci dessus.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => openParametres('stripe-connect')}
                  className="bg-[#E63832] hover:bg-[#E63832]/90"
                >
                  Compléter l&apos;onboarding
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Opportunité créée avec succès !
              </h2>
              <p className="text-gray-600 mb-4">
                Votre opportunité a été soumise et est en attente de validation par un administrateur.
              </p>
              <p className="text-sm text-gray-500">
                Redirection en cours...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (viewMode === "preview") {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Aperçu avant publication
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Vérifiez votre opportunité avant de la publier
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Aperçu en mode vignette</h2>
            <OpportunityPreviewCard preview={preview} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Aperçu en mode détails</h2>
            <OpportunityPreviewDetail preview={preview} />
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>
        )}

        <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-6">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setViewMode("edit")} disabled={loading}>
            Revenir à l&apos;édition de l&apos;opportunité
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto bg-[#E63832] hover:bg-[#E63832]/90"
            onClick={submitOpportunity}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publication en cours...
              </>
            ) : (
              "Publier l'opportunité"
            )}
          </Button>
        </div>
      </div>
    )
  }
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 ">
      <PublishingPrinciplesModal
        open={showPublishingPrinciplesModal}
        step={publishingPrincipleStep}
        onStepChange={setPublishingPrincipleStep}
        onAccept={acceptPublishingPrinciples}
      />

      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            Publier une opportunité
          </h1>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E6DAD0] bg-white text-[#E63832] shadow-sm transition-colors hover:bg-[#F5F0EB] focus:outline-none focus:ring-2 focus:ring-[#E63832]/30"
            aria-label="Revoir les règles de publication"
            title="Revoir les règles de publication"
            onClick={() => {
              setPublishingPrincipleStep(0)
              setShowPublishingPrinciplesModal(true)
            }}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        <p className="text-gray-600 text-base sm:text-lg">
          Remplissez le formulaire ci-dessous pour créer une nouvelle opportunité
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 items-start">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="type">Type d&apos;opportunité <span className="text-red-500">*</span></Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange("type", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63832] bg-white"
                >
                  <option value="" disabled hidden>
                    Sélectionner type d&apos;opportunité
                  </option>
                  {Object.entries(OPPORTUNITY_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titre">Titre de l&apos;opportunité <span className="text-red-500">*</span></Label>
                <Input
                  id="titre"
                  type="text"
                  placeholder="Ex: Stage intensif de comédie musicale"
                  value={formData.titre}
                  onChange={(e) => handleInputChange("titre", e.target.value)}
                  maxLength={150}
                />
                <p className="text-xs text-gray-500">{formData.titre.length}/150 caractères</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Corps de l&apos;opportunité <span className="text-red-500">*</span></Label>
                  <p className="text-sm text-gray-600">
                    Écrivez librement et utilisez le bouton <span className="font-medium">Ajouter</span> dans l&apos;éditeur pour insérer une image verticale directement dans le contenu.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resume">Description détaillée <span className="text-red-500">*</span></Label>
                  <RichTextEditor
                    value={formData.resume}
                    onChange={(value) => handleInputChange("resume", value)}
                    onImageUpload={uploadInlineEditorImage}
                    placeholder="Décrivez votre opportunité de manière détaillée : programme, objectifs, prérequis, etc."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Image de présentation <span className="text-gray-500 text-xs">(facultatif, recommandé)</span></Label>
                <div className="flex items-start gap-4">
                  <label htmlFor="image" className="cursor-pointer flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Choisir une image</span>
                  </label>
                  <input id="image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  {formData.image && <span className="text-sm text-gray-600">{formData.image.name}</span>}
                </div>
                {imagePreview && (
                  <div className="space-y-4">
                    <div
                      className="relative w-full max-w-md rounded-md overflow-hidden border"
                      style={{ aspectRatio: "16 / 9" }}
                    >
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 448px"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button type="button" variant="outline" onClick={() => {
                        setCropTarget("cover")
                        setRawImageSrc(imagePreview)
                        setIsCropping(true)
                        setCrop({ x: 0, y: 0 })
                        setZoom(1)
                        setRotation(0)
                        setCroppedAreaPixels(null)
                        setAutoZoomed(false)
                      }}>
                        Recadrer l&apos;image
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lien_infos">Lien vers plus d&apos;informations <span className="text-gray-500 text-xs">(facultatif)</span></Label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-[#F5F0EB] px-3 text-sm font-medium text-gray-700">
                    www.
                  </span>
                  <Input
                    id="lien_infos"
                    type="text"
                    inputMode="url"
                    placeholder="votre-site.fr/stage-comedie"
                    value={getWebsiteInputWithoutWww(formData.lien_infos)}
                    onChange={(e) => handleInputChange("lien_infos", e.target.value)}
                    className="rounded-l-none"
                  />
                </div>
                <p className="text-xs text-gray-500">URL vers votre site ou page avec plus de détails</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="prix_base">Prix de base (€) <span className="text-red-500">*</span></Label>
                  <Input id="prix_base" type="number" step="0.01" min="0" placeholder="199.99" value={formData.prix_base} onChange={(e) => handleInputChange("prix_base", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prix_reduit">Prix réduit (€) <span className="text-red-500">*</span></Label>
                  <Input id="prix_reduit" type="number" step="0.01" min="0" placeholder="149.99" value={formData.prix_reduit} onChange={(e) => handleInputChange("prix_reduit", e.target.value)} />
                  {formData.prix_base && formData.prix_reduit && (
                    <p className="text-xs text-gray-600">
                      Réduction: {Math.floor(((parseFloat(formData.prix_base) - parseFloat(formData.prix_reduit)) / parseFloat(formData.prix_base)) * 100)}%
                      {Math.floor(((parseFloat(formData.prix_base) - parseFloat(formData.prix_reduit)) / parseFloat(formData.prix_base)) * 100) < 25 && (
                        <span className="text-red-500"> (minimum 25% requis)</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre_places">Nombre de places disponibles <span className="text-red-500">*</span></Label>
                  <Input id="nombre_places" type="number" min="1" placeholder="20" value={formData.nombre_places} onChange={(e) => handleInputChange("nombre_places", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_evenement">Date et heure de l&apos;événement <span className="text-red-500">*</span></Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        id="date_evenement"
                        type="button"
                        className={cn(
                          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition outline-none hover:border-[#E63832]/35 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          !formData.date_evenement && "text-muted-foreground"
                        )}
                      >
                        <span className="truncate">
                          {selectedEventInputLabel || "jj/mm/aaaa --:--"}
                        </span>
                        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[min(92vw,19rem)] rounded-2xl border-[#E6DAD0] bg-[#FFF8F4] p-0 shadow-[0_18px_50px_rgba(35,24,21,0.12)]"
                    >
                      <div className="overflow-hidden rounded-2xl">
                        <div className="border-b border-[#E6DAD0] bg-white px-4 py-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold capitalize text-[#231815]">{selectedEventMonthLabel}</p>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full border-[#E6DAD0] bg-white"
                                onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full border-[#E6DAD0] bg-white"
                                onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 p-3">
                          <div className="grid grid-cols-7 gap-1.5">
                            {FRENCH_WEEKDAYS.map((weekday) => (
                              <div
                                key={weekday}
                                className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A6A58]"
                              >
                                {weekday}
                              </div>
                            ))}
                            {calendarDays.map((day) => {
                              const dayDatePart = formatDateInputValue(day)
                              const isSelected = selectedDatePart === dayDatePart
                              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth()
                              const isPast = day < today

                              return (
                                <button
                                  key={day.toISOString()}
                                  type="button"
                                  onClick={() => setEventDatePart(dayDatePart)}
                                  disabled={isPast}
                                  className={cn(
                                    "relative flex h-8 items-center justify-center rounded-lg text-sm font-medium transition",
                                    isSelected
                                      ? "bg-[#E63832] text-white shadow-lg shadow-[#E63832]/20"
                                      : isCurrentMonth
                                        ? "bg-white text-[#231815] hover:bg-[#F5E4DA]"
                                        : "bg-[#F7EEE8] text-[#B9A198] hover:bg-[#F2E2D8]",
                                    isPast && "cursor-not-allowed opacity-35 hover:bg-inherit"
                                  )}
                                >
                                  {day.getDate()}
                                  {isSelected && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-white/90" />}
                                </button>
                              )
                            })}
                          </div>

                          <div className="rounded-2xl border border-[#E6DAD0] bg-white p-3">
                            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#3C2924]">
                              <Clock3 className="h-4 w-4 text-[#E63832]" />
                              Heure de début
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="date_evenement_time" className="text-[11px] uppercase tracking-[0.16em] text-[#9A6A58]">
                                Heure
                              </Label>
                              <Input
                                id="date_evenement_time"
                                type="time"
                                step="300"
                                value={normalizedTimePart}
                                onChange={(e) => setEventTimePart(e.target.value)}
                                className="border-[#E6DAD0] bg-[#FFF8F4] text-[#231815]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between rounded-2xl bg-[#F5E4DA] px-3 py-2 text-sm text-[#5B3A30]">
                            <div>
                              <p className="font-medium text-[#231815]">Sélection</p>
                              <p className="line-clamp-1 capitalize text-xs">{formData.date_evenement ? `${selectedEventDateLabel} à ${selectedEventTimeLabel}` : "Aucune date choisie"}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-[#E63832] hover:bg-[#E63832]/90"
                              onClick={() => setDatePickerOpen(false)}
                              disabled={!formData.date_evenement}
                            >
                              Valider
                            </Button>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-[#7B6E68]">
                    Sélecteur compact.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email de contact <span className="text-red-500">*</span></Label>
                  <Input id="contact_email" type="email" placeholder="contact@votre-organisme.fr" value={formData.contact_email} onChange={(e) => handleInputChange("contact_email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_telephone">Téléphone de contact <span className="text-gray-500 text-xs">(facultatif)</span></Label>
                  <Input id="contact_telephone" type="tel" placeholder="01 23 45 67 89" value={formData.contact_telephone} onChange={(e) => handleInputChange("contact_telephone", e.target.value)} />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>
              )}

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.back()} disabled={loading}>Annuler</Button>
                <Button
                  type="button"
                  className="w-full sm:flex-1 whitespace-normal text-left sm:text-center bg-[#E63832] hover:bg-[#E63832]/90"
                  onClick={() => {
                    if (!validateForm()) return
                    setViewMode("preview")
                  }}
                  disabled={loading}
                >
                  Passer à l&apos;aperçu et publier l&apos;opportunité
                </Button>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
      <OpportunityImageCropper
        open={isCropping}
        rawImageSrc={rawImageSrc}
        crop={crop}
        zoom={zoom}
        rotation={rotation}
        cropAspect={cropAspect}
        cropperContainerRef={cropperContainerRef}
        setCrop={setCrop}
        setZoom={setZoom}
        setRotation={setRotation}
        onCropComplete={onCropComplete}
        applyCrop={applyCrop}
        resetCropper={resetCropper}
        onResetAdjustments={() => {
          setCrop({ x: 0, y: 0 })
          setZoom(1)
          setRotation(0)
          setAutoZoomed(false)
        }}
      />
    </div>
  )
}

