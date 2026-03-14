import { GET } from '@/app/api/admin/opportunites/[id]/route'
import { createServerSupabaseClient, getAdminProfile, getUser } from '@/app/lib/supabase'
import { reconcileOpportunityPlaces } from '@/app/lib/opportunity-availability'
import { countOpportunityViews } from '@/app/lib/opportunity-views'

jest.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
  getUser: jest.fn(),
  getAdminProfile: jest.fn(),
}))

jest.mock('@/app/lib/opportunity-availability', () => ({
  reconcileOpportunityPlaces: jest.fn(),
}))

jest.mock('@/app/lib/opportunity-views', () => ({
  countOpportunityViews: jest.fn(),
}))

describe('GET /api/admin/opportunites/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'auth-admin' })
    ;(getAdminProfile as jest.Mock).mockResolvedValue({ id: 'admin-1' })
    ;(reconcileOpportunityPlaces as jest.Mock).mockResolvedValue(null)
    ;(countOpportunityViews as jest.Mock).mockResolvedValue(0)
  })

  it('retourne 401 si l utilisateur n est pas authentifie', async () => {
    ;(getUser as jest.Mock).mockResolvedValue(null)

    const response = await GET({} as any, { params: Promise.resolve({ id: 'opp-1' }) })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Non authentifié' })
  })

  it('retourne 403 si le profil admin est introuvable', async () => {
    ;(getAdminProfile as jest.Mock).mockResolvedValue(null)

    const response = await GET({} as any, { params: Promise.resolve({ id: 'opp-1' }) })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Accès refusé' })
  })

  it('retourne l opportunite avec des vues consolidees', async () => {
    ;(reconcileOpportunityPlaces as jest.Mock).mockResolvedValue({
      id: 'opp-1',
      nombre_places: 12,
      places_restantes: 5,
    })
    ;(countOpportunityViews as jest.Mock).mockResolvedValue(23)

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'opportunites') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'opp-1',
                    titre: 'Masterclass',
                    places_restantes: 9,
                  },
                  error: null,
                }),
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
                    { prix_paye: 40 },
                    { prix_paye: 15 },
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
    expect(data.opportunite.places_restantes).toBe(5)
    expect(data.stats).toEqual({
      vues: 23,
      reservations: 2,
      revenu: 55,
    })
    expect(countOpportunityViews).toHaveBeenCalledWith(supabase, 'opp-1')
  })
})
