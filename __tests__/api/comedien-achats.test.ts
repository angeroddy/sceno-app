import { GET } from '@/app/api/comedien/achats/route'
import { createServerSupabaseClient } from '@/app/lib/supabase'

jest.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

describe('GET /api/comedien/achats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retourne 404 si le profil comédien est introuvable', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          })),
        })),
      })),
    })

    const response = await GET({
      nextUrl: new URL('http://localhost/api/comedien/achats'),
    } as any)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Profil comedien introuvable' })
  })

  it('retourne 403 si le compte comédien est supprimé', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: { id: 'comedien-1', compte_supprime: true }, error: null }),
          })),
        })),
      })),
    })

    const response = await GET({
      nextUrl: new URL('http://localhost/api/comedien/achats'),
    } as any)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Compte supprimé' })
  })

  it('retourne les achats confirmés/remboursés sans achatId', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'achat-1', statut: 'confirmee', opportunite: null }],
      error: null,
    })
    const inFn = jest.fn(() => ({ order }))
    const eqAchatFn = jest.fn(() => ({ in: inFn, order }))

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'comediens') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: { id: 'comedien-1' }, error: null }),
              })),
            })),
          }
        }
        if (table === 'achats') {
          return {
            select: jest.fn(() => ({
              eq: eqAchatFn,
            })),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await GET({
      nextUrl: new URL('http://localhost/api/comedien/achats'),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(inFn).toHaveBeenCalledWith('statut', ['confirmee', 'remboursee'])
    expect(data).toEqual({
      achat: null,
      achats: [{ id: 'achat-1', statut: 'confirmee', opportunite: null }],
    })
  })

  it('retourne un achat ciblé quand achatId est fourni', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'achat-9', statut: 'remboursee', opportunite: { id: 'opp-1' } }],
      error: null,
    })
    const eqById = jest.fn(() => ({ order }))
    const eqAchatFn = jest.fn(() => ({ eq: eqById, in: jest.fn(), order }))

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'comediens') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: { id: 'comedien-1' }, error: null }),
              })),
            })),
          }
        }
        if (table === 'achats') {
          return {
            select: jest.fn(() => ({
              eq: eqAchatFn,
            })),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await GET({
      nextUrl: new URL('http://localhost/api/comedien/achats?achatId=achat-9'),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(eqById).toHaveBeenCalledWith('id', 'achat-9')
    expect(data.achat).toEqual({ id: 'achat-9', statut: 'remboursee', opportunite: { id: 'opp-1' } })
  })
})
