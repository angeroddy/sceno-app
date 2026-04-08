"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Upload, Loader2, CheckCircle2, AlertCircle, ShieldAlert, Crop, RotateCcw, RotateCw, RefreshCcw, Calendar, MapPin, Tag, Users, ExternalLink, Info, Building2, Clock3, ChevronLeft, ChevronRight } from "lucide-react"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import type { OpportunityType, OpportunityModel } from "@/app/types"
import { OPPORTUNITY_TYPE_LABELS } from "@/app/types"
import Cropper from "react-easy-crop"
import { getCroppedImage } from "@/app/lib/crop-image"
import { sanitizeOpportunityHtml } from "@/app/lib/opportunity-html"
import { OpportunityBodyContent } from "@/components/opportunity-body-content"
import { cn } from "@/lib/utils"

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
  identite_verifiee: boolean
  stripe_onboarding_complete: boolean
  stripe_account_id: string | null
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
}

const FRENCH_WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
function padTimeUnit(value: number) {
  return String(value).padStart(2, "0")
}

function formatDateInputValue(date: Date) {
  return `${date.getFullYear()}-${padTimeUnit(date.getMonth() + 1)}-${padTimeUnit(date.getDate())}`
}

function combineLocalDateTime(datePart: string, timePart: string) {
  if (!datePart) return ""
  return `${datePart}T${timePart || "19:00"}`
}

