import Stripe from 'stripe'
import { POST as postAccount } from '@/app/api/stripe/connect/account/route'
import { GET as getStatus } from '@/app/api/stripe/connect/status/route'
import { POST as postOnboarding } from '@/app/api/stripe/connect/onboarding-link/route'
import { POST as postDashboard } from '@/app/api/stripe/connect/dashboard-link/route'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { getStripe } from '@/app/lib/stripe'
import {
  buildStoredStripeConnectSnapshot,
  getDisconnectedStripeConnectSnapshot,
  markStripeOnboardingStarted,
  StripeConnectSyncError,
  syncStripeConnectForAnnonceur,
} from '@/app/lib/stripe-connect'

jest.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock('@/app/lib/stripe', () => ({
  getStripe: jest.fn(),
}))

jest.mock('@/app/lib/stripe-connect', () => ({
  buildStoredStripeConnectSnapshot: jest.fn(),
  getDisconnectedStripeConnectSnapshot: jest.fn(),
  markStripeOnboardingStarted: jest.fn(),
  StripeConnectSyncError: class MockStripeConnectSyncError extends Error {
    code: string

    constructor(code: string, message: string) {
      super(message)
      this.name = 'StripeConnectSyncError'
      this.code = code
    }
  },
  syncStripeConnectForAnnonceur: jest.fn(),
}))

type AnnonceurRecord = {
  id: string
  auth_user_id?: string
  stripe_account_id: string | null
  stripe_onboarding_complete?: boolean
  stripe_charges_enabled?: boolean
  stripe_payouts_enabled?: boolean
  stripe_details_submitted?: boolean
}

function createSupabaseMock({
  user = { id: 'auth-1' } as { id: string } | null,
  authError = null as { message?: string } | null,
  annonceur,
  annonceurError = null as { message?: string } | null,
}: {
  user?: { id: string } | null
  authError?: { message?: string } | null
  annonceur?: AnnonceurRecord | null
  annonceurError?: { message?: string } | null
}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: authError }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: annonceur ?? null,
            error: annonceurError,
          }),
        })),
      })),
    })),
  }
}

function readySnapshot(overrides: Partial<ReturnType<typeof defaultReadySnapshot>> = {}) {
  return {
    ...defaultReadySnapshot(),
    ...overrides,
  }
}

function defaultReadySnapshot() {
  return {
    connected: true,
    stripe_account_id: 'acct_1',
    stripe_onboarding_complete: true,
    stripe_charges_enabled: true,
    stripe_payouts_enabled: true,
    stripe_details_submitted: true,
    stripe_requirements_currently_due: [],
    stripe_requirements_pending_verification: [],
    stripe_requirements_eventually_due: [],
    stripe_requirements_disabled_reason: null,
    stripe_has_pending_representative_verification: false,
    stripe_dashboard_ready: true,
  }
}

