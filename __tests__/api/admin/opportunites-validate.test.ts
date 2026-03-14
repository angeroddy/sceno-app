import { POST } from '@/app/api/admin/opportunites/validate/route'
import { createServerSupabaseClient, getUser, getAdminProfile } from '@/app/lib/supabase'
import { sendMail } from '@/app/lib/mailer'

jest.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
  getUser: jest.fn(),
  getAdminProfile: jest.fn(),
}))

jest.mock('@/app/lib/mailer', () => ({
  sendMail: jest.fn(),
}))

describe('POST /api/admin/opportunites/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retourne 401 si non authentifié', async () => {
    ;(getUser as jest.Mock).mockResolvedValue(null)

    const response = await POST(new Request('http://localhost', { method: 'POST' }))
    expect(response.status).toBe(401)
  })

  it('retourne 400 si paramètres manquants', async () => {
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1' })
    ;(getAdminProfile as jest.Mock).mockResolvedValue({ id: 'admin-1' })

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(400)
  })

  it('valide une opportunité (refus) sans envoi d’email', async () => {
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1' })
    ;(getAdminProfile as jest.Mock).mockResolvedValue({ id: 'admin-1' })

    const opportunite = {
      id: 'opp-1',
      titre: 'Test',
      statut: 'en_attente',
      annonceur_id: 'ann-1',
      annonceur: { email: 'a@example.com', nom_formation: 'Org' },
    }

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'opportunites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: opportunite, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'moderations') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(mockSupabase)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ opportuniteId: 'opp-1', action: 'refuser' }),
      })
    )

    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('ne renvoie pas les emails si l’opportunité est déjà validée', async () => {
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1' })
    ;(getAdminProfile as jest.Mock).mockResolvedValue({ id: 'admin-1' })

    const update = jest.fn()
    const insert = jest.fn()

    const opportunite = {
      id: 'opp-1',
      titre: 'Test',
      statut: 'validee',
      annonceur_id: 'ann-1',
      annonceur: {
        email: 'a@example.com',
        nom_formation: 'Org',
        stripe_account_id: 'acct_123',
        stripe_charges_enabled: true,
        stripe_payouts_enabled: true,
      },
    }

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'opportunites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: opportunite, error: null }),
              }),
            }),
            update,
          }
        }
        if (table === 'moderations') {
          return { insert }
        }
        return {}
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(mockSupabase)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ opportuniteId: 'opp-1', action: 'valider' }),
      })
    )

    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.message).toMatch(/déjà validée/i)
    expect(update).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('retourne 409 si l’opportunité n’est plus en attente', async () => {
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1' })
    ;(getAdminProfile as jest.Mock).mockResolvedValue({ id: 'admin-1' })

    const opportunite = {
      id: 'opp-1',
      titre: 'Test',
      statut: 'refusee',
      annonceur_id: 'ann-1',
      annonceur: {
        email: 'a@example.com',
        nom_formation: 'Org',
        stripe_account_id: 'acct_123',
        stripe_charges_enabled: true,
        stripe_payouts_enabled: true,
      },
    }

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'opportunites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: opportunite, error: null }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(mockSupabase)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ opportuniteId: 'opp-1', action: 'valider' }),
      })
    )

    await expect(response.json()).resolves.toEqual({
      error: 'Seules les opportunités en attente peuvent être modérées',
    })
    expect(response.status).toBe(409)
    expect(sendMail).not.toHaveBeenCalled()
  })
})
