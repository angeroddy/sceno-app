import { POST as postAccount } from '@/app/api/stripe/connect/account/route'
import { GET as getStatus } from '@/app/api/stripe/connect/status/route'
import { POST as postOnboarding } from '@/app/api/stripe/connect/onboarding-link/route'
import { POST as postDashboard } from '@/app/api/stripe/connect/dashboard-link/route'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { getStripe } from '@/app/lib/stripe'
import {
  createExpressAccountForAnnonceur,
  extractStripeAccountStatus,
  syncExpressAccountForAnnonceur,
} from '@/app/lib/stripe-connect'

jest.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock('@/app/lib/stripe', () => ({
  getStripe: jest.fn(),
}))

jest.mock('@/app/lib/stripe-connect', () => ({
  createExpressAccountForAnnonceur: jest.fn(),
  extractStripeAccountStatus: jest.fn(),
  syncExpressAccountForAnnonceur: jest.fn(),
}))

describe('API Stripe Connect', () => {
  const stripeMock = {
    accounts: {
      retrieve: jest.fn(),
      createLoginLink: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getStripe as jest.Mock).mockReturnValue(stripeMock)
    ;(extractStripeAccountStatus as jest.Mock).mockReturnValue({
      stripe_onboarding_complete: true,
      stripe_charges_enabled: true,
      stripe_payouts_enabled: true,
      stripe_details_submitted: true,
    })
    ;(syncExpressAccountForAnnonceur as jest.Mock).mockResolvedValue({ id: 'acct_1' })
  })

  it('account crée un compte express si aucun compte Stripe n’existe', async () => {
    ;(createExpressAccountForAnnonceur as jest.Mock).mockResolvedValue({ id: 'acct_new' })
    const updateEq = jest.fn().mockResolvedValue({ error: null })

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'ann-1', auth_user_id: 'auth-1', stripe_account_id: null },
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: updateEq,
        })),
      })),
    })

    const response = await postAccount()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(createExpressAccountForAnnonceur).toHaveBeenCalled()
    expect(data.stripe_account_id).toBe('acct_new')
  })

  it('status retourne connected=false sans refresh Stripe si aucun compte n’existe', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'ann-1', stripe_account_id: null },
              error: null,
            }),
          })),
        })),
      })),
    })

    const response = await getStatus({
      nextUrl: new URL('http://localhost/api/stripe/connect/status'),
    } as any)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      connected: false,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      stripe_details_submitted: false,
    })
    expect(stripeMock.accounts.retrieve).not.toHaveBeenCalled()
  })

  it('status refresh=false retourne les données stockées sans appeler Stripe', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'ann-1',
                stripe_account_id: 'acct_1',
                stripe_onboarding_complete: false,
                stripe_charges_enabled: false,
                stripe_payouts_enabled: false,
                stripe_details_submitted: false,
              },
              error: null,
            }),
          })),
        })),
      })),
    })

    const response = await getStatus({
      nextUrl: new URL('http://localhost/api/stripe/connect/status?refresh=false'),
    } as any)

    expect(response.status).toBe(200)
    expect(stripeMock.accounts.retrieve).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      connected: true,
      stripe_account_id: 'acct_1',
      stripe_onboarding_complete: false,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      stripe_details_submitted: false,
    })
  })

  it('onboarding-link crée un lien d’onboarding Stripe', async () => {
    stripeMock.accountLinks.create.mockResolvedValue({ url: 'https://stripe.test/onboarding' })
    const updateEq = jest.fn().mockResolvedValue({ error: null })

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'ann-1', stripe_account_id: 'acct_1' },
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: updateEq,
        })),
      })),
    })
    stripeMock.accounts.retrieve.mockResolvedValue({ id: 'acct_1' })

    const response = await postOnboarding({
      nextUrl: new URL('http://localhost'),
      json: jest.fn().mockResolvedValue({
        returnPath: '/annonceur/parametres?ok=1',
        refreshPath: '/annonceur/parametres?retry=1',
      }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.url).toBe('https://stripe.test/onboarding')
    expect(stripeMock.accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'acct_1',
        type: 'account_onboarding',
        return_url: 'http://localhost/annonceur/parametres?ok=1',
        refresh_url: 'http://localhost/annonceur/parametres?retry=1',
      })
    )
  })

  it('dashboard-link retourne 409 si le compte n’est pas prêt', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'ann-1',
                stripe_account_id: 'acct_1',
                stripe_onboarding_complete: false,
                stripe_charges_enabled: true,
                stripe_payouts_enabled: true,
              },
              error: null,
            }),
          })),
        })),
      })),
    })

    const response = await postDashboard()

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: "Le compte Stripe n'est pas encore pret pour acceder au dashboard",
    })
  })
})
