"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Eye, EyeOff } from "lucide-react"
import { TYPE_JURIDIQUE_LABELS, type Annonceur, type TypeJuridique } from "@/app/types"
import type { AnnonceurSettingsForm } from "../_lib/types"

interface AdvertiserProfileFormProps {
  formData: AnnonceurSettingsForm
  annonceur: Annonceur | null
  lockedEmail: string
  maxBirthDate: string
  showIban: boolean
  onToggleIban: () => void
  onFieldChange: (field: keyof AnnonceurSettingsForm, value: string) => void
  formatWebsiteInput: (value: string | null | undefined) => string
  normalizeCountryField: (field: "pays_entreprise" | "siege_pays" | "representant_adresse_pays") => void
  normalizePhoneField: (field: "telephone" | "representant_telephone") => void
  maskIban: (iban: string) => string
}

/**
 * Cartes de formulaire des paramètres annonceur : profil juridique, entreprise,
 * adresse du siège, représentant légal et informations bancaires.
 * Présentationnel : l'état (formData) et la logique restent dans la page.
 */
export function AdvertiserProfileForm({
  formData,
  annonceur,
  lockedEmail,
  maxBirthDate,
  showIban,
  onToggleIban,
  onFieldChange,
  formatWebsiteInput,
  normalizeCountryField,
  normalizePhoneField,
  maskIban,
}: AdvertiserProfileFormProps) {
  return (
    <>
      <div id="validation-compte" className="scroll-mt-28">
      <Card>
        <CardHeader>
          <CardTitle>Profil juridique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Type de compte</Label>
            <Input value="Entreprise" readOnly />
            <p className="text-xs text-gray-500">
              Les comptes annonceur sont désormais limités aux entreprises.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nom_formation">Nom affiché de l&apos;organisme <span className="text-red-500">*</span></Label>
            <Input
              id="nom_formation"
              type="text"
              value={formData.nom_formation}
              onChange={(e) => onFieldChange("nom_formation", e.target.value)}
              placeholder="Nom affiché publiquement"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email du compte <span className="text-red-500">*</span></Label>
            <Input
              id="email"
              type="email"
              value={lockedEmail}
              placeholder="contact@organisme.fr"
              readOnly
              aria-readonly="true"
              className="bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500">
              L&apos;email du compte ne peut pas être modifié depuis cet espace.
            </p>
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
              Compte en cours de vérification par l&apos;équipe formations-artistiques.fr
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <>
        <Card>
          <CardHeader>
            <CardTitle>Informations de l&apos;entreprise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom_entreprise">Nom légal de l&apos;entreprise <span className="text-red-500">*</span></Label>
                <Input
                  id="nom_entreprise"
                  type="text"
                  value={formData.nom_entreprise}
                  onChange={(e) => onFieldChange("nom_entreprise", e.target.value)}
                  placeholder="Nom légal de la société"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_internet">Site internet de l&apos;entreprise</Label>
                <Input
                  id="site_internet"
                  type="text"
                  value={formData.site_internet}
                  onChange={(e) => onFieldChange("site_internet", e.target.value)}
                  onBlur={() => onFieldChange("site_internet", formatWebsiteInput(formData.site_internet))}
                  placeholder="www.votre-site.fr"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type_juridique">Statut juridique <span className="text-red-500">*</span></Label>
                  <select
                    id="type_juridique"
                    value={formData.type_juridique}
                    onChange={(e) => onFieldChange("type_juridique", e.target.value as TypeJuridique)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Sélectionnez...</option>
                    {Object.entries(TYPE_JURIDIQUE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero_legal">Numéro légal / SIREN / SIRET <span className="text-red-500">*</span></Label>
                  <Input
                    id="numero_legal"
                    type="text"
                    value={formData.numero_legal}
                    onChange={(e) => onFieldChange("numero_legal", e.target.value)}
                    placeholder="123456789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pays_entreprise">Pays d&apos;immatriculation <span className="text-red-500">*</span></Label>
                  <Input
                    id="pays_entreprise"
                    type="text"
                    value={formData.pays_entreprise}
                    onChange={(e) => onFieldChange("pays_entreprise", e.target.value)}
                    onBlur={() => normalizeCountryField("pays_entreprise")}
                    placeholder="France"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone de l&apos;organisme <span className="text-red-500">*</span></Label>
                  <Input
                    id="telephone"
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => onFieldChange("telephone", e.target.value)}
                    onBlur={() => normalizePhoneField("telephone")}
                    placeholder="+33 1 XX XX XX XX"
                  />
                </div>
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adresse du siège social</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siege_rue">Adresse <span className="text-red-500">*</span></Label>
                <Input
                  id="siege_rue"
                  type="text"
                  value={formData.siege_rue}
                  onChange={(e) => onFieldChange("siege_rue", e.target.value)}
                  placeholder="45 avenue des Champs-Élysées"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siege_code_postal">Code postal <span className="text-red-500">*</span></Label>
                  <Input
                    id="siege_code_postal"
                    type="text"
                    value={formData.siege_code_postal}
                    onChange={(e) => onFieldChange("siege_code_postal", e.target.value)}
                    placeholder="75008"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siege_ville">Ville <span className="text-red-500">*</span></Label>
                  <Input
                    id="siege_ville"
                    type="text"
                    value={formData.siege_ville}
                    onChange={(e) => onFieldChange("siege_ville", e.target.value)}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siege_pays">Pays du siège <span className="text-red-500">*</span></Label>
                <Input
                  id="siege_pays"
                  type="text"
                  value={formData.siege_pays}
                  onChange={(e) => onFieldChange("siege_pays", e.target.value)}
                  onBlur={() => normalizeCountryField("siege_pays")}
                  placeholder="France"
                />
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Représentant légal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="representant_nom">Nom <span className="text-red-500">*</span></Label>
                  <Input
                    id="representant_nom"
                    type="text"
                    value={formData.representant_nom}
                    onChange={(e) => onFieldChange("representant_nom", e.target.value)}
                    placeholder="Martin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="representant_prenom">Prénom <span className="text-red-500">*</span></Label>
                  <Input
                    id="representant_prenom"
                    type="text"
                    value={formData.representant_prenom}
                    onChange={(e) => onFieldChange("representant_prenom", e.target.value)}
                    placeholder="Sophie"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="representant_telephone">Téléphone du représentant <span className="text-red-500">*</span></Label>
                  <Input
                    id="representant_telephone"
                    type="tel"
                    value={formData.representant_telephone}
                    onChange={(e) => onFieldChange("representant_telephone", e.target.value)}
                    onBlur={() => normalizePhoneField("representant_telephone")}
                    placeholder="+33 6 XX XX XX XX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="representant_date_naissance">Date de naissance <span className="text-red-500">*</span></Label>
                  <Input
                    id="representant_date_naissance"
                    type="date"
                    value={formData.representant_date_naissance}
                    onChange={(e) => onFieldChange("representant_date_naissance", e.target.value)}
                    max={maxBirthDate}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="representant_adresse_rue">Adresse <span className="text-red-500">*</span></Label>
                <Input
                  id="representant_adresse_rue"
                  type="text"
                  value={formData.representant_adresse_rue}
                  onChange={(e) => onFieldChange("representant_adresse_rue", e.target.value)}
                  placeholder="10 rue de la Paix"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="representant_adresse_code_postal">Code postal <span className="text-red-500">*</span></Label>
                  <Input
                    id="representant_adresse_code_postal"
                    type="text"
                    value={formData.representant_adresse_code_postal}
                    onChange={(e) => onFieldChange("representant_adresse_code_postal", e.target.value)}
                    placeholder="75002"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="representant_adresse_ville">Ville <span className="text-red-500">*</span></Label>
                  <Input
                    id="representant_adresse_ville"
                    type="text"
                    value={formData.representant_adresse_ville}
                    onChange={(e) => onFieldChange("representant_adresse_ville", e.target.value)}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="representant_adresse_pays">Pays <span className="text-red-500">*</span></Label>
                <Input
                  id="representant_adresse_pays"
                  type="text"
                  value={formData.representant_adresse_pays}
                  onChange={(e) => onFieldChange("representant_adresse_pays", e.target.value)}
                  onBlur={() => normalizeCountryField("representant_adresse_pays")}
                  placeholder="France"
                />
              </div>
          </CardContent>
        </Card>
      </>

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
              onChange={(e) => onFieldChange("nom_titulaire_compte", e.target.value)}
              placeholder="Nom de la personne ou de l'entreprise"
            />
            <p className="text-xs text-gray-500">
              Conservé côté plateforme, mais le compte bancaire final doit être confirmé dans Stripe.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban">IBAN <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                id="iban"
                type={showIban ? "text" : "password"}
                value={showIban ? formData.iban : maskIban(formData.iban)}
                onChange={(e) => onFieldChange("iban", e.target.value)}
                className="pl-4 pr-12 font-mono text-base tracking-wider"
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                maxLength={34}
              />
              <button
                type="button"
                onClick={onToggleIban}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
              >
                {showIban ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bic_swift">BIC / SWIFT <span className="text-red-500">*</span></Label>
            <Input
              id="bic_swift"
              type="text"
              value={formData.bic_swift}
              onChange={(e) => onFieldChange("bic_swift", e.target.value)}
              className="font-mono text-base tracking-wider"
              placeholder="BNPAFRPP"
              maxLength={11}
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
