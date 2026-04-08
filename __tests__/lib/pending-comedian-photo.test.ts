import {
  clearPendingComedianSignupPhoto,
  PENDING_COMEDIAN_SIGNUP_PHOTO_SYNCED_EVENT,
  savePendingComedianSignupPhoto,
  syncPendingComedianSignupPhoto,
  type PendingComedianPhotoSupabase,
} from '@/app/lib/pending-comedian-photo'

describe('pending-comedian-photo helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("sauvegarde la photo du signup en attente dans le navigateur", async () => {
    const OriginalFileReader = global.FileReader

    class MockFileReader {
      result = 'data:image/webp;base64,AAAA'
      onloadend: null | (() => void) = null
      onerror: null | (() => void) = null

      readAsDataURL() {
        this.onloadend?.()
      }
    }

    ;(global as any).FileReader = MockFileReader

    try {
      const saved = await savePendingComedianSignupPhoto(
        'user-1',
        new File(['avatar'], 'avatar.webp', { type: 'image/webp' })
      )

      expect(saved).toBe(true)
      expect(window.localStorage.getItem('pending_comedian_signup_photo')).toContain('"userId":"user-1"')
    } finally {
      ;(global as any).FileReader = OriginalFileReader
    }
  })

  it("synchronise la photo en attente dès que l'utilisateur dispose d'une session", async () => {
    window.localStorage.setItem(
      'pending_comedian_signup_photo',
      JSON.stringify({
        userId: 'user-1',
        dataUrl: 'data:image/webp;base64,AAAA',
        fileName: 'avatar.webp',
        mimeType: 'image/webp',
      })
    )

    const upload = jest.fn().mockResolvedValue({ error: null })
    const updateEq = jest.fn().mockResolvedValue({ error: null })
    const supabase = {
      storage: {
        from: jest.fn(() => ({
          upload,
          getPublicUrl: jest.fn(() => ({
            data: { publicUrl: 'https://cdn.example.com/avatar.webp' },
          })),
        })),
      },
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: updateEq,
        })),
      })),
    } as unknown as PendingComedianPhotoSupabase

    const syncedListener = jest.fn()
    window.addEventListener(PENDING_COMEDIAN_SIGNUP_PHOTO_SYNCED_EVENT, syncedListener)

    await expect(syncPendingComedianSignupPhoto(supabase, 'user-1')).resolves.toBe(true)

    expect(upload).toHaveBeenCalled()
    expect(updateEq).toHaveBeenCalledWith('auth_user_id', 'user-1')
    expect(syncedListener).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem('pending_comedian_signup_photo')).toBeNull()
  })

  it("ignore une photo en attente si elle appartient à un autre utilisateur", async () => {
    window.localStorage.setItem(
      'pending_comedian_signup_photo',
      JSON.stringify({
        userId: 'user-2',
        dataUrl: 'data:image/webp;base64,AAAA',
        fileName: 'avatar.webp',
        mimeType: 'image/webp',
      })
    )

    const supabase = {
      storage: {
        from: jest.fn(),
      },
      from: jest.fn(),
    } as unknown as PendingComedianPhotoSupabase

    await expect(syncPendingComedianSignupPhoto(supabase, 'user-1')).resolves.toBe(false)
    expect(window.localStorage.getItem('pending_comedian_signup_photo')).not.toBeNull()

    clearPendingComedianSignupPhoto('user-2')
    expect(window.localStorage.getItem('pending_comedian_signup_photo')).toBeNull()
  })
})
