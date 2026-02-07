import { GET } from '@/app/api/admin/stats/route'
import { createServerSupabaseClient, getUser, getAdminProfile } from '@/app/lib/supabase'

jest.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
  getUser: jest.fn(),
  getAdminProfile: jest.fn(),
}))

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retourne 401 si non authentifié', async () => {
    ;(getUser as jest.Mock).mockResolvedValue(null)

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('retourne les statistiques pour un admin', async () => {
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1' })
    ;(getAdminProfile as jest.Mock).mockResolvedValue({ id: 'admin-1' })

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'annonceurs') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [{ identite_verifiee: true }, { identite_verifiee: false }],
            }),
          }
        }
        if (table === 'opportunites') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { statut: 'en_attente' },
                { statut: 'validee' },
                { statut: 'refusee' },
              ],
            }),
          }
        }
        if (table === 'achats') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ prix_paye: 10, statut: 'confirmee' }],
              }),
            }),
          }
        }
        if (table === 'comediens') {
          return {
            select: jest.fn().mockResolvedValue({
              count: 3,
            }),
          }
        }
        return {}
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(mockSupabase)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.annonceurs.total).toBe(2)
    expect(data.annonceurs.valides).toBe(1)
    expect(data.opportunites.total).toBe(3)
    expect(data.achats.montantTotal).toBe(10)
    expect(data.comediens.total).toBe(3)
  })
})
