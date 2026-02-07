"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Upload, Loader2, CheckCircle2, AlertCircle, ChevronLeft } from "lucide-react"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import Image from "next/image"
import type { OpportunityType, OpportunityModel, Opportunite, Annonceur } from "@/app/types"
import { OPPORTUNITY_TYPE_LABELS, OPPORTUNITY_MODEL_LABELS } from "@/app/types"

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

export default function ModifierOpportunitePage() {
  const params = useParams()
  const router = useRouter()
  const [opportuniteId, setOpportuniteId] = useState<string | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
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
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

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
      const opp: Opportunite = data.opportunite

      // Pré-remplir le formulaire
      setFormData({
        type: opp.type,
        modele: opp.modele,
        titre: opp.titre,
        resume: opp.resume,
        image: null,
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, image: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

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

    const eventDate = new Date(formData.date_evenement)
    const diffDays = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (formData.modele === 'derniere_minute' && diffDays > 3) {
      setError("Le modèle 'Dernière minute' n'est autorisé que si l'événement est dans 72h.")
      return false
    }
    if (formData.modele === 'pre_vente' && diffDays < 56) {
      setError("Le modèle 'Prévente' n'est autorisé que si l'événement est à au moins 8 semaines.")
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

    if (!validateForm()) {
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

      const prixBase = parseFloat(formData.prix_base)
      const prixReduit = parseFloat(formData.prix_reduit)
      const reductionPourcentage = ((prixBase - prixReduit) / prixBase) * 100

      // reduction_pourcentage est une colonne générée par trigger DB — on ne l'envoie pas dans le payload
      const { data: updatedRow, error: updateError } = await supabase
        .from('opportunites')
        .update({
          type: formData.type as OpportunityType,
          modele: formData.modele as OpportunityModel,
          titre: formData.titre,
          resume: formData.resume,
          image_url: imageUrl,
          lien_infos: formData.lien_infos?.trim() || "",
          prix_base: prixBase,
          prix_reduit: prixReduit,
          nombre_places: parseInt(formData.nombre_places),
          date_evenement: new Date(formData.date_evenement).toISOString(),
          contact_telephone: formData.contact_telephone || null,
          contact_email: formData.contact_email,
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
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Modifier l&apos;opportunité
          </h1>
          <p className="text-gray-600">
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

              <div>
                <Label htmlFor="resume">Description *</Label>
                <RichTextEditor
                  value={formData.resume}
                  onChange={(value) => handleInputChange('resume', value)}
                  placeholder="Décrivez votre opportunité en détail..."
                />
              </div>

              <div>
                <Label htmlFor="lien_infos">Lien vers plus d&apos;informations</Label>
                <Input
                  id="lien_infos"
                  type="url"
                  value={formData.lien_infos}
                  onChange={(e) => handleInputChange('lien_infos', e.target.value)}
                  placeholder="https://votre-site.com/opportunite"
                />
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
                    <div className="mb-4 relative w-full h-64 rounded-lg overflow-hidden">
                      <Image
                        src={imagePreview}
                        alt="Aperçu"
                        fill
                        className="object-cover"
                        unoptimized
                      />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prix_base">Prix de base (€) *</Label>
                  <Input
                    id="prix_base"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prix_base}
                    onChange={(e) => handleInputChange('prix_base', e.target.value)}
                    placeholder="100.00"
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
                    onChange={(e) => handleInputChange('prix_reduit', e.target.value)}
                    placeholder="75.00"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre_places">Nombre de places *</Label>
                  <Input
                    id="nombre_places"
                    type="number"
                    min="1"
                    value={formData.nombre_places}
                    onChange={(e) => handleInputChange('nombre_places', e.target.value)}
                    placeholder="20"
                  />
                </div>

                <div>
                  <Label htmlFor="date_evenement">Date et heure de l'événement *</Label>
                  <Input
                    id="date_evenement"
                    type="datetime-local"
                    value={formData.date_evenement}
                    onChange={(e) => handleInputChange('date_evenement', e.target.value)}
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
                'Enregistrer les modifications'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