describe('API Stripe Connect', () => {
  const stripeMock = {
    accounts: {
      createLoginLink: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.NEXT_PUBLIC_APP_URL

    ;(getStripe as jest.Mock).mockReturnValue(stripeMock)
    ;(getDisconnectedStripeConnectSnapshot as jest.Mock).mockReturnValue({
      connected: false,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      stripe_details_submitted: false,
      stripe_requirements_currently_due: [],
      stripe_requirements_pending_verification: [],
      stripe_requirements_eventually_due: [],
      stripe_requirements_disabled_reason: null,
      stripe_has_pending_representative_verification: false,
      stripe_dashboard_ready: false,
    })
    ;(buildStoredStripeConnectSnapshot as jest.Mock).mockImplementation((annonceur: AnnonceurRecord) => ({
      connected: true,
      stripe_account_id: annonceur.stripe_account_id,
      stripe_onboarding_complete: Boolean(annonceur.stripe_onboarding_complete),
      stripe_charges_enabled: Boolean(annonceur.stripe_charges_enabled),
      stripe_payouts_enabled: Boolean(annonceur.stripe_payouts_enabled),
      stripe_details_submitted: Boolean(annonceur.stripe_details_submitted),
      stripe_requirements_currently_due: [],
      stripe_requirements_pending_verification: [],
      stripe_requirements_eventually_due: [],
      stripe_requirements_disabled_reason: null,
      stripe_has_pending_representative_verification: false,
      stripe_dashboard_ready: Boolean(
        annonceur.stripe_onboarding_complete &&
        annonceur.stripe_charges_enabled &&
        annonceur.stripe_payouts_enabled
      ),
    }))
    ;(syncStripeConnectForAnnonceur as jest.Mock).mockResolvedValue({
      account: { id: 'acct_1' },
      created: false,
      snapshot: defaultReadySnapshot(),
    })
    ;(markStripeOnboardingStarted as jest.Mock).mockResolvedValue(undefined)
  })

  describe('POST /api/stripe/connect/account', () => {
    it('retourne 401 si l’utilisateur n’est pas authentifié', async () => {
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({ user: null })
      )

      const response = await postAccount()

      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toEqual({ error: 'Non authentifie' })
      expect(syncStripeConnectForAnnonceur).not.toHaveBeenCalled()
    })

    it('retourne 404 si le profil annonceur est introuvable', async () => {
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: null,
          annonceurError: { message: 'not found' },
        })
      )

      const response = await postAccount()

      expect(response.status).toBe(404)
      await expect(response.json()).resolves.toEqual({ error: 'Profil annonceur introuvable' })
    })

    it('crée ou synchronise le compte via le service central', async () => {
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockResolvedValue({
        account: { id: 'acct_new' },
        created: true,
        snapshot: readySnapshot({ stripe_account_id: 'acct_new' }),
      })
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', auth_user_id: 'auth-1', stripe_account_id: null },
        })
      )

      const response = await postAccount()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(syncStripeConnectForAnnonceur).toHaveBeenCalledWith(
        expect.any(Object),
        stripeMock,
        expect.objectContaining({ id: 'ann-1' }),
        { allowCreate: true, persist: true }
      )
      expect(data).toEqual({
        connected: true,
        stripe_account_id: 'acct_new',
        stripe_onboarding_complete: true,
        stripe_charges_enabled: true,
        stripe_payouts_enabled: true,
        stripe_details_submitted: true,
      })
    })

    it('retourne le code métier si la synchro Stripe échoue côté service', async () => {
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockRejectedValue(
        new StripeConnectSyncError('stripe_status_persist_failed', 'Impossible de sauvegarder le statut Stripe')
      )
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', auth_user_id: 'auth-1', stripe_account_id: 'acct_1' },
        })
      )

      const response = await postAccount()

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({
        error: 'Impossible de sauvegarder le statut Stripe',
        code: 'stripe_status_persist_failed',
      })
    })

    it('remonte proprement une erreur Stripe standard', async () => {
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockRejectedValue(
        new Stripe.errors.StripeError({
          message: 'No such account',
          type: 'invalid_request_error',
        } as any)
      )
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', auth_user_id: 'auth-1', stripe_account_id: 'acct_missing' },
        })
      )

      const response = await postAccount()

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({ error: 'No such account', param: null })
    })

    it('traduit une erreur Stripe de numéro de téléphone invalide', async () => {
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockRejectedValue(
        new Stripe.errors.StripeError({
          message: '"+33123456789" is not a valid phone number',
          type: 'invalid_request_error',
          code: 'invalid_phone_number',
        } as any)
      )
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', auth_user_id: 'auth-1', stripe_account_id: null },
        })
      )

      const response = await postAccount()

      expect(response.status).toBe(422)
      await expect(response.json()).resolves.toEqual({
        error:
          "Stripe refuse ce numéro de téléphone. Utilisez un numéro réel au format international (par exemple +33 suivi de 9 chiffres). Pour le représentant légal, utilisez son numéro personnel plutôt que celui de l'organisme.",
        param: null,
      })
    })

    it('traduit précisément une erreur Stripe sur representative.phone', async () => {
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockRejectedValue(
        new Stripe.errors.StripeError({
          message: '"+33600000000" is not a valid phone number',
          type: 'invalid_request_error',
          code: 'invalid_phone_number',
          param: 'representative.phone',
        } as any)
      )
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', auth_user_id: 'auth-1', stripe_account_id: null },
        })
      )

      const response = await postAccount()

      expect(response.status).toBe(422)
      await expect(response.json()).resolves.toEqual({
        error:
          "Stripe refuse le téléphone du représentant légal. Vérifiez le champ « Téléphone du représentant » et utilisez son numéro personnel au format international (par exemple +33 suivi de 9 chiffres).",
        param: 'representative.phone',
      })
    })
  })

  describe('GET /api/stripe/connect/status', () => {
    it('retourne 401 si l’utilisateur n’est pas authentifié', async () => {
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({ user: null })
      )

      const response = await getStatus({
        nextUrl: new URL('http://localhost/api/stripe/connect/status'),
      } as any)

      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toEqual({ error: 'Non authentifie' })
    })

    it('retourne le snapshot déconnecté si aucun compte Stripe n’existe', async () => {
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', stripe_account_id: null },
        })
      )

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
        stripe_requirements_currently_due: [],
        stripe_requirements_pending_verification: [],
        stripe_requirements_eventually_due: [],
        stripe_requirements_disabled_reason: null,
        stripe_has_pending_representative_verification: false,
        stripe_dashboard_ready: false,
      })
      expect(syncStripeConnectForAnnonceur).not.toHaveBeenCalled()
    })

    it('retourne le snapshot stocké sans appel Stripe si refresh=false', async () => {
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: {
            id: 'ann-1',
            stripe_account_id: 'acct_1',
            stripe_onboarding_complete: false,
            stripe_charges_enabled: true,
            stripe_payouts_enabled: false,
            stripe_details_submitted: false,
          },
        })
      )

      const response = await getStatus({
        nextUrl: new URL('http://localhost/api/stripe/connect/status?refresh=false'),
      } as any)

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        connected: true,
        stripe_account_id: 'acct_1',
        stripe_onboarding_complete: false,
        stripe_charges_enabled: true,
        stripe_payouts_enabled: false,
        stripe_details_submitted: false,
        stripe_requirements_currently_due: [],
        stripe_requirements_pending_verification: [],
        stripe_requirements_eventually_due: [],
        stripe_requirements_disabled_reason: null,
        stripe_has_pending_representative_verification: false,
        stripe_dashboard_ready: false,
      })
      expect(buildStoredStripeConnectSnapshot).toHaveBeenCalledWith(expect.objectContaining({
        stripe_account_id: 'acct_1',
      }))
      expect(syncStripeConnectForAnnonceur).not.toHaveBeenCalled()
    })

    it('rafraîchit Stripe live si refresh=true', async () => {
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockResolvedValue({
        account: { id: 'acct_live' },
        created: false,
        snapshot: readySnapshot({
          stripe_account_id: 'acct_live',
          stripe_requirements_pending_verification: ['representative.verification.document'],
          stripe_has_pending_representative_verification: true,
        }),
      })
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', stripe_account_id: 'acct_live' },
        })
      )

      const response = await getStatus({
        nextUrl: new URL('http://localhost/api/stripe/connect/status?refresh=true'),
      } as any)

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual(readySnapshot({
        stripe_account_id: 'acct_live',
        stripe_requirements_pending_verification: ['representative.verification.document'],
        stripe_has_pending_representative_verification: true,
      }))
      expect(syncStripeConnectForAnnonceur).toHaveBeenCalledWith(
        expect.any(Object),
        stripeMock,
        expect.objectContaining({ id: 'ann-1' }),
        { allowCreate: false, persist: true }
      )
    })

    it('retourne 500 avec code métier si le refresh live échoue', async () => {
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockRejectedValue(
        new StripeConnectSyncError('stripe_status_persist_failed', 'Impossible de sauvegarder le statut Stripe')
      )
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', stripe_account_id: 'acct_1' },
        })
      )

      const response = await getStatus({
        nextUrl: new URL('http://localhost/api/stripe/connect/status?refresh=true'),
      } as any)

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({
        error: 'Impossible de sauvegarder le statut Stripe',
        code: 'stripe_status_persist_failed',
      })
    })

    it('remonte proprement une erreur Stripe standard pendant le refresh live', async () => {
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockRejectedValue(
        new Stripe.errors.StripeError({
          message: 'No such account',
          type: 'invalid_request_error',
        } as any)
      )
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', stripe_account_id: 'acct_missing' },
        })
      )

      const response = await getStatus({
        nextUrl: new URL('http://localhost/api/stripe/connect/status?refresh=true'),
      } as any)

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({ error: 'No such account' })
    })
  })

  describe('POST /api/stripe/connect/onboarding-link', () => {
    it('retourne 401 si l’utilisateur n’est pas authentifié', async () => {
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({ user: null })
      )

      const response = await postOnboarding({
        nextUrl: new URL('http://localhost'),
        json: jest.fn().mockResolvedValue({}),
      } as any)

      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toEqual({ error: 'Non authentifie' })
    })

    it('crée un lien d’onboarding avec les chemins personnalisés', async () => {
      stripeMock.accountLinks.create.mockResolvedValue({ url: 'https://stripe.test/onboarding' })
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', stripe_account_id: 'acct_1' },
        })
      )

      const response = await postOnboarding({
        nextUrl: new URL('http://localhost'),
        json: jest.fn().mockResolvedValue({
          returnPath: '/annonceur/parametres?ok=1',
          refreshPath: '/annonceur/parametres?retry=1',
        }),
      } as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        url: 'https://stripe.test/onboarding',
        stripe_account_id: 'acct_1',
      })
      expect(syncStripeConnectForAnnonceur).toHaveBeenCalledWith(
        expect.any(Object),
        stripeMock,
        expect.objectContaining({ id: 'ann-1' }),
        { allowCreate: true, persist: true }
      )
      expect(markStripeOnboardingStarted).toHaveBeenCalledWith(
        stripeMock,
        'acct_1',
        expect.objectContaining({ id: 'ann-1' })
      )
      expect(stripeMock.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_1',
        type: 'account_onboarding',
        return_url: 'http://localhost/annonceur/parametres?ok=1',
        refresh_url: 'http://localhost/annonceur/parametres?retry=1',
      })
    })

    it('utilise NEXT_PUBLIC_APP_URL et les chemins par défaut si le body est absent', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.scenio.test/'
      stripeMock.accountLinks.create.mockResolvedValue({ url: 'https://stripe.test/default' })
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', stripe_account_id: 'acct_1' },
        })
      )

      const response = await postOnboarding({
        nextUrl: new URL('http://localhost'),
        json: jest.fn().mockRejectedValue(new Error('empty body')),
      } as any)

      expect(response.status).toBe(200)
      expect(markStripeOnboardingStarted).toHaveBeenCalledWith(
        stripeMock,
        'acct_1',
        expect.objectContaining({ id: 'ann-1' })
      )
      expect(stripeMock.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_1',
        type: 'account_onboarding',
        return_url: 'https://app.scenio.test/annonceur/parametres?stripe=return',
        refresh_url: 'https://app.scenio.test/annonceur/parametres?stripe=refresh',
      })
    })

    it('retourne une erreur dédiée si la synchro préalable échoue', async () => {
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockRejectedValue(
        new StripeConnectSyncError('stripe_status_persist_failed', 'Impossible de sauvegarder le statut Stripe')
      )
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', stripe_account_id: 'acct_1' },
        })
      )

      const response = await postOnboarding({
        nextUrl: new URL('http://localhost'),
        json: jest.fn().mockResolvedValue({}),
      } as any)

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({
        error: 'Impossible de sauvegarder le statut Stripe',
        code: 'stripe_status_persist_failed',
      })
      expect(markStripeOnboardingStarted).not.toHaveBeenCalled()
      expect(stripeMock.accountLinks.create).not.toHaveBeenCalled()
    })

    it('remonte l’erreur Stripe si la création du lien échoue', async () => {
      stripeMock.accountLinks.create.mockRejectedValue(
        new Stripe.errors.StripeError({
          message: 'Account onboarding unavailable',
          type: 'invalid_request_error',
        } as any)
      )
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', stripe_account_id: 'acct_1' },
        })
      )

      const response = await postOnboarding({
        nextUrl: new URL('http://localhost'),
        json: jest.fn().mockResolvedValue({}),
      } as any)

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({
        error: 'Account onboarding unavailable',
        param: null,
      })
      expect(markStripeOnboardingStarted).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/stripe/connect/dashboard-link', () => {
    it('retourne 404 si le profil annonceur est introuvable', async () => {
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: null,
          annonceurError: { message: 'not found' },
        })
      )

      const response = await postDashboard()

      expect(response.status).toBe(404)
      await expect(response.json()).resolves.toEqual({ error: 'Profil annonceur introuvable' })
    })

    it('retourne 409 si le compte n’est pas prêt', async () => {
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockResolvedValue({
        account: { id: 'acct_1' },
        created: false,
        snapshot: readySnapshot({
          stripe_onboarding_complete: false,
          stripe_details_submitted: false,
          stripe_requirements_currently_due: ['representative.verification.document'],
          stripe_has_pending_representative_verification: true,
          stripe_dashboard_ready: false,
        }),
      })
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', stripe_account_id: 'acct_1' },
        })
      )

      const response = await postDashboard()

      expect(response.status).toBe(409)
      await expect(response.json()).resolves.toEqual({
        error: "Le compte Stripe n'est pas encore pret pour acceder au dashboard",
      })
      expect(stripeMock.accounts.createLoginLink).not.toHaveBeenCalled()
    })

    it('ouvre le dashboard Stripe si le compte est prêt', async () => {
      stripeMock.accounts.createLoginLink.mockResolvedValue({ url: 'https://stripe.test/login' })
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', stripe_account_id: 'acct_ready' },
        })
      )
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockResolvedValue({
        account: { id: 'acct_ready' },
        created: false,
        snapshot: readySnapshot({ stripe_account_id: 'acct_ready' }),
      })

      const response = await postDashboard()

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ url: 'https://stripe.test/login' })
      expect(stripeMock.accounts.createLoginLink).toHaveBeenCalledWith('acct_ready')
    })

    it('retourne une erreur dédiée si le refresh live échoue', async () => {
      ;(syncStripeConnectForAnnonceur as jest.Mock).mockRejectedValue(
        new StripeConnectSyncError('stripe_status_persist_failed', 'Impossible de sauvegarder le statut Stripe')
      )
      ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(
        createSupabaseMock({
          annonceur: { id: 'ann-1', stripe_account_id: 'acct_1' },
        })
      )

      const response = await postDashboard()

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({
        error: 'Impossible de sauvegarder le statut Stripe',
        code: 'stripe_status_persist_failed',
      })
    })
  })
})
