"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Eye, EyeOff, CheckCircle2, FileText, AlertCircle } from "lucide-react"
import { createClient } from "@/app/lib/supabase-client"
import type { Annonceur } from "@/app/types"
import { FileUpload } from "@/components/file-upload"

export default function ParametresPage() {
  const [annonceur, setAnnonceur] = useState<Annonceur | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showIban, setShowIban] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const [formData, setFormData] = useState({
    nom_formation: "",
    email: "",
    iban: "",
    nom_titulaire_compte: "",
    bic_swift: "",
  })

  useEffect(() => {
    fetchAnnonceurData()
  }, [])

  const fetchAnnonceurData = async () => {
    try {
      const supabase = createClient()

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
          email: annonceurData.email,
          iban: annonceurData.iban || "",
          nom_titulaire_compte: annonceurData.nom_titulaire_compte || "",
          bic_swift: annonceurData.bic_swift || "",
        })
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    // Formatage automatique de l'IBAN
    if (field === "iban") {
      const cleaned = value.replace(/\s/g, '').toUpperCase()
      const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
      setFormData(prev => ({ ...prev, [field]: formatted }))
    } else if (field === "bic_swift") {
      // Formatage automatique du BIC/SWIFT (majuscules)
      setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    setError("")
    setSuccess(false)
  }

  const validateForm = (): boolean => {
    if (!formData.nom_formation.trim()) {
      setError("Le nom de l'organisme est obligatoire")
      return false
    }
    if (!formData.email.trim()) {
      setError("L'email est obligatoire")
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError("L'email n'est pas valide")
      return false
    }
    if (!formData.iban.trim()) {
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
    if (!formData.nom_titulaire_compte.trim()) {
      setError("Le nom du titulaire du compte est obligatoire")
      return false
    }
    if (!formData.bic_swift.trim()) {
      setError("Le code BIC/SWIFT est obligatoire")
      return false
    }
    const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/
    if (!bicRegex.test(formData.bic_swift)) {
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
      const supabase = createClient()

      const updatePayload = {
        nom_formation: formData.nom_formation,
        email: formData.email,
        iban: formData.iban.replace(/\s/g, ''),
        nom_titulaire_compte: formData.nom_titulaire_compte,
        bic_swift: formData.bic_swift,
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

  const uploadFileToStorage = async (
    file: File,
    fileType: 'piece-identite' | 'representant-piece-identite'
  ): Promise<string | null> => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const fileExt = file.name.split('.').pop()
    const fileName = `${fileType}.${fileExt}`
    const filePath = `annonceur/${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('pieces-identite')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error('Erreur upload fichier:', uploadError)
      return null
    }

    return filePath
  }

  const handleFileUpload = async (file: File | null, fileType: 'piece-identite' | 'representant-piece-identite') => {
    if (!file || !annonceur) return

    setUploadingFile(true)
    setError("")
    setUploadSuccess(false)

    try {
      const filePath = await uploadFileToStorage(file, fileType)

      if (!filePath) {
        setError("Erreur lors de l'upload du fichier")
        return
      }

      const supabase = createClient()
      const updateField = fileType === 'piece-identite' ? 'piece_identite_url' : 'representant_piece_identite_url'

      const { error: updateError } = await supabase
        .from('annonceurs')
        .update({ [updateField]: filePath } as unknown as never)
        .eq('id', annonceur.id)

      if (updateError) {
        console.error('Erreur mise à jour:', updateError)
        setError("Erreur lors de la mise à jour du profil")
        return
      }

      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)

      // Rafraîchir les données
      await fetchAnnonceurData()
    } catch (error) {
      console.error('Erreur:', error)
      setError("Une erreur inattendue s'est produite")
    } finally {
      setUploadingFile(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Mes informations
        </h1>
        <p className="text-gray-600 text-lg">
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
                  <span>Identité vérifiée</span>
                </div>
              ) : (
                <div className="text-sm text-orange-600">
                  Identité en cours de vérification par l&apos;équipe Scenio
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pièces d'identité */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Pièces d&apos;identité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {annonceur?.type_annonceur === 'personne_physique' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Pièce d&apos;identité ({annonceur.type_piece_identite === 'cni' ? 'Carte Nationale d&apos;Identité' : 'Passeport'})
                    </p>
                    {annonceur.piece_identite_url ? (
                      <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Pièce d&apos;identité uploadée</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-orange-600 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Pièce d&apos;identité requise</span>
                      </div>
                    )}
                    <FileUpload
                      label="Uploader votre pièce d&apos;identité"
                      description="Formats acceptés : JPG, PNG, PDF (max 5 MB)"
                      onFileSelect={(file) => handleFileUpload(file, 'piece-identite')}
                      error={error.includes('pièce') ? error : ''}
                    />
                  </div>
                </div>
              ) : annonceur?.type_annonceur === 'entreprise' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Pièce d&apos;identité du représentant légal ({annonceur.representant_type_piece_identite === 'cni' ? 'Carte Nationale d&apos;Identité' : 'Passeport'})
                    </p>
                    {annonceur.representant_piece_identite_url ? (
                      <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Pièce d&apos;identité uploadée</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-orange-600 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Pièce d&apos;identité requise</span>
                      </div>
                    )}
                    <FileUpload
                      label="Uploader la pièce d&apos;identité du représentant légal"
                      description="Formats acceptés : JPG, PNG, PDF (max 5 MB)"
                      onFileSelect={(file) => handleFileUpload(file, 'representant-piece-identite')}
                      error={error.includes('représentant') ? error : ''}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Complétez d&apos;abord vos informations de base pour uploader vos pièces d&apos;identité.
                </div>
              )}

              {uploadingFile && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Upload en cours...</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Fichier uploadé avec succès</span>
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
