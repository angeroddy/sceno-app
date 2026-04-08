import {
  getSignupEmailConflictMessage,
  resolveUserTypeForAuthUser,
  syncEmailVerificationForAuthUser,
  type AuthProfileSupabase,
} from '@/app/lib/auth-profile'

function createMockSupabase({
  admin = null,
  advertiser = null,
  comedian = null,
}: {
  admin?: { id: string } | null
  advertiser?: { id: string } | null
  comedian?: { id: string; compte_supprime?: boolean | null } | null
} = {}) {
  const update = jest.fn().mockResolvedValue({ error: null })

  const supabase = {
    from: jest.fn((table: 'admins' | 'annonceurs' | 'comediens') => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data:
              table === 'admins'
                ? admin
                : table === 'annonceurs'
                  ? advertiser
                  : comedian,
            error: null,
          }),
        })),
      })),
      update: jest.fn(() => ({
        eq: update,
      })),
    })),
  }

  return {
    supabase: supabase as unknown as AuthProfileSupabase,
    update,
  }
}

describe('auth-profile helpers', () => {
  it("retourne un message spécifique si un e-mail annonceur est réutilisé pour un comédien", () => {
    expect(
      getSignupEmailConflictMessage('comedian', {
        hasAdvertiser: true,
        hasComedian: false,
      })
    ).toBe("Un compte annonceur existe déjà avec cet email. Utilisez une autre adresse e-mail.")
  })

  it("résout correctement le type d'utilisateur à partir du profil", async () => {
    const { supabase } = createMockSupabase({
      advertiser: { id: 'annonceur-1' },
    })

    await expect(resolveUserTypeForAuthUser(supabase, 'auth-user-1')).resolves.toBe('advertiser')
  })

  it("retourne deleted si le profil comédien est marqué comme supprimé", async () => {
    const { supabase } = createMockSupabase({
      comedian: { id: 'comedien-1', compte_supprime: true },
    })

    await expect(resolveUserTypeForAuthUser(supabase, 'auth-user-1')).resolves.toBe('deleted')
  })

  it("synchronise email_verifie pour un annonceur déjà confirmé dans Auth", async () => {
    const { supabase, update } = createMockSupabase({
      advertiser: { id: 'annonceur-1' },
    })

    await expect(
      syncEmailVerificationForAuthUser(supabase, {
        id: 'auth-user-1',
        email_confirmed_at: '2026-03-24T10:00:00.000Z',
      })
    ).resolves.toBe('advertiser')

    expect(update).toHaveBeenCalledWith('auth_user_id', 'auth-user-1')
  })
})
