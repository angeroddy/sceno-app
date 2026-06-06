"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, Loader2, Upload, User } from "lucide-react"
import type { EditableProfile } from "../_lib/types"

interface ProfileEditCardProps {
  error: string
  successMessage: string
  profile: EditableProfile
  photoSrc: string
  renderablePhotoSrc: string
  photoLoadFailed: boolean
  saving: boolean
  onPhotoLoad: () => void
  onPhotoError: () => void
  onPhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFieldChange: <K extends keyof EditableProfile>(field: K, value: EditableProfile[K]) => void
  onSave: () => void
  onCancel: () => void
}

/** Carte principale d'édition du profil comédien (photo + identité + démo). */
export function ProfileEditCard({
  error,
  successMessage,
  profile,
  photoSrc,
  renderablePhotoSrc,
  photoLoadFailed,
  saving,
  onPhotoLoad,
  onPhotoError,
  onPhotoChange,
  onFieldChange,
  onSave,
  onCancel,
}: ProfileEditCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Modification du Profil</CardTitle>
        <CardDescription>
          Photo, identité, date de naissance, genre, e-mail et lien de démo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photoInput">Photo de profil</Label>
              <div className="mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl border border-[#E6DAD0] bg-[#F5F0EB] shadow-sm lg:mx-0">
                {photoSrc && !photoLoadFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={renderablePhotoSrc}
                    alt="Photo de profil"
                    className="h-full w-full object-cover"
                    onLoad={onPhotoLoad}
                    onError={onPhotoError}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-20 w-20 text-gray-500" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="file"
                id="photoInput"
                accept="image/*"
                onChange={onPhotoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="flex w-full items-center justify-center gap-2 sm:w-auto"
                onClick={() => document.getElementById("photoInput")?.click()}
              >
                <Upload className="h-4 w-4" />
                Télécharger une photo
              </Button>
              <p className="text-sm text-gray-500">
                Format carré recommandé. La nouvelle photo sera enregistrée avec vos modifications.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  onChange={(event) => onFieldChange("firstName", event.target.value)}
                  placeholder="Votre prénom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  onChange={(event) => onFieldChange("lastName", event.target.value)}
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Date de naissance</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={profile.birthDate}
                  onChange={(event) => onFieldChange("birthDate", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Genre</Label>
                <select
                  id="gender"
                  value={profile.gender}
                  onChange={(event) => onFieldChange("gender", event.target.value as EditableProfile["gender"])}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none"
                >
                  <option value="">Non renseigné</option>
                  <option value="masculin">Masculin</option>
                  <option value="feminin">Féminin</option>
                  <option value="non_genre">Non genré / autre</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                disabled
                value={profile.email}
                placeholder="votre.email@example.com"
              />
              <p className="text-sm text-gray-500">
                L&apos;adresse e-mail du compte n&apos;est pas modifiable depuis cet espace.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="demoUrl">Lien vers votre démo</Label>
              <Input
                id="demoUrl"
                value={profile.demoUrl}
                onChange={(event) => onFieldChange("demoUrl", event.target.value)}
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4 md:flex-row">
          <Button
            className="w-full bg-[#E63832] hover:bg-[#E63832]/90 md:w-auto"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer les modifications"
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={onCancel}
            disabled={saving}
          >
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
