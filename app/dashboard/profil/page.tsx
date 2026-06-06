"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react"

import { useAuth } from "../../hooks/useAuth"
import { translateAuthErrorMessage } from "@/app/lib/auth-error-message"
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client"
import { PENDING_COMEDIAN_SIGNUP_PHOTO_SYNCED_EVENT } from "@/app/lib/pending-comedian-photo"
import {
  getAgeFromDate,
  isPastOrToday,
  isStrongEnoughPassword,
  isValidUrl,
  normalizeText,
} from "@/app/lib/signup-validation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileEditCard } from "./_components/profile-edit-card"
import { PasswordChangeModal } from "./_components/password-change-modal"
import { DeleteAccountModal } from "./_components/delete-account-modal"
import type { EditableProfile } from "./_lib/types"

type ComedienProfile = {
  prenom: string | null
  nom: string | null
  email: string | null
  photo_url: string | null
  lien_demo: string | null
  date_naissance: string | null
  genre: "masculin" | "feminin" | "non_genre" | null
}

const PHOTO_RELOAD_PARAM = "photo_reload"
const PHOTO_RETRY_LIMIT = 2

function buildRenderablePhotoSrc(source: string, cacheKey: number) {
  if (!source || source.startsWith("blob:") || source.startsWith("data:")) {
    return source
  }

  try {
    const url = new URL(source)
    url.searchParams.set(PHOTO_RELOAD_PARAM, String(cacheKey))
    return url.toString()
  } catch {
    const separator = source.includes("?") ? "&" : "?"
    return `${source}${separator}${PHOTO_RELOAD_PARAM}=${cacheKey}`
  }
}

function getInitialProfile(): EditableProfile {
  return {
    firstName: "",
    lastName: "",
    email: "",
    photoUrl: "",
    demoUrl: "",
    birthDate: "",
    gender: "",
  }
}

