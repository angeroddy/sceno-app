import { createClient } from '@supabase/supabase-js'
import { POST } from '@/app/api/stripe/route'
import { getStripe } from '@/app/lib/stripe'
import { extractStripeAccountStatus } from '@/app/lib/stripe-connect'
import { sendMail } from '@/app/lib/mailer'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/app/lib/stripe', () => ({
  getStripe: jest.fn(),
}))

jest.mock('@/app/lib/stripe-connect', () => ({
  extractStripeAccountStatus: jest.fn(),
}))

jest.mock('@/app/lib/mailer', () => ({
  sendMail: jest.fn(),
}))

function createWebhookRequest(signature: string | null, payload = '{}') {
  return {
    headers: {
      get: jest.fn((name: string) => (name === 'stripe-signature' ? signature : null)),
    },
    text: jest.fn().mockResolvedValue(payload),
  } as any
}

describe('POST /api/stripe', () => {
  const stripeMock = {
    webhooks: {
      constructEvent: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123'
    ;(getStripe as jest.Mock).mockReturnValue(stripeMock)
  })

  it('retourne 400 si la signature Stripe est absente', async () => {
    ;(createClient as jest.Mock).mockReturnValue({})

    const response = await POST(createWebhookRequest(null))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Signature Stripe absente' })
  })

  it('retourne duplicate=true si l’événement a déjà été enregistré', async () => {
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'stripe_events') {
          return {
            insert: jest.fn().mockResolvedValue({
              error: { code: '23505' },
            }),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    ;(createClient as jest.Mock).mockReturnValue(supabase)
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_duplicate',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_1' } },
    })

    const response = await POST(createWebhookRequest('sig_123'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true })
  })

  it('traite checkout.session.completed, confirme l’achat et envoie l’email', async () => {
    const stripeEventsUpdateEq = jest.fn().mockResolvedValue({ error: null })

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'stripe_events') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn(() => ({
              eq: stripeEventsUpdateEq,
            })),
          }
        }

        if (table === 'achats') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'achat-1',
                    prix_paye: 25,
                    created_at: '2099-01-01T10:00:00.000Z',
                    opportunite: {
                      titre: 'Formation',
                      date_evenement: '2099-06-01T14:30:00.000Z',
                      contact_email: 'orga@example.com',
                      annonceur: { nom_formation: 'Scenio Org' },
                    },
                    comedien: {
                      prenom: 'Jean',
                      nom: 'Dupont',
                      email: 'jean@example.com',
                    },
                  },
                  error: null,
                }),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
      rpc: jest.fn().mockResolvedValue({
        data: [{ success: true, code: 'OK', message: 'confirmed' }],
        error: null,
      }),
    }

    ;(createClient as jest.Mock).mockReturnValue(supabase)
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_success',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          metadata: { achat_id: 'achat-1' },
          payment_intent: 'pi_1',
          client_reference_id: 'achat-1',
        },
      },
    })

    const response = await POST(createWebhookRequest('sig_123'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(supabase.rpc).toHaveBeenCalledWith(
      'confirm_checkout_purchase',
      expect.objectContaining({
        p_achat_id: 'achat-1',
        p_checkout_session_id: 'cs_1',
        p_payment_intent_id: 'pi_1',
        p_last_event_id: 'evt_success',
      })
    )
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jean@example.com',
        subject: expect.stringContaining('Scenio'),
      })
    )
  })

  it('met à jour le statut Stripe Connect sur account.updated', async () => {
    const annonceurEq = jest.fn().mockResolvedValue({ error: null })
    const stripeEventsEq = jest.fn().mockResolvedValue({ error: null })

    ;(extractStripeAccountStatus as jest.Mock).mockReturnValue({
      stripe_onboarding_complete: true,
      stripe_charges_enabled: true,
      stripe_payouts_enabled: true,
      stripe_details_submitted: true,
    })

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'stripe_events') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn(() => ({
              eq: stripeEventsEq,
            })),
          }
        }

        if (table === 'annonceurs') {
          return {
            update: jest.fn(() => ({
              eq: annonceurEq,
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    ;(createClient as jest.Mock).mockReturnValue(supabase)
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_account',
      type: 'account.updated',
      data: {
        object: {
          id: 'acct_123',
        },
      },
    })

    const response = await POST(createWebhookRequest('sig_123'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(extractStripeAccountStatus).toHaveBeenCalledWith({ id: 'acct_123' })
  })
})
