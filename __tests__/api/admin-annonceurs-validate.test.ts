import { POST } from '@/app/api/admin/annonceurs/validate/route'
import { createServerSupabaseClient, getAdminProfile, getUser } from '@/app/lib/supabase'

jest.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
  getUser: jest.fn(),
  getAdminProfile: jest.fn(),
}))

describe('POST /api/admin/annonceurs/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retourne 400 si l’action est invalide', async () => {
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1' })
    ;(getAdminProfile as jest.Mock).mockResolvedValue({ id: 'admin-1' })

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ annonceurId: 'ann-1', action: 'archive' }),
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Action invalide' })
  })

  it('valide un annonceur et enregistre la modération', async () => {
    const updateEq = jest.fn().mockResolvedValue({ error: null })
    const insertModeration = jest.fn().mockResolvedValue({ error: null })

    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1' })
    ;(getAdminProfile as jest.Mock).mockResolvedValue({ id: 'admin-1' })
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'annonceurs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'ann-1', nom_formation: 'Org', identite_verifiee: false },
                  error: null,
                }),
              })),
            })),
            update: jest.fn(() => ({
              eq: updateEq,
            })),
          }
        }
        if (table === 'moderations') {
          return {
            insert: insertModeration,
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ annonceurId: 'ann-1', action: 'valider' }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.annonceur.identite_verifiee).toBe(true)
    expect(insertModeration).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: 'admin-1',
        type: 'annonceur',
        entity_id: 'ann-1',
        action: 'validee',
      })
    )
  })
})
