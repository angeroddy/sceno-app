import { POST } from '@/app/api/admin/achats/[id]/refund/route'
import { createClient } from '@supabase/supabase-js'
import { getUser, getAdminProfile } from '@/app/lib/supabase'
import { getStripe } from '@/app/lib/stripe'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/app/lib/supabase', () => ({
  getUser: jest.fn(),
  getAdminProfile: jest.fn(),
}))

jest.mock('@/app/lib/stripe', () => ({
  getStripe: jest.fn(),
}))

describe('POST /api/admin/achats/[id]/refund', () => {
  const stripeMock = {
    refunds: {
      create: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
    ;(getStripe as jest.Mock).mockReturnValue(stripeMock)
  })

  it('retourne 401 si non authentifié', async () => {
    ;(getUser as jest.Mock).mockResolvedValue(null)

    const response = await POST(
      new Request('http://localhost', { method: 'POST' }) as any,
      { params: Promise.resolve({ id: 'achat-1' }) }
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Non authentifie' })
  })

  it('retourne 409 si l’achat est déjà remboursé', async () => {
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1' })
    ;(getAdminProfile as jest.Mock).mockResolvedValue({ id: 'admin-1' })
    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'achat-1',
                statut: 'remboursee',
                stripe_payment_intent_id: 'pi_1',
                stripe_payment_id: null,
                stripe_refund_id: 're_1',
              },
              error: null,
            }),
          })),
        })),
      })),
    })

    const response = await POST(
      new Request('http://localhost', { method: 'POST' }) as any,
      { params: Promise.resolve({ id: 'achat-1' }) }
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: 'Achat deja rembourse' })
  })

  it('effectue un remboursement Stripe et met à jour l’achat via RPC', async () => {
    stripeMock.refunds.create.mockResolvedValue({ id: 're_123' })

    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1' })
    ;(getAdminProfile as jest.Mock).mockResolvedValue({ id: 'admin-1' })
    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'achat-1',
                statut: 'confirmee',
                stripe_payment_intent_id: 'pi_123',
                stripe_payment_id: null,
                stripe_refund_id: null,
              },
              error: null,
            }),
          })),
        })),
      })),
      rpc: jest.fn().mockResolvedValue({
        data: [{ success: true }],
        error: null,
      }),
    })

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ reason: 'customer_request' }),
      }) as any,
      { params: Promise.resolve({ id: 'achat-1' }) }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      refund_id: 're_123',
      achat_id: 'achat-1',
      update_result: { success: true },
    })
    expect(stripeMock.refunds.create).toHaveBeenCalledWith({
      payment_intent: 'pi_123',
      metadata: {
        achat_id: 'achat-1',
        source: 'admin_api',
        reason: 'customer_request',
      },
    })
  })
})
