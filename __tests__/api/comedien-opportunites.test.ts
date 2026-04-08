import { GET as getList } from '@/app/api/comedien/opportunites/route'
import { GET as getDetail } from '@/app/api/comedien/opportunites/[id]/route'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { reconcileOpportunityPlaces } from '@/app/lib/opportunity-availability'
import { trackOpportunityView } from '@/app/lib/opportunity-views'

jest.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock('@/app/lib/opportunity-availability', () => ({
  reconcileOpportunityPlaces: jest.fn(),
}))

jest.mock('@/app/lib/opportunity-views', () => ({
  trackOpportunityView: jest.fn(),
}))

describe('API comédien opportunités', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(reconcileOpportunityPlaces as jest.Mock).mockResolvedValue(null)
    ;(trackOpportunityView as jest.Mock).mockResolvedValue(undefined)
  })

  it('liste les opportunités en appliquant les préférences du comédien', async () => {
    const range = jest.fn().mockResolvedValue({
      data: [{
        id: 'opp-1',
        titre: 'Stage',
        statut: 'validee',
        date_evenement: '2099-06-15T10:00:00.000Z',
        places_restantes: 3,
        annonceur: { nom_formation: 'Org' },
      }],
      error: null,
      count: 1,
    })
    const order = jest.fn(() => ({ range }))
    const inTypeFn = jest.fn(() => ({ order }))
    const inStatusFn = jest.fn((column: string) => {
      if (column === 'type') {
        return { order }
      }

      return { in: inTypeFn, order }
    })

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'comediens') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'comedien-1', preferences_opportunites: ['stages_ateliers'] },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'annonceurs_bloques') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            })),
          }
        }
        if (table === 'opportunites') {
          return {
            select: jest.fn(() => ({
              in: inStatusFn,
            })),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await getList({
      nextUrl: new URL('http://localhost/api/comedien/opportunites?page=1&limit=10'),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.preferences).toEqual(['stages_ateliers'])
    expect(inStatusFn).toHaveBeenCalledWith('statut', ['validee', 'expiree', 'complete', 'supprimee'])
    expect(inTypeFn).toHaveBeenCalledWith('type', ['stages_ateliers'])
    expect(data.totalPages).toBe(1)
  })

  it('retourne 403 si le compte comédien est supprimé sur la liste', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'comediens') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'comedien-1', preferences_opportunites: [], compte_supprime: true },
                  error: null,
                }),
              })),
            })),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await getList({
      nextUrl: new URL('http://localhost/api/comedien/opportunites'),
    } as any)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Compte supprimé' })
  })

  it('liste les opportunités en excluant les annonceurs bloqués', async () => {
    const range = jest.fn().mockResolvedValue({ data: [], error: null, count: 0 })
    const order = jest.fn(() => ({ range }))
    const notFn = jest.fn(() => ({ order }))
    const inStatusFn = jest.fn(() => ({ not: notFn, order }))

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'comediens') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'comedien-1', preferences_opportunites: [] },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'annonceurs_bloques') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [{ annonceur_id: 'ann-1' }, { annonceur_id: 'ann-2' }],
                error: null,
              }),
            })),
          }
        }
        if (table === 'opportunites') {
          return {
            select: jest.fn(() => ({
              in: inStatusFn,
            })),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await getList({
      nextUrl: new URL('http://localhost/api/comedien/opportunites'),
    } as any)

    expect(response.status).toBe(200)
    expect(notFn).toHaveBeenCalledWith('annonceur_id', 'in', '(ann-1,ann-2)')
  })

  it('retourne 404 sur le détail si l’annonceur est bloqué', async () => {
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
        if (table === 'opportunites') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'opp-1',
                    annonceur_id: 'ann-1',
                    statut: 'validee',
                    date_evenement: '2099-06-15T10:00:00.000Z',
                    places_restantes: 2,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'annonceurs_bloques') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: { annonceur_id: 'ann-1' }, error: null }),
                })),
              })),
            })),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await getDetail({} as any, { params: Promise.resolve({ id: 'opp-1' }) })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: "Cette opportunite n'existe pas ou n'est plus disponible",
    })
    expect(trackOpportunityView).not.toHaveBeenCalled()
  })

  it('retourne 410 sur le détail si l’opportunité est supprimée', async () => {
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
        if (table === 'opportunites') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'opp-1',
                    annonceur_id: 'ann-1',
                    statut: 'supprimee',
                    date_evenement: '2099-06-15T10:00:00.000Z',
                    places_restantes: 2,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'annonceurs_bloques') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await getDetail({} as any, { params: Promise.resolve({ id: 'opp-1' }) })

    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toEqual({
      error: 'Cette opportunité a été supprimée et ne peut plus être consultée.',
    })
    expect(trackOpportunityView).not.toHaveBeenCalled()
  })

  it('retourne 403 sur le détail si le compte comédien est supprimé', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === 'comediens') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: { id: 'comedien-1', compte_supprime: true }, error: null }),
              })),
            })),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await getDetail({} as any, { params: Promise.resolve({ id: 'opp-1' }) })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Compte supprimé' })
    expect(trackOpportunityView).not.toHaveBeenCalled()
  })

  it('réconcilie et trace la vue sur le détail d’une opportunité', async () => {
    ;(reconcileOpportunityPlaces as jest.Mock).mockResolvedValue({
      id: 'opp-1',
      places_restantes: 2,
    })

    const opportunity = {
      id: 'opp-1',
      annonceur_id: 'ann-1',
      statut: 'complete',
      date_evenement: '2099-06-15T10:00:00.000Z',
      places_restantes: 5,
      annonceur: { nom_formation: 'Org', email: 'org@example.com' },
    }

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
        if (table === 'opportunites') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: opportunity, error: null }),
              })),
            })),
          }
        }
        if (table === 'annonceurs_bloques') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await getDetail({} as any, { params: Promise.resolve({ id: 'opp-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.places_restantes).toBe(2)
    expect(data.statut).toBe('validee')
    expect(trackOpportunityView).toHaveBeenCalledWith(supabase, 'opp-1', 'comedien-1')
  })
})
