"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Upload, Loader2, CheckCircle2, AlertCircle, ShieldAlert, Crop, RotateCcw, RotateCw, RefreshCcw, Calendar, MapPin, Tag, Users, ExternalLink, Info, Building2 } from "lucide-react"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import type { OpportunityType, OpportunityModel } from "@/app/types"
import { OPPORTUNITY_TYPE_LABELS } from "@/app/types"
import Cropper from "react-easy-crop"
import { getCroppedImage } from "@/app/lib/crop-image"

interface FormData {
  type: OpportunityType | ""
  modele: OpportunityModel | ""
  titre: string
  resume: string
  image: File | null
  lien_infos: string
  prix_base: string
  prix_reduit: string
  nombre_places: string
  date_evenement: string
  contact_telephone: string
  contact_email: string
}

export default function PublierOpportunitePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    type: "",
    modele: "",
    titre: "",
    resume: "",
    image: null,
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
  const [cropAspect, setCropAspect] = useState(16 / 9)
  const [aspectMode, setAspectMode] = useState<"detail" | "card" | "square">("detail")
  const [outputType, setOutputType] = useState<"image/webp" | "image/jpeg">("image/webp")
  const [quality, setQuality] = useState(0.85)
  const [maxSize, setMaxSize] = useState(1600)
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null)
  const [autoZoomed, setAutoZoomed] = useState(false)
  const [sizeWarning, setSizeWarning] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [checkingIdentity, setCheckingIdentity] = useState(true)
  const [identityVerified, setIdentityVerified] = useState(false)
  const [activePreview, setActivePreview] = useState<"card" | "detail">("card")

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
          .select('identite_verifiee')
          .eq('auth_user_id', user.id)
          .single<{ identite_verifiee: boolean }>()

        if (annonceurError || !annonceur) {
          console.error('Erreur récupération annonceur:', annonceurError)
          setError("Profil annonceur introuvable")
          setCheckingIdentity(false)
          return
        }

        setIdentityVerified(annonceur.identite_verifiee)
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
    if (!isCropping || !cropperContainerRef.current) return

    const updateAspect = () => {
      const el = cropperContainerRef.current
      if (!el) return
      const width = el.clientWidth
      const height = el.clientHeight
      if (width > 0 && height > 0) {
        const detailAspect = width / height
        if (aspectMode === "detail") {
          setCropAspect(detailAspect)
          setAutoZoomed(false)
        }
      }
    }

    updateAspect()

    const observer = new ResizeObserver(() => updateAspect())
    observer.observe(cropperContainerRef.current)

    return () => observer.disconnect()
  }, [isCropping, aspectMode])

  useEffect(() => {
    if (!rawImageSrc) return

    const img = new Image()
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
        setIsCropping(true)
        setRotation(0)
        setZoom(1)
        setCrop({ x: 0, y: 0 })
        setCroppedAreaPixels(null)
        setAspectMode("detail")
        setOutputType("image/webp")
        setQuality(0.85)
        setMaxSize(1600)
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
    if (!rawImageSrc || !croppedAreaPixels) return

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

      setFormData(prev => ({ ...prev, image: croppedFile }))
      setImagePreview(URL.createObjectURL(croppedBlob))
      setIsCropping(false)
    } catch (error) {
      console.error("Erreur recadrage image:", error)
      setError("Impossible de recadrer l'image. Veuillez rÃ©essayer.")
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
    ? Math.round(((previewPrice - previewReducedPrice) / previewPrice) * 100)
    : 0
  const previewPlaces = formData.nombre_places ? Number(formData.nombre_places) : 0
  const previewResume = formData.resume || "<p>La description apparaîtra ici.</p>"

  const renderPreviewCard = () => (
    <Card className="overflow-hidden">
      <div className="relative h-48 bg-gray-200">
        {previewImage ? (
          <img src={previewImage} alt="Preview carte" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E6DAD0] to-[#F5F0EB]">
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
      <div className="relative h-[400px] md:h-[500px] bg-gray-200">
        {previewImage ? (
          <img src={previewImage} alt="Preview détail" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E6DAD0] to-[#F5F0EB]">
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

        <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: previewResume }} />

        <div className="flex gap-2 pt-2">
          <Button size="sm" className="bg-[#E63832] hover:bg-[#E63832]/90">Réserver</Button>
          <Button size="sm" variant="outline">
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
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
    setAspectMode("detail")
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

  useEffect(() => {
    if (aspectMode === "card") {
      setCropAspect(16 / 9)
      setAutoZoomed(false)
    }
    if (aspectMode === "square") {
      setCropAspect(1)
      setAutoZoomed(false)
    }
  }, [aspectMode])

  const uploadImage = async (file: File, annonceurId: string): Promise<string | null> => {
    try {
      const supabase = createBrowserSupabaseClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${annonceurId}-${Date.now()}.${fileExt}`
      const filePath = `opportunites/${fileName}`

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
        .select('id, identite_verifiee')
        .eq('auth_user_id', user.id)
        .single<{ id: string; identite_verifiee: boolean }>()

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
        resume: formData.resume,
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

      const { error: insertError } = await supabase
        .from('opportunites')
        .insert(insertPayload as unknown as never)

      if (insertError) {
        console.error('Erreur lors de la création:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          fullError: insertError
        })
        setError("Impossible de publier l'opportunité. Veuillez vérifier vos informations et réessayer")
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
                <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Pourquoi cette vérification ?
                </h3>
                <ul className="space-y-2 text-sm text-orange-800">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>Pour garantir la sécurité et la confiance sur notre plateforme</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>Pour protéger les comédiens contre les fraudes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>Pour assurer la qualité des opportunités publiées</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-xl mx-auto">
                <p className="text-sm text-blue-900">
                  <strong>Notre équipe examine votre compte.</strong> Vous recevrez un email dès que votre compte sera vérifié et que vous pourrez publier des opportunités.
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-4">
                <Button
                  onClick={() => router.push('/annonceur')}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  Retour au tableau de bord
                </Button>
                <Button
                  onClick={() => router.push('/annonceur/parametres')}
                  className="bg-[#E63832] hover:bg-[#E63832]/90"
                >
                  Voir mes informations
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

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 ">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Publier une opportunité
        </h1>
        <p className="text-gray-600 text-lg">
          Remplissez le formulaire ci-dessous pour créer une nouvelle opportunité
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
                  <option value="">Sélectionner un type...</option>
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

              <div className="space-y-2">
                <Label htmlFor="resume">Description détaillée <span className="text-red-500">*</span></Label>
                <RichTextEditor
                  value={formData.resume}
                  onChange={(value) => handleInputChange("resume", value)}
                  placeholder="Décrivez votre opportunité de manière détaillée : programme, objectifs, prérequis, etc."
                />
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
                {isCropping && rawImageSrc && (
                  <div className="space-y-5">
                    <div
                      ref={cropperContainerRef}
                      className="relative -mx-6 w-[calc(100%+3rem)] h-[400px] md:h-[500px] rounded-none overflow-hidden border-y bg-black"
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

                    <div className="flex flex-wrap gap-3 items-center">
                      <span className="text-sm text-gray-600">Format</span>
                      <Button
                        type="button"
                        variant={aspectMode === "detail" ? "default" : "outline"}
                        className={aspectMode === "detail" ? "bg-[#E63832] hover:bg-[#E63832]/90" : ""}
                        onClick={() => setAspectMode("detail")}
                      >
                        Détail
                      </Button>
                      <Button
                        type="button"
                        variant={aspectMode === "card" ? "default" : "outline"}
                        className={aspectMode === "card" ? "bg-[#E63832] hover:bg-[#E63832]/90" : ""}
                        onClick={() => setAspectMode("card")}
                      >
                        Carte
                      </Button>
                      <Button
                        type="button"
                        variant={aspectMode === "square" ? "default" : "outline"}
                        className={aspectMode === "square" ? "bg-[#E63832] hover:bg-[#E63832]/90" : ""}
                        onClick={() => setAspectMode("square")}
                      >
                        Carré
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
                          <div className="flex gap-2">
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

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-600">Format export</label>
                          <select
                            value={outputType}
                            onChange={(e) => setOutputType(e.target.value as "image/webp" | "image/jpeg")}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="image/webp">WEBP (léger)</option>
                            <option value="image/jpeg">JPEG (compatibilité)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-600">Qualité</label>
                          <input
                            type="range"
                            min={0.5}
                            max={1}
                            step={0.05}
                            value={quality}
                            onChange={(e) => setQuality(Number(e.target.value))}
                            className="w-40"
                          />
                          <span className="text-xs text-gray-500">{Math.round(quality * 100)}%</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-600">Taille max</label>
                          <input
                            type="range"
                            min={800}
                            max={2400}
                            step={100}
                            value={maxSize}
                            onChange={(e) => setMaxSize(Number(e.target.value))}
                            className="w-40"
                          />
                          <span className="text-xs text-gray-500">{maxSize}px</span>
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
                      <Button type="button" variant="outline" onClick={resetCropper}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
                {!isCropping && imagePreview && (
                  <div className="space-y-4">
                    <div className="relative -mx-6 w-[calc(100%+3rem)] h-[400px] md:h-[500px] rounded-none overflow-hidden border-y">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Aperçu détail</p>
                        <div className="relative w-full h-40 rounded-md overflow-hidden border">
                          <img src={imagePreview} alt="Preview détail" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Aperçu carte</p>
                        <div className="relative w-full h-32 rounded-md overflow-hidden border">
                          <img src={imagePreview} alt="Preview carte" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Aperçu carré</p>
                        <div className="relative w-32 h-32 rounded-md overflow-hidden border">
                          <img src={imagePreview} alt="Preview carré" className="w-full h-full object-cover" />
                        </div>
                      </div>
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
                      Réduction: {Math.round(((parseFloat(formData.prix_base) - parseFloat(formData.prix_reduit)) / parseFloat(formData.prix_base)) * 100)}%
                      {Math.round(((parseFloat(formData.prix_base) - parseFloat(formData.prix_reduit)) / parseFloat(formData.prix_base)) * 100) < 25 && (
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
                  <Label htmlFor="date_evenement">Date et heure de l'événement <span className="text-red-500">*</span></Label>
                  <Input id="date_evenement" type="datetime-local" value={formData.date_evenement} onChange={(e) => handleInputChange("date_evenement", e.target.value)} />
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

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Annuler</Button>
                <Button type="submit" className="bg-[#E63832] hover:bg-[#E63832]/90 flex-1" disabled={loading}>
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
            </CardContent>
          </Card>

          <div className="lg:sticky lg:top-6 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Aperçu en temps réel</h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={activePreview === "card" ? "default" : "outline"}
                      className={activePreview === "card" ? "bg-[#E63832] hover:bg-[#E63832]/90" : ""}
                      onClick={() => setActivePreview("card")}
                    >
                      Carte
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={activePreview === "detail" ? "default" : "outline"}
                      className={activePreview === "detail" ? "bg-[#E63832] hover:bg-[#E63832]/90" : ""}
                      onClick={() => setActivePreview("detail")}
                    >
                      Détail
                    </Button>
                  </div>
                </div>
                {activePreview === "card" ? renderPreviewCard() : renderPreviewDetail()}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
