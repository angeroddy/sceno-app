"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AppModal } from "@/components/ui/app-modal"
import { RichTextEditor } from "@/components/opportunity/rich-text-editor"
import { Upload, Loader2, CheckCircle2, AlertCircle, ChevronLeft, Lock, Trash2 } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import Image from "next/image"
import type { OpportunityType, OpportunityModel, Opportunite, Annonceur } from "@/types"
import { OPPORTUNITY_TYPE_LABELS, OPPORTUNITY_MODEL_LABELS } from "@/types"
import { getCroppedImage } from "@/lib/crop-image"
import { sanitizeOpportunityHtml } from "@/lib/opportunity-html"
import { getWebsiteInputWithoutWww, normalizeWebsiteUrlWithWwwPrefix } from "@/lib/signup-validation"
import { OpportunityImageCropper } from "./_components/opportunity-image-cropper"
import {
  OpportunityPreviewCard,
  OpportunityPreviewDetail,
  type OpportunityPreviewData,
} from "./_components/opportunity-preview"

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

type EditableOpportunity = Opportunite & {
  annonceur?: Pick<Annonceur, "nom_formation"> | null
}

export default function ModifierOpportunitePage() {
  const params = useParams()
  const router = useRouter()
  const [opportuniteId, setOpportuniteId] = useState<string | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
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
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit")
  const [existingOpportunity, setExistingOpportunity] = useState<EditableOpportunity | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Extraire l'ID
  useEffect(() => {
    if (params?.id) {
      const id = typeof params.id === 'string' ? params.id : params.id[0]
      setOpportuniteId(id)
    }
  }, [params])

  // Charger les données de l'opportunité
  useEffect(() => {
    if (opportuniteId) {
      loadOpportuniteData()
    }
  }, [opportuniteId])

  const loadOpportuniteData = async () => {
    if (!opportuniteId) return

    try {
      setLoadingData(true)
      const response = await fetch(`/api/annonceur/opportunites/${opportuniteId}`)

      if (!response.ok) {
        throw new Error('Opportunité introuvable')
      }

      const data = await response.json()
      const opp: EditableOpportunity = data.opportunite
      setExistingOpportunity(opp)

      if (opp.statut === "supprimee") {
        router.replace(`/annonceur/opportunites/${opp.id}`)
        return
      }

      // Pré-remplir le formulaire
      setFormData({
        type: opp.type,
        modele: opp.modele,
        titre: opp.titre,
        contenu_mode: "text",
        resume: opp.resume,
        image: null,
        contenu_image: null,
        lien_infos: opp.lien_infos || "",
        prix_base: opp.prix_base.toString(),
        prix_reduit: opp.prix_reduit.toString(),
        nombre_places: opp.nombre_places.toString(),
        date_evenement: new Date(opp.date_evenement).toISOString().slice(0, 16),
        contact_telephone: opp.contact_telephone || "",
        contact_email: opp.contact_email,
      })

      setCurrentImageUrl(opp.image_url)
      if (opp.image_url) {
        setImagePreview(opp.image_url)
      }
    } catch (err) {
      console.error('Erreur:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoadingData(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError("")
  }

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
    if (!imageInfo || autoZoomed) return

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
    } catch (cropError) {
      console.error("Erreur recadrage image:", cropError)
      setError("Impossible de recadrer l'image. Veuillez réessayer.")
    }
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

      const { data: annonceurData } = await supabase
        .from("annonceurs")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      const annonceur = annonceurData as Pick<Annonceur, "id"> | null
      if (!annonceur) {
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
    if (!formData.modele) {
      setError("Veuillez sélectionner un modèle")
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

    const eventDate = new Date(formData.date_evenement)
    const diffDays = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (formData.modele === 'derniere_minute' && diffDays > 3) {
      setError("Le modèle 'Dernière minute' n'est autorisé que si l'événement est dans 72h.")
      return false
    }
    if (formData.modele === 'pre_vente' && diffDays < 28) {
      setError("Le modèle 'Prévente' n'est autorisé que si l'événement est à au moins 1 mois.")
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
    if (!validateForm()) {
      return
    }

    if (!existingOpportunity) {
      setError("Impossible de charger les informations actuelles de l'opportunité.")
      return
    }

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

      const { data: annonceurData } = await supabase
        .from('annonceurs')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      const annonceur = annonceurData as Pick<Annonceur, 'id'> | null

      if (!annonceur) {
        setError("Profil annonceur introuvable")
        setLoading(false)
        return
      }

      // Upload nouvelle image si fournie
      let imageUrl = currentImageUrl
      if (formData.image) {
        const uploadedUrl = await uploadImage(formData.image, annonceur.id)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      }
      const prixBase = existingOpportunity.prix_base
      const prixReduit = existingOpportunity.prix_reduit
      const nextNombrePlaces = existingOpportunity.nombre_places
      const reservedPlaces = Math.max(existingOpportunity.nombre_places - existingOpportunity.places_restantes, 0)
      const nextStatus = existingOpportunity?.statut === 'en_attente'
        ? 'en_attente'
        : existingOpportunity?.statut === 'complete' || existingOpportunity?.statut === 'expiree'
          ? existingOpportunity.statut
          : 'en_attente'

      if (nextNombrePlaces < reservedPlaces) {
        setError(`Impossible de définir ${nextNombrePlaces} place(s) car ${reservedPlaces} réservation(s) sont déjà confirmées.`)
        setLoading(false)
        return
      }

      const nextPlacesRestantes = Math.max(nextNombrePlaces - reservedPlaces, 0)

      // reduction_pourcentage est une colonne générée par trigger DB — on ne l'envoie pas dans le payload
      const { data: updatedRow, error: updateError } = await supabase
        .from('opportunites')
        .update({
          type: formData.type as OpportunityType,
          modele: formData.modele as OpportunityModel,
          titre: formData.titre,
          contenu_mode: "text",
          resume: formData.resume,
          contenu_image_url: null,
          image_url: imageUrl,
          lien_infos: normalizeWebsiteUrlWithWwwPrefix(formData.lien_infos),
          prix_base: prixBase,
          prix_reduit: prixReduit,
          nombre_places: nextNombrePlaces,
          places_restantes: nextPlacesRestantes,
          date_evenement: existingOpportunity.date_evenement,
          contact_telephone: formData.contact_telephone || null,
          contact_email: formData.contact_email,
          statut: nextStatus,
        } as unknown as never)
        .eq('id', opportuniteId as string)
        .eq('annonceur_id', annonceur.id)
        .select('id')
        .maybeSingle()

      if (updateError || !updatedRow) {
        console.error('Erreur mise à jour:', {
          message: updateError?.message,
          details: updateError?.details,
          hint: updateError?.hint,
          code: updateError?.code,
          raw: updateError
        })
        setError(updateError?.message || "Mise à jour refusée. Vérifiez vos permissions et la cohérence des données.")
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/annonceur/opportunites/${opportuniteId}`)
      }, 2000)

    } catch (error) {
      console.error('Erreur:', error)
      setError("Une erreur s'est produite lors de la mise à jour")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setViewMode("preview")
  }

  const handleDeleteOpportunity = async () => {
    if (!opportuniteId) return

    try {
      setDeleteLoading(true)
      const response = await fetch(`/api/annonceur/opportunites/${opportuniteId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Suppression impossible")
      }

      router.replace("/annonceur/opportunites?statut=supprimee")
    } catch (err) {
      console.error("Erreur suppression:", err)
      setDeleteModalOpen(false)
      setError(err instanceof Error ? err.message : "Une erreur s'est produite lors de la suppression")
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#E63832]" />
          <p className="text-gray-600">Chargement de l&apos;opportunité...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-900 mb-2">
              Opportunité mise à jour !
            </h2>
            <p className="text-green-700 mb-4">
              Les modifications ont été enregistrées avec succès.
            </p>
            <p className="text-sm text-green-600">
              Redirection en cours...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const reductionPourcentage = formData.prix_base && formData.prix_reduit
    ? ((parseFloat(formData.prix_base) - parseFloat(formData.prix_reduit)) / parseFloat(formData.prix_base)) * 100
    : 0

  const previewTitle = formData.titre.trim() || "Titre de l'opportunité"
  const previewOrganizer = existingOpportunity?.annonceur?.nom_formation?.trim() || "Votre structure"
  const previewCategory = formData.type ? OPPORTUNITY_TYPE_LABELS[formData.type as OpportunityType] : "Catégorie"
  const previewModel = formData.modele ? OPPORTUNITY_MODEL_LABELS[formData.modele as OpportunityModel] : "Modèle"
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

  const preview: OpportunityPreviewData = {
    image: previewImage,
    discount: previewDiscount,
    category: previewCategory,
    model: previewModel,
    title: previewTitle,
    organizer: previewOrganizer,
    dateLabel: previewDateLabel,
    timeLabel: previewTimeLabel,
    price: previewPrice,
    reducedPrice: previewReducedPrice,
    places: previewPlaces,
    resume: previewResume,
  }

  if (viewMode === "preview") {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Aperçu avant mise à jour
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Vérifiez les modifications avant de les enregistrer
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
            Revenir à l&apos;édition
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
                Mise à jour en cours...
              </>
            ) : (
              "Enregistrer les modifications"
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className=" mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 hover:bg-[#E6DAD0]"
            onClick={() => router.push(`/annonceur/opportunites/${opportuniteId}`)}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Retour aux détails
          </Button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Modifier l&apos;opportunité
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Modifiez les informations de votre opportunité
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Messages d'erreur */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Informations générales */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">
                Informations générales
              </h2>

              <div>
                <Label htmlFor="titre">Titre de l&apos;opportunité *</Label>
                <Input
                  id="titre"
                  type="text"
                  value={formData.titre}
                  onChange={(e) => handleInputChange('titre', e.target.value)}
                  placeholder="Ex: Stage intensif de comédie"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.titre.length}/100 caractères
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Corps de l&apos;opportunité *</Label>
                  <p className="text-sm text-gray-600">
                    Écrivez librement et utilisez le bouton <span className="font-medium">Ajouter</span> dans l&apos;éditeur pour insérer une image verticale directement dans le contenu.
                  </p>
                </div>

                <div>
                  <Label htmlFor="resume">Description *</Label>
                  <RichTextEditor
                    value={formData.resume}
                    onChange={(value) => handleInputChange('resume', value)}
                    onImageUpload={uploadInlineEditorImage}
                    placeholder="Décrivez votre opportunité en détail..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="lien_infos">Lien vers plus d&apos;informations</Label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-[#F5F0EB] px-3 text-sm font-medium text-gray-700">
                    www.
                  </span>
                  <Input
                    id="lien_infos"
                    type="text"
                    inputMode="url"
                    value={getWebsiteInputWithoutWww(formData.lien_infos)}
                    onChange={(e) => handleInputChange('lien_infos', e.target.value)}
                    placeholder="votre-site.com/opportunite"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">
                Image de présentation
              </h2>

              <div>
                <Label htmlFor="image">
                  {currentImageUrl ? 'Remplacer l\'image' : 'Ajouter une image'}
                </Label>
                <div className="mt-2">
                  {imagePreview && (
                    <div className="mb-4 relative w-full max-w-md rounded-lg overflow-hidden border" style={{ aspectRatio: "16 / 9" }}>
                      <Image
                        src={imagePreview}
                        alt="Aperçu"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 448px"
                      />
                    </div>
                  )}
                  {imagePreview && (
                    <div className="mb-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCropTarget("cover")
                          setRawImageSrc(imagePreview)
                          setIsCropping(true)
                          setRotation(0)
                          setZoom(1)
                          setCrop({ x: 0, y: 0 })
                          setCroppedAreaPixels(null)
                          setImageInfo(null)
                          setAutoZoomed(false)
                        }}
                      >
                        Recadrer l&apos;image
                      </Button>
                    </div>
                  )}
                  <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#E63832] transition-colors">
                    <Upload className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {currentImageUrl ? 'Changer l\'image' : 'Cliquez pour télécharger une image'}
                    </span>
                    <input
                      id="image"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prix et réduction */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">
                Tarification
              </h2>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Cette section n&apos;est plus modifiable.</p>
                    <p className="mt-1 text-amber-800">
                      Si une erreur s&apos;est glissée dans la tarification, supprimez cette opportunité puis recréez-la avec les bonnes informations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prix_base">Prix de base (€) *</Label>
                  <Input
                    id="prix_base"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prix_base}
                    readOnly
                    disabled
                  />
                </div>

                <div>
                  <Label htmlFor="prix_reduit">Prix réduit (€) *</Label>
                  <Input
                    id="prix_reduit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prix_reduit}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              {reductionPourcentage > 0 && (
                <div className="p-4 bg-[#F5F0EB] rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Réduction:</strong> {Math.floor(reductionPourcentage)}%
                    {reductionPourcentage < 25 && (
                      <span className="text-red-600 ml-2">(minimum 25% requis)</span>
                    )}
                  </p>
                  {reductionPourcentage >= 25 && (
                    <p className="text-sm text-gray-700 mt-1">
                      <strong>Économie:</strong> {(parseFloat(formData.prix_base) - parseFloat(formData.prix_reduit)).toFixed(2)}€
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Places et date de l'événement */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">
                Disponibilité
              </h2>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Cette section n&apos;est plus modifiable.</p>
                    <p className="mt-1 text-amber-800">
                      Si la date ou le nombre de places est erroné, supprimez cette opportunité puis publiez-en une nouvelle.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre_places">Nombre de places *</Label>
                  <Input
                    id="nombre_places"
                    type="number"
                    min="1"
                    value={formData.nombre_places}
                    readOnly
                    disabled
                  />
                </div>

                <div>
                  <Label htmlFor="date_evenement">Date et heure de l&apos;événement *</Label>
                  <Input
                    id="date_evenement"
                    type="datetime-local"
                    value={formData.date_evenement}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">
                Informations de contact
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_email">Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_telephone">Téléphone</Label>
                  <Input
                    id="contact_telephone"
                    type="tel"
                    value={formData.contact_telephone}
                    onChange={(e) => handleInputChange('contact_telephone', e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Boutons d'action */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/annonceur/opportunites/${opportuniteId}`)}
              disabled={loading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#E63832] hover:bg-[#E63832]/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mise à jour en cours...
                </>
              ) : (
                "Passer a l'apercu des modifications"
              )}
            </Button>
          </div>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-red-900">
                  Supprimer l&apos;opportunité
                </h2>
                <p className="mt-2 text-sm text-red-800">
                  En cas d&apos;erreur sur la tarification ou la disponibilité, vous pouvez supprimer cette opportunité. Elle apparaîtra ensuite comme supprimée dans vos opportunités et ne sera plus consultable par les comédiens.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
                onClick={() => setDeleteModalOpen(true)}
                disabled={deleteLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer cette opportunité
              </Button>
            </CardContent>
          </Card>
        </form>

        <AppModal
          open={deleteModalOpen}
          onClose={() => !deleteLoading && setDeleteModalOpen(false)}
          title="Supprimer cette opportunité ?"
          description="Cette action la rendra non consultable pour les comédiens et elle restera visible comme supprimée dans vos opportunités."
          tone="warning"
          footer={
            <>
              <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleteLoading}>
                Annuler
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDeleteOpportunity}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  "Supprimer"
                )}
              </Button>
            </>
          }
        />

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
        />
      </div>
    </div>
  )
}