export default function ProfilPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [profile, setProfile] = useState<EditableProfile>(getInitialProfile)
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [error, setError] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoRetryKey, setPhotoRetryKey] = useState(() => Date.now())
  const [photoRetryCount, setPhotoRetryCount] = useState(0)
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState("")
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const photoRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadProfile = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) return

    const silent = options?.silent ?? false
    if (!silent) {
      setProfileLoading(true)
    }

    try {
      const supabase = createBrowserSupabaseClient()
      const { data, error: profileError } = await supabase
        .from("comediens")
        .select("*")
        .eq("auth_user_id", user.id)
        .single()

      if (profileError) throw profileError

      const userData = data as ComedienProfile | null
      if (!userData) return

      setProfile({
        firstName: userData.prenom || "",
        lastName: userData.nom || "",
        email: userData.email || user.email || "",
        photoUrl: userData.photo_url || "",
        demoUrl: userData.lien_demo || "",
        birthDate: userData.date_naissance || "",
        gender: userData.genre || "",
      })
    } catch (loadError) {
      console.error("Erreur chargement profil:", loadError)
      setError("Impossible de charger le profil")
    } finally {
      if (!silent) {
        setProfileLoading(false)
      }
    }
  }, [user])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  useEffect(() => {
    if (!user) return

    const handlePendingPhotoSynced = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail
      if (detail?.userId !== user.id) return

      setPhotoLoadFailed(false)
      setPhotoRetryCount(0)
      setPhotoRetryKey(Date.now())
      void loadProfile({ silent: true })
    }

    window.addEventListener(
      PENDING_COMEDIAN_SIGNUP_PHOTO_SYNCED_EVENT,
      handlePendingPhotoSynced as EventListener
    )

    return () => {
      window.removeEventListener(
        PENDING_COMEDIAN_SIGNUP_PHOTO_SYNCED_EVENT,
        handlePendingPhotoSynced as EventListener
      )
    }
  }, [loadProfile, user])

  useEffect(() => {
    setPhotoLoadFailed(false)
    setPhotoRetryCount(0)
    setPhotoRetryKey(Date.now())
  }, [photoPreview, profile.photoUrl])

  useEffect(() => {
    return () => {
      if (photoRetryTimeoutRef.current) {
        clearTimeout(photoRetryTimeoutRef.current)
      }
    }
  }, [])

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setPhotoFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const currentPhotoSrc = photoPreview || profile.photoUrl
  const renderablePhotoSrc = currentPhotoSrc
    ? buildRenderablePhotoSrc(currentPhotoSrc, photoRetryKey)
    : ""

  const handlePhotoLoadError = () => {
    if (!currentPhotoSrc) {
      setPhotoLoadFailed(true)
      return
    }

    if (currentPhotoSrc.startsWith("blob:") || currentPhotoSrc.startsWith("data:")) {
      setPhotoLoadFailed(true)
      return
    }

    if (photoRetryCount >= PHOTO_RETRY_LIMIT) {
      setPhotoLoadFailed(true)
      return
    }

    if (photoRetryTimeoutRef.current) {
      clearTimeout(photoRetryTimeoutRef.current)
    }

    const nextRetryCount = photoRetryCount + 1
    setPhotoRetryCount(nextRetryCount)

    photoRetryTimeoutRef.current = setTimeout(() => {
      setPhotoRetryKey(Date.now())
    }, 350)
  }

  const updateProfileField = <K extends keyof EditableProfile>(field: K, value: EditableProfile[K]) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const validateProfile = () => {
    const normalizedFirstName = normalizeText(profile.firstName)
    const normalizedLastName = normalizeText(profile.lastName)
    const normalizedDemoUrl = normalizeText(profile.demoUrl)

    if (!normalizedFirstName) return "Le prénom est obligatoire."
    if (!normalizedLastName) return "Le nom est obligatoire."

    if (normalizedDemoUrl && !isValidUrl(normalizedDemoUrl)) {
      return "Le lien de démo doit être une URL valide."
    }

    if (profile.birthDate) {
      if (!isPastOrToday(profile.birthDate)) {
        return "La date de naissance n'est pas valide."
      }

      const age = getAgeFromDate(profile.birthDate)
      if (age !== null && age < 13) {
        return "Vous devez avoir au moins 13 ans pour utiliser la plateforme."
      }
    }

    return null
  }

  const handleSave = async () => {
    if (!user) return

    const validationError = validateProfile()
    if (validationError) {
      setError(validationError)
      setSuccessMessage("")
      return
    }

    setSaving(true)
    setError("")
    setSuccessMessage("")

    try {
      const supabase = createBrowserSupabaseClient()
      let photoUrl = profile.photoUrl

      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `comediens/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, photoFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(filePath)
        photoUrl = publicUrlData.publicUrl
      }

      const normalizedDemoUrl = normalizeText(profile.demoUrl)

      const profileUpdates: ComedienProfile = {
        prenom: normalizeText(profile.firstName),
        nom: normalizeText(profile.lastName),
        email: profile.email,
        photo_url: photoUrl || null,
        lien_demo: normalizedDemoUrl || null,
        date_naissance: profile.birthDate || null,
        genre: profile.gender || null,
      }

      const { error: updateError } = await supabase
        .from("comediens")
        .update(profileUpdates as never)
        .eq("auth_user_id", user.id)

      if (updateError) throw updateError

      setPhotoFile(null)
      setPhotoPreview(null)
      setProfile((prev) => ({
        ...prev,
        firstName: normalizeText(prev.firstName),
        lastName: normalizeText(prev.lastName),
        photoUrl,
        demoUrl: normalizedDemoUrl,
      }))
      setSuccessMessage("Profil mis à jour avec succès.")
      window.setTimeout(() => setSuccessMessage(""), 4000)
    } catch (saveError) {
      console.error("Erreur sauvegarde profil:", saveError)
      setError(saveError instanceof Error ? saveError.message : "Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSave = async () => {
    setPasswordError("")
    setPasswordSuccessMessage("")

    if (!currentPassword) {
      setPasswordError("Votre mot de passe actuel est obligatoire.")
      return
    }

    if (!newPassword) {
      setPasswordError("Le nouveau mot de passe est obligatoire.")
      return
    }

    if (!isStrongEnoughPassword(newPassword)) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères, avec au moins une lettre et un chiffre.")
      return
    }

    if (!confirmPassword) {
      setPasswordError("Veuillez confirmer le nouveau mot de passe.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.")
      return
    }

    setPasswordSaving(true)

    try {
      const supabase = createBrowserSupabaseClient()
      const accountEmail = profile.email || user?.email || ""

      if (!accountEmail) {
        setPasswordError("Impossible de vérifier votre identité pour modifier le mot de passe.")
        setPasswordSaving(false)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: accountEmail,
        password: currentPassword,
      })

      if (signInError) {
        setPasswordError("Le mot de passe actuel est incorrect.")
        setPasswordSaving(false)
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

      if (updateError) {
        setPasswordError(translateAuthErrorMessage(updateError.message, "password-update"))
        setPasswordSaving(false)
        return
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordModalOpen(false)
      setPasswordSuccessMessage("Votre mot de passe a bien été mis à jour.")
      window.setTimeout(() => setPasswordSuccessMessage(""), 4000)
    } catch (submitError) {
      console.error("Erreur mise à jour mot de passe:", submitError)
      setPasswordError("Une erreur inattendue s'est produite. Veuillez réessayer.")
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleOpenPasswordModal = () => {
    setPasswordError("")
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordModalOpen(true)
  }

  const handleClosePasswordModal = () => {
    if (passwordSaving) return
    setPasswordModalOpen(false)
    setPasswordError("")
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    setDeleteAccountError("")

    try {
      const response = await fetch("/api/comedien/compte", {
        method: "DELETE",
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || "Impossible de supprimer le compte.")
      }

      const supabase = createBrowserSupabaseClient()
      await supabase.auth.signOut().catch(() => undefined)
      window.location.href = "/"
    } catch (deleteError) {
      setDeleteAccountError(
        deleteError instanceof Error
          ? deleteError.message
          : "Une erreur est survenue lors de la suppression du compte."
      )
      setDeletingAccount(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F0EB] to-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <Button
          variant="ghost"
          className="mb-6 flex items-center gap-2"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Button>

        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">
            Mon Profil
          </h1>
          <p className="text-lg text-gray-600">
            Consultez et modifiez toutes vos informations personnelles.
          </p>
        </div>

        {profileLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#E63832]" />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <ProfileEditCard
              error={error}
              successMessage={successMessage}
              profile={profile}
              photoSrc={currentPhotoSrc}
              renderablePhotoSrc={renderablePhotoSrc}
              photoLoadFailed={photoLoadFailed}
              saving={saving}
              onPhotoLoad={() => setPhotoLoadFailed(false)}
              onPhotoError={handlePhotoLoadError}
              onPhotoChange={handlePhotoChange}
              onFieldChange={updateProfileField}
              onSave={handleSave}
              onCancel={() => router.push("/dashboard")}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Sécurité</CardTitle>
                <CardDescription>
                  Modifiez votre mot de passe depuis une fenêtre dédiée.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {passwordSuccessMessage && (
                  <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-4">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-sm text-green-800">{passwordSuccessMessage}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-gray-600">
                    Pour confirmer le changement, nous vous demanderons d&apos;abord votre mot de passe actuel.
                  </p>
                  <Button
                    type="button"
                    className="bg-[#E63832] hover:bg-[#E63832]/90"
                    onClick={handleOpenPasswordModal}
                    disabled={passwordSaving}
                  >
                    Changer mon mot de passe
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/70">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-red-900">Supprimer mon compte</h2>
                    <p className="text-sm text-red-800">
                      Cette action est définitive. Votre profil sera anonymisé et votre accès à l&apos;application sera définitivement fermé.
                    </p>
                    {deleteAccountError && (
                      <p className="text-sm font-medium text-red-700">{deleteAccountError}</p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-300 bg-white text-red-700 hover:bg-red-100 hover:text-red-800"
                    onClick={() => {
                      setDeleteAccountError("")
                      setDeleteModalOpen(true)
                    }}
                    disabled={saving || passwordSaving || deletingAccount}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer mon compte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <PasswordChangeModal
        open={passwordModalOpen}
        saving={passwordSaving}
        error={passwordError}
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        onCurrentPasswordChange={(value) => {
          setCurrentPassword(value)
          setPasswordError("")
        }}
        onNewPasswordChange={(value) => {
          setNewPassword(value)
          setPasswordError("")
        }}
        onConfirmPasswordChange={(value) => {
          setConfirmPassword(value)
          setPasswordError("")
        }}
        onClose={handleClosePasswordModal}
        onSave={() => void handlePasswordSave()}
      />

      <DeleteAccountModal
        open={deleteModalOpen}
        deleting={deletingAccount}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => void handleDeleteAccount()}
      />
    </div>
  )
}
