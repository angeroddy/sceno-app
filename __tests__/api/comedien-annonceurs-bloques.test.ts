import { DELETE, GET, POST } from '@/app/api/comedien/annonceurs-bloques/route'
import { createServerSupabaseClient } from '@/app/lib/supabase'

jest.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

describe('API /api/comedien/annonceurs-bloques', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET retourne 401 si non authentifié', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'auth error' },
        }),
      },
    })

    const response = await GET()

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Non authentifié' })
  })

  it('POST bloque un annonceur pour le comédien courant', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null })

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'comediens') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: { id: 'comedien-1' } }),
              })),
            })),
          }
        }

        if (table === 'annonceurs_bloques') {
          return {
            insert,
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await POST(
      new Request('http://localhost/api/comedien/annonceurs-bloques', {
        method: 'POST',
        body: JSON.stringify({ annonceur_id: 'ann-1' }),
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(insert).toHaveBeenCalledWith({ comedien_id: 'comedien-1', annonceur_id: 'ann-1' })
  })

  it('GET retourne 403 si le compte comédien est supprimé', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: { id: 'comedien-1', compte_supprime: true } }),
          })),
        })),
      })),
    })

    const response = await GET()

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Compte supprimé' })
  })

  it('DELETE retourne 400 si annonceur_id est absent', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
      },
    })

    const response = await DELETE(
      new Request('http://localhost/api/comedien/annonceurs-bloques', {
        method: 'DELETE',
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'annonceur_id requis' })
  })
})
