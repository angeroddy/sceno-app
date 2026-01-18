"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Building2,
  Calendar,
  FileText,
  CreditCard,
  User,
  MapPin,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import type { Annonceur } from "@/app/types"

interface AnnonceurDetails extends Annonceur {
  opportunites?: { id: string; titre: string; statut: string; created_at: string }[]
}

export default function AnnonceurDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const annonceurId = params.id as string

  const [annonceur, setAnnonceur] = useState<AnnonceurDetails | null>(null)
  const [pieceIdentiteUrl, setPieceIdentiteUrl] = useState<string | null>(null)
  const [representantPieceUrl, setRepresentantPieceUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [showValidateModal, setShowValidateModal] = useState(false)
  const [modalAction, setModalAction] = useState<'valider' | 'refuser'>('valider')
  const [refusRaison, setRefusRaison] = useState("")

  useEffect(() => {
    fetchAnnonceurDetails()
  }, [annonceurId])

  const fetchAnnonceurDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/annonceurs/${annonceurId}`)

      if (!response.ok) {
        throw new Error('Erreur lors du chargement')
      }

      const data = await response.json()
      setAnnonceur(data.annonceur)
      setPieceIdentiteUrl(data.pieceIdentiteUrl)
      setRepresentantPieceUrl(data.representantPieceIdentiteUrl)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleValidation = async () => {
    if (!annonceur) return

    try {
      setValidating(true)

      const response = await fetch('/api/admin/annonceurs/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annonceurId: annonceur.id,
          action: modalAction,
          raison: modalAction === 'refuser' ? refusRaison : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la validation')
      }

      // Rafraîchir les données
      await fetchAnnonceurDetails()
      setShowValidateModal(false)
      setRefusRaison("")
      alert(`Annonceur ${modalAction === 'valider' ? 'validé' : 'refusé'} avec succès`)
    } catch (error) {
      console.error('Erreur:', error)
      alert(error instanceof Error ? error.message : "Une erreur s'est produite lors de la validation")
    } finally {
      setValidating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E63832]"></div>
      </div>
    )
  }

  if (!annonceur) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <p className="text-gray-500 text-lg">Annonceur non trouvé</p>
              <Button onClick={() => router.push('/admin/annonceurs')} className="mt-4">
                Retour à la liste
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const opportunitesCount = Array.isArray(annonceur.opportunites) ? annonceur.opportunites.length : 0

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/annonceurs')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la liste
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {annonceur.nom_formation}
              </h1>
              {annonceur.identite_verifiee ? (
                <Badge className="bg-green-100 text-green-700">Vérifié</Badge>
              ) : (
                <Badge className="bg-orange-100 text-orange-700">En attente</Badge>
              )}
            </div>
            <p className="text-gray-600 text-lg">
              {annonceur.type_annonceur === 'personne_physique' ? 'Personne physique' : 'Entreprise'}
            </p>
          </div>

          {!annonceur.identite_verifiee && (
            <div className="flex gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setModalAction('valider')
                  setShowValidateModal(true)
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Valider
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 border-red-300"
                onClick={() => {
                  setModalAction('refuser')
                  setShowValidateModal(true)
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Refuser
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations de contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Informations de contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-medium">{annonceur.email}</span>
                  {annonceur.email_verifie && (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Vérifié
                    </Badge>
                  )}
                </div>
              </div>
              {annonceur.telephone && (
                <div>
                  <label className="text-sm text-gray-600">Téléphone</label>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4" />
                    {annonceur.telephone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations personne physique */}
          {annonceur.type_annonceur === 'personne_physique' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Nom</label>
                    <p className="font-medium">{annonceur.nom || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Prénom</label>
                    <p className="font-medium">{annonceur.prenom || 'Non renseigné'}</p>
                  </div>
                </div>
                {annonceur.date_naissance && (
                  <div>
                    <label className="text-sm text-gray-600">Date de naissance</label>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(annonceur.date_naissance).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-600">Adresse</label>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="font-medium">
                      {annonceur.adresse_rue || 'Non renseigné'}<br />
                      {annonceur.adresse_code_postal} {annonceur.adresse_ville}<br />
                      {annonceur.adresse_pays || 'France'}
                    </div>
                  </div>
                </div>
                {annonceur.type_piece_identite && (
                  <div>
                    <label className="text-sm text-gray-600">Type de pièce d&apos;identité</label>
                    <p className="font-medium">
                      {annonceur.type_piece_identite === 'cni' ? 'Carte Nationale d\'Identité' : 'Passeport'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Informations entreprise */}
          {annonceur.type_annonceur === 'entreprise' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Informations entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">Nom légal de l&apos;entreprise</label>
                    <p className="font-medium">{annonceur.nom_entreprise || 'Non renseigné'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Statut juridique</label>
                      <p className="font-medium">{annonceur.type_juridique || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">SIREN/SIRET</label>
                      <p className="font-medium">{annonceur.numero_legal || 'Non renseigné'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Adresse du siège social</label>
                    <div className="flex items-start gap-2 mt-1">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="font-medium">
                        {annonceur.siege_rue || 'Non renseigné'}<br />
                        {annonceur.siege_code_postal} {annonceur.siege_ville}<br />
                        {annonceur.siege_pays || 'France'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Représentant légal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Nom</label>
                      <p className="font-medium">{annonceur.representant_nom || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Prénom</label>
                      <p className="font-medium">{annonceur.representant_prenom || 'Non renseigné'}</p>
                    </div>
                  </div>
                  {annonceur.representant_date_naissance && (
                    <div>
                      <label className="text-sm text-gray-600">Date de naissance</label>
                      <p className="font-medium flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(annonceur.representant_date_naissance).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-600">Adresse</label>
                    <div className="flex items-start gap-2 mt-1">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="font-medium">
                        {annonceur.representant_adresse_rue || 'Non renseigné'}<br />
                        {annonceur.representant_adresse_code_postal} {annonceur.representant_adresse_ville}<br />
                        {annonceur.representant_adresse_pays || 'France'}
                      </div>
                    </div>
                  </div>
                  {annonceur.representant_type_piece_identite && (
                    <div>
                      <label className="text-sm text-gray-600">Type de pièce d&apos;identité</label>
                      <p className="font-medium">
                        {annonceur.representant_type_piece_identite === 'cni' ? 'Carte Nationale d\'Identité' : 'Passeport'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Informations bancaires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Informations bancaires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Titulaire du compte</label>
                <p className="font-medium">{annonceur.nom_titulaire_compte || 'Non renseigné'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">IBAN</label>
                <p className="font-medium font-mono">
                  {annonceur.iban
                    ? `${annonceur.iban.substring(0, 4)} **** **** ${annonceur.iban.slice(-4)}`
                    : 'Non renseigné'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">BIC/SWIFT</label>
                <p className="font-medium font-mono">{annonceur.bic_swift || 'Non renseigné'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Statistiques */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Inscription</label>
                <p className="font-medium flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(annonceur.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Opportunités publiées</label>
                <p className="font-medium text-2xl">{opportunitesCount}</p>
              </div>
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
            <CardContent className="space-y-4">
              {annonceur.type_annonceur === 'personne_physique' && (
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">
                    Pièce d&apos;identité
                  </label>
                  {pieceIdentiteUrl ? (
                    <a
                      href={pieceIdentiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Voir la pièce
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>Non uploadée</span>
                    </div>
                  )}
                </div>
              )}
              {annonceur.type_annonceur === 'entreprise' && (
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">
                    Pièce d&apos;identité du représentant légal
                  </label>
                  {representantPieceUrl ? (
                    <a
                      href={representantPieceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Voir la pièce
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>Non uploadée</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de validation */}
      {showValidateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  modalAction === 'valider' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {modalAction === 'valider' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-center mb-2">
                  {modalAction === 'valider' ? 'Valider cet annonceur ?' : 'Refuser cet annonceur ?'}
                </h3>
                <p className="text-center text-gray-600 mb-4">
                  {annonceur.nom_formation}
                </p>
              </div>

              {modalAction === 'refuser' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Raison du refus (optionnel)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63832]"
                    rows={3}
                    placeholder="Expliquez pourquoi ce compte n'est pas validé..."
                    value={refusRaison}
                    onChange={(e) => setRefusRaison(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowValidateModal(false)
                    setRefusRaison("")
                  }}
                  disabled={validating}
                >
                  Annuler
                </Button>
                <Button
                  className={`flex-1 ${
                    modalAction === 'valider'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  onClick={handleValidation}
                  disabled={validating}
                >
                  {validating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      En cours...
                    </>
                  ) : (
                    'Confirmer'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
