"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Upload, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react"
import { createClient } from "@/app/lib/supabase-client"
import type { OpportunityType, OpportunityModel } from "@/app/types"
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
  date_limite: string
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
    date_limite: "",
    contact_telephone: "",
    contact_email: "",
  })
  const [imagePreview, setImagePreview] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [checkingIdentity, setCheckingIdentity] = useState(true)
  const [identityVerified, setIdentityVerified] = useState(false)

  // Vérifier l'identité de l'annonceur au chargement
  useEffect(() => {
    const checkIdentity = async () => {
      try {
        const supabase = createClient()
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
      const supabase = createClient()
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
      setError("Veuillez sélectionner un modèle (Dernière minute ou Pré-vente)")
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
    if (!formData.date_limite) {
      setError("La date limite est obligatoire")
      return false
    }
    if (new Date(formData.date_limite) <= new Date()) {
      setError("La date limite doit être dans le futur")
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
      const supabase = createClient()

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

      // Vérifier que l'identité est vérifiée (double sécurité)
      if (!annonceur.identite_verifiee) {
        setError("Votre identité doit être vérifiée avant de publier des opportunités")
        setLoading(false)
        return
      }

      let imageUrl: string | null = null
      if (formData.image) {
        imageUrl = await uploadImage(formData.image, annonceur.id)
      }

      const prixBase = parseFloat(formData.prix_base)
      const prixReduit = parseFloat(formData.prix_reduit)

      const insertPayload = {
        annonceur_id: annonceur.id,
        type: formData.type as OpportunityType,
        modele: formData.modele as OpportunityModel,
        titre: formData.titre,
        resume: formData.resume,
        image_url: imageUrl,
        lien_infos: formData.lien_infos.trim() || '',
        prix_base: prixBase,
        prix_reduit: prixReduit,
        nombre_places: parseInt(formData.nombre_places),
        places_restantes: parseInt(formData.nombre_places),
        date_limite: formData.date_limite,
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

  // Si l'identité n'est pas vérifiée, afficher un message
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
                  Vérification d&apos;identité requise
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
                  <strong>Notre équipe examine votre compte.</strong> Vous recevrez un email dès que votre identité sera vérifiée et que vous pourrez publier des opportunités.
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
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="type">Type d&apos;opportunité <span className="text-red-500">*</span></Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => handleInputChange("type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63832]"
                  >
                    <option value="">Sélectionnez un type</option>
                    {Object.entries(OPPORTUNITY_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modele">Modèle <span className="text-red-500">*</span></Label>
                  <select
                    id="modele"
                    value={formData.modele}
                    onChange={(e) => handleInputChange("modele", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63832]"
                  >
                    <option value="">Sélectionnez un modèle</option>
                    {Object.entries(OPPORTUNITY_MODEL_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
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
                {imagePreview && (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
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
                  <Label htmlFor="date_limite">Date limite de réservation <span className="text-red-500">*</span></Label>
                  <Input id="date_limite" type="datetime-local" value={formData.date_limite} onChange={(e) => handleInputChange("date_limite", e.target.value)} />
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
      </form>
    </div>
  )
}
