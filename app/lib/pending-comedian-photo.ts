const PENDING_COMEDIAN_PHOTO_KEY = "pending_comedian_signup_photo"
export const PENDING_COMEDIAN_SIGNUP_PHOTO_SYNCED_EVENT =
  "pending-comedian-signup-photo-synced"

type PendingComedianPhotoPayload = {
  userId: string
  dataUrl: string
  fileName: string
  mimeType: string
}

export type PendingComedianPhotoSupabase = {
  storage: {
    from: (bucket: "photos") => {
      upload: (
        path: string,
        file: File,
        options: { cacheControl: string; upsert: boolean }
      ) => Promise<{ error?: { name?: string; message?: string } | null }>
      getPublicUrl: (path: string) => { data: { publicUrl: string } }
    }
  }
  from: (table: "comediens") => {
    update: (values: { photo_url: string }) => {
      eq: (column: "auth_user_id", value: string) => Promise<{ error?: { message?: string } | null }>
    }
  }
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function getPendingPayload(): PendingComedianPhotoPayload | null {
  if (!isBrowser()) return null

  const raw = window.localStorage.getItem(PENDING_COMEDIAN_PHOTO_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as PendingComedianPhotoPayload
  } catch {
    window.localStorage.removeItem(PENDING_COMEDIAN_PHOTO_KEY)
    return null
  }
}

function setPendingPayload(payload: PendingComedianPhotoPayload) {
  if (!isBrowser()) return
  window.localStorage.setItem(PENDING_COMEDIAN_PHOTO_KEY, JSON.stringify(payload))
}

function dispatchPendingPhotoSynced(userId: string, photoUrl: string) {
  if (!isBrowser()) return

  window.dispatchEvent(
    new CustomEvent(PENDING_COMEDIAN_SIGNUP_PHOTO_SYNCED_EVENT, {
      detail: { userId, photoUrl },
    })
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Failed to convert file to data URL"))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

function dataUrlToFile(dataUrl: string, fileName: string, mimeType: string): File {
  const [metadata, base64Payload = ""] = dataUrl.split(",")
  const resolvedMimeType = metadata.match(/data:(.*?);base64/)?.[1] || mimeType || "image/webp"
  const binary = window.atob(base64Payload)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new File([bytes], fileName, { type: resolvedMimeType })
}

function getPhotoExtension(file: File) {
  const explicitExtension = file.name.split(".").pop()
  if (explicitExtension) return explicitExtension
  if (file.type === "image/webp") return "webp"
  if (file.type === "image/png") return "png"
  return "jpg"
}

export function clearPendingComedianSignupPhoto(userId?: string) {
  if (!isBrowser()) return
  const payload = getPendingPayload()
  if (!payload) return
  if (userId && payload.userId !== userId) return
  window.localStorage.removeItem(PENDING_COMEDIAN_PHOTO_KEY)
}

export async function savePendingComedianSignupPhoto(userId: string, file: File): Promise<boolean> {
  if (!isBrowser()) return false

  try {
    const dataUrl = await fileToDataUrl(file)
    setPendingPayload({
      userId,
      dataUrl,
      fileName: file.name,
      mimeType: file.type,
    })
    return true
  } catch (error) {
    console.warn("[PENDING PHOTO] Impossible de sauvegarder la photo en attente:", error)
    return false
  }
}

export async function syncPendingComedianSignupPhoto(
  supabase: PendingComedianPhotoSupabase,
  userId: string
): Promise<boolean> {
  const payload = getPendingPayload()
  if (!payload || payload.userId !== userId) {
    return false
  }

  try {
    const file = dataUrlToFile(payload.dataUrl, payload.fileName, payload.mimeType)
    const fileExt = getPhotoExtension(file)
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `comediens/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.warn("[PENDING PHOTO] Upload différé impossible:", uploadError)
      return false
    }

    const { data } = supabase.storage.from("photos").getPublicUrl(filePath)
    const { error: updateError } = await supabase
      .from("comediens")
      .update({ photo_url: data.publicUrl })
      .eq("auth_user_id", userId)

    if (updateError) {
      console.warn("[PENDING PHOTO] Mise à jour du profil impossible:", updateError)
      return false
    }

    clearPendingComedianSignupPhoto(userId)
    dispatchPendingPhotoSynced(userId, data.publicUrl)
    return true
  } catch (error) {
    console.warn("[PENDING PHOTO] Synchronisation différée impossible:", error)
    return false
  }
}