function getCalendarGrid(month: Date) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDayOfMonth = new Date(year, monthIndex, 1)
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7
  const gridStartDate = new Date(year, monthIndex, 1 - startOffset)
  const rawDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStartDate)
    date.setDate(gridStartDate.getDate() + index)
    return date
  })

  // Trim completely out-of-month trailing weeks to keep the popover compact.
  while (
    rawDays.length > 35 &&
    rawDays.slice(-7).every((day) => day.getMonth() !== monthIndex)
  ) {
    rawDays.splice(-7, 7)
  }

  return rawDays
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
  const [sizeWarning, setSizeWarning] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [checkingIdentity, setCheckingIdentity] = useState(true)
  const [identityVerified, setIdentityVerified] = useState(false)
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false)
  const [stripeReady, setStripeReady] = useState(false)
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const openParametres = (anchor: "validation-compte" | "stripe-connect") => {
    router.push(`/annonceur/parametres#${anchor}`)
  }

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
          .select('identite_verifiee, stripe_onboarding_complete, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
          .eq('auth_user_id', user.id)
          .single<PublishingEligibility>()

        if (annonceurError || !annonceur) {
          console.error('Erreur récupération annonceur:', annonceurError)
          setError("Profil annonceur introuvable")
          setCheckingIdentity(false)
          return
        }

        setIdentityVerified(annonceur.identite_verifiee)
        setStripeOnboardingComplete(Boolean(annonceur.stripe_onboarding_complete))
        setStripeReady(
          Boolean(
            annonceur.stripe_onboarding_complete &&
            annonceur.stripe_account_id &&
            annonceur.stripe_charges_enabled &&
            annonceur.stripe_payouts_enabled
          )
        )
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
        setSizeWarning("")
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
  const previewOrganizer = "Votre structure"
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

  const renderPreviewCard = () => (
    <Card className="overflow-hidden">
      <div className="relative w-full bg-gray-200" style={{ aspectRatio: "16 / 9" }}>
        {previewImage ? (
          <Image
            src={previewImage}
            alt="Preview carte"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 384px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-[#E6DAD0] to-[#F5F0EB]">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
        )}
        {previewDiscount > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <span className="text-white text-xs font-bold bg-[#E63832] px-2 py-1 rounded">
              -{previewDiscount}%
            </span>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="inline-flex items-center rounded-full bg-[#E6DAD0] px-2 py-0.5 text-xs font-medium">
          {previewCategory}
        </div>
        <h3 className="font-bold text-lg line-clamp-2">{previewTitle}</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>France</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{previewDateLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Tag className="w-4 h-4 text-gray-500" />
          {previewDiscount > 0 ? (
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[#E63832]">{previewReducedPrice || previewPrice}€</span>
              <span className="text-xs line-through text-gray-400">{previewPrice || 0}€</span>
            </div>
          ) : (
            <span className="font-semibold text-gray-900">{previewPrice || 0}€</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users className="w-4 h-4" />
          <span>{previewPlaces || 0} place(s)</span>
        </div>
      </CardContent>
    </Card>
  )

  const renderPreviewDetail = () => (
    <Card className="overflow-hidden">
      <div className="relative w-full bg-gray-200" style={{ aspectRatio: "16 / 9" }}>
        {previewImage ? (
          <Image
            src={previewImage}
            alt="Preview détail"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-[#E6DAD0] to-[#F5F0EB]">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
        )}
        {previewDiscount > 0 && (
          <div className="absolute top-4 left-4 z-10">
            <span className="text-white text-sm font-bold bg-[#E63832] px-3 py-1 rounded">
              -{previewDiscount}% de réduction
            </span>
          </div>
        )}
      </div>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="rounded-full bg-[#E6DAD0] px-2 py-0.5">{previewCategory}</span>
          <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5">Aperçu</span>
        </div>
        <h3 className="text-xl font-bold">{previewTitle}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="w-4 h-4" />
          <span>{previewOrganizer}</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{previewDateLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400" />
            <span>{previewTimeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{previewPlaces || 0} place(s)</span>
          </div>
        </div>

        <div className="border-y border-gray-200 py-3">
          {previewDiscount > 0 ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#E63832]">{previewReducedPrice || previewPrice}€</span>
              <span className="text-sm text-gray-400 line-through">{previewPrice || 0}€</span>
            </div>
          ) : (
            <span className="text-2xl font-bold text-gray-900">{previewPrice || 0}€</span>
          )}
        </div>

        <OpportunityBodyContent
          title={previewTitle}
          resume={previewResume}
          bodyImageUrl={null}
          contentMode="text"
          className="prose max-w-none text-gray-700"
        />

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button size="sm" className="w-full sm:w-auto bg-[#E63832] hover:bg-[#E63832]/90">Réserver</Button>
          <Button size="sm" variant="outline" className="w-full sm:w-auto">
            <ExternalLink className="w-4 h-4 mr-1" />
            Voir le site
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const resetCropper = () => {
    setRawImageSrc("")
    setIsCropping(false)
    setCropTarget(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
    setSizeWarning("")
  }

  useEffect(() => {
    if (!cropperContainerRef.current || !imageInfo) return
    const containerWidth = cropperContainerRef.current.clientWidth
    const containerHeight = cropperContainerRef.current.clientHeight
    if (containerWidth === 0 || containerHeight === 0) return

    const minWidth = Math.round(containerWidth * 2)
    const minHeight = Math.round(containerHeight * 2)
    if (imageInfo.width < minWidth || imageInfo.height < minHeight) {
      setSizeWarning("Image un peu petite : le rendu peut paraître flou sur écran large.")
    } else {
      setSizeWarning("")
    }
  }, [imageInfo, isCropping])


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
    if (formData.lien_infos.trim()) {
      try {
        new URL(formData.lien_infos)
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
    if (!formData.contact_email.trim()) {
      setError("L'email de contact est obligatoire")
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.contact_email)) {
      setError("L'email de contact n'est pas valide")
      return false
    }

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

      // Auto-déterminer le modèle selon les règles :
      //   - dernière minute  → événement dans ≤ 72h
      //   - prévente          → événement dans ≥ 56 jours
      //   - entre 72h et 56j  → non autorisé
      const eventDate = new Date(formData.date_evenement)
      const diffDays = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)

      let autoModele: OpportunityModel | null = null
      if (diffDays <= 3) {
        autoModele = 'derniere_minute'
      } else if (diffDays >= 56) {
        autoModele = 'pre_vente'
      } else {
        setError("La date de l'événement doit être soit dans 72h (Dernière minute), soit à au moins 8 semaines (Prévente).")
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
        lien_infos: formData.lien_infos.trim() || '',
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
                  Votre compte doit être validé par l&apos;équipe avant l&apos;activation de la publication et des paiements.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => openParametres('validation-compte')}
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

  if (!stripeOnboardingComplete) {
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
                  Configuration Stripe requise
                </h2>
                <p className="text-orange-800 text-lg max-w-2xl mx-auto">
                  Tant que vous n&apos;avez pas terminé la configuration Stripe, vous ne pouvez pas créer d&apos;opportunité.
                </p>
              </div>

              <div className="bg-white border border-orange-200 rounded-lg p-6 max-w-xl mx-auto text-left">
                <p className="text-sm text-orange-800">
                  Allez dans vos paramètres, créez ou synchronisez votre compte Stripe, puis terminez la configuration.
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
                  La configuration Stripe est terminée, mais votre compte n&apos;est pas encore complètement activé pour les paiements et les virements.
                </p>
              </div>

              <div className="bg-white border border-orange-200 rounded-lg p-6 max-w-xl mx-auto text-left">
                <p className="text-sm text-orange-800">
                  Revenez dans vos paramètres Stripe et vérifiez que les paiements et virements sont bien activés.
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
            {renderPreviewCard()}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Aperçu en mode détails</h2>
            {renderPreviewDetail()}
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
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Publier une opportunité
        </h1>
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
                <Input id="lien_infos" type="url" placeholder="https://www.votre-site.fr/stage-comedie" value={formData.lien_infos} onChange={(e) => handleInputChange("lien_infos", e.target.value)} />
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
      {isCropping && rawImageSrc && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl max-h-[85vh] sm:max-h-[88vh] bg-white rounded-lg overflow-y-auto shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recadrer l&apos;image
                </h2>
                <span className="text-xs font-medium bg-[#E6DAD0] text-gray-900 px-2 py-1 rounded-full">
                  16:9
                </span>
              </div>
              <Button type="button" variant="outline" onClick={resetCropper}>
                Fermer
              </Button>
            </div>

            <div className="p-5 space-y-4">
              <div
                ref={cropperContainerRef}
                className="relative w-full max-w-2xl mx-auto rounded-md overflow-hidden border bg-black"
                style={{ aspectRatio: "16 / 9" }}
              >
                <Cropper
                  image={rawImageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={cropAspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  objectFit="horizontal-cover"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button type="button" variant="outline" onClick={() => setRotation((prev) => prev - 90)}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setRotation((prev) => prev + 90)}>
                        <RotateCw className="w-4 h-4" />
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

              {sizeWarning && (
                <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-md p-3">
                  {sizeWarning}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" className="bg-[#E63832] hover:bg-[#E63832]/90" onClick={applyCrop}>
                  <Crop className="w-4 h-4 mr-2" />
                  Appliquer le recadrage
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setCrop({ x: 0, y: 0 })
                  setZoom(1)
                  setRotation(0)
                  setAutoZoomed(false)
                }}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

