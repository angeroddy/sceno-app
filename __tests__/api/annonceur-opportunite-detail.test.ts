import { GET } from '@/app/api/annonceur/opportunites/[id]/route'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { reconcileOpportunityPlaces } from '@/app/lib/opportunity-availability'
import { countOpportunityViews } from '@/app/lib/opportunity-views'

jest.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock('@/app/lib/opportunity-availability', () => ({
  reconcileOpportunityPlaces: jest.fn(),
}))

jest.mock('@/app/lib/opportunity-views', () => ({
  countOpportunityViews: jest.fn(),
}))

describe('GET /api/annonceur/opportunites/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(reconcileOpportunityPlaces as jest.Mock).mockResolvedValue(null)
    ;(countOpportunityViews as jest.Mock).mockResolvedValue(0)
  })

  it('retourne 401 si l’utilisateur n’est pas authentifié', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'auth error' },
        }),
      },
    })

    const response = await GET({} as any, { params: Promise.resolve({ id: 'opp-1' }) })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Non authentifié' })
  })

  it('retourne 404 si le profil annonceur est introuvable', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'annonceurs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await GET({} as any, { params: Promise.resolve({ id: 'opp-1' }) })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Profil annonceur introuvable' })
  })

  it('retourne l’opportunité avec statistiques consolidées', async () => {
    ;(reconcileOpportunityPlaces as jest.Mock).mockResolvedValue({
      id: 'opp-1',
      nombre_places: 10,
      places_restantes: 4,
    })
    ;(countOpportunityViews as jest.Mock).mockResolvedValue(17)

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'annonceurs') {
          return {
            select: jest.fn((query: string) => {
              if (query === '*') {
                return {
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({
                      data: { id: 'ann-1', auth_user_id: 'auth-1' },
                      error: null,
                    }),
                  })),
                }
              }

              throw new Error(`Unexpected annonceurs query: ${query}`)
            }),
          }
        }

        if (table === 'opportunites') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'opp-1',
                      titre: 'Workshop',
                      places_restantes: 8,
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }

        if (table === 'achats') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { prix_paye: 30, application_fee_amount: 300 },
                    { prix_paye: 20, application_fee_amount: 200 },
                  ],
                }),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await GET({} as any, { params: Promise.resolve({ id: 'opp-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.opportunite.places_restantes).toBe(4)
    expect(data.stats).toEqual({
      vues: 17,
      reservations: 2,
      revenu: 45,
    })
  })
})
