import Stripe from 'stripe'
import {
  buildStoredStripeConnectSnapshot,
  buildStripeConnectSnapshot,
  createExpressAccountForAnnonceur,
  getDisconnectedStripeConnectSnapshot,
  persistStripeConnectSnapshot,
  syncStripeConnectForAnnonceur,
  syncExpressAccountForAnnonceur,
  toStripeCountryCode,
} from '@/app/lib/stripe-connect'
import type { Annonceur } from '@/app/types'

function createBaseAnnonceur(overrides: Partial<Annonceur> = {}): Annonceur {
  return {
    id: 'ann_1',
    auth_user_id: 'user_1',
    nom_formation: 'Studio Scene',
    email: 'contact@example.com',
    iban: null,
    nom_titulaire_compte: null,
    bic_swift: null,
    email_verifie: true,
    identite_verifiee: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    type_annonceur: 'entreprise',
    telephone: '+33627184539',
    nom: null,
    prenom: null,
    date_naissance: null,
    adresse_rue: null,
    adresse_ville: null,
    adresse_code_postal: null,
    adresse_pays: null,
    type_piece_identite: null,
    piece_identite_url: null,
    nom_entreprise: 'Studio Scene SAS',
    type_juridique: 'sas',
    pays_entreprise: 'France',
    numero_legal: '123 456 789',
    siege_rue: '1 rue de Paris',
    siege_ville: 'Paris',
    siege_code_postal: '75001',
    siege_pays: 'France',
    representant_nom: 'Durand',
    representant_prenom: 'Camille',
    representant_telephone: '+33699887766',
    representant_date_naissance: '1990-05-10',
    representant_adresse_rue: '2 rue de Lyon',
    representant_adresse_ville: 'Paris',
    representant_adresse_code_postal: '75002',
    representant_adresse_pays: 'France',
    representant_piece_identite_url: null,
    representant_type_piece_identite: null,
    stripe_account_id: null,
    stripe_onboarding_complete: false,
    stripe_charges_enabled: false,
    stripe_payouts_enabled: false,
    stripe_details_submitted: false,
    ...overrides,
  }
}

function createStripeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'acct_1',
    details_submitted: true,
    charges_enabled: true,
    payouts_enabled: true,
    requirements: {
      currently_due: [],
      pending_verification: [],
      eventually_due: [],
      disabled_reason: null,
    },
    ...overrides,
  } as Stripe.Account
}

describe('stripe-connect helpers', () => {
  describe('payloads', () => {
    it('préremplit business_type et company à la création d’un compte entreprise', async () => {
      const annonceur = createBaseAnnonceur()
      const create = jest.fn().mockResolvedValue(createStripeAccount({
        id: 'acct_new',
        details_submitted: false,
        metadata: { scenio_onboarding_started: 'false' },
      }))
      const listPersons = jest.fn().mockResolvedValue({ data: [] })
      const createPerson = jest.fn().mockResolvedValue({ id: 'person_1' })
      const retrieve = jest.fn().mockResolvedValue(createStripeAccount({ id: 'acct_new' }))
      const stripe = { accounts: { create, listPersons, createPerson, retrieve } } as any

      await createExpressAccountForAnnonceur(stripe, annonceur)

      expect(create).toHaveBeenCalledWith(expect.objectContaining({
        type: 'express',
        country: 'FR',
        business_type: 'company',
        email: 'contact@example.com',
        metadata: expect.objectContaining({
          scenio_onboarding_started: 'false',
        }),
        company: expect.objectContaining({
          name: 'Studio Scene SAS',
          tax_id: '123456789',
        }),
      }))
      expect(createPerson).toHaveBeenCalledWith('acct_new', expect.objectContaining({
          first_name: 'Camille',
          last_name: 'Durand',
          relationship: expect.objectContaining({
            representative: true,
          }),
        }))
      expect(retrieve).toHaveBeenCalledWith('acct_new')
    })

    it('préremplit business_type et individual à la création d’un compte personne physique', async () => {
      const annonceur = createBaseAnnonceur({
        type_annonceur: 'personne_physique',
        nom: 'Martin',
        prenom: 'Lea',
        date_naissance: '1988-07-14',
        adresse_rue: '3 rue des Lilas',
        adresse_ville: 'Lyon',
        adresse_code_postal: '69001',
        adresse_pays: 'France',
        pays_entreprise: null,
      })
      const create = jest.fn().mockResolvedValue({ id: 'acct_individual' })
      const stripe = { accounts: { create } } as any

      await createExpressAccountForAnnonceur(stripe, annonceur)

      expect(create).toHaveBeenCalledWith(expect.objectContaining({
        business_type: 'individual',
        country: 'FR',
        metadata: expect.objectContaining({
          scenio_onboarding_started: 'false',
        }),
        individual: expect.objectContaining({
          first_name: 'Lea',
          last_name: 'Martin',
          dob: { year: 1988, month: 7, day: 14 },
          address: expect.objectContaining({
            line1: '3 rue des Lilas',
            city: 'Lyon',
            postal_code: '69001',
            country: 'FR',
          }),
        }),
      }))
    })

    it("n'utilise plus le téléphone de l'organisme comme fallback du représentant", async () => {
      const annonceur = createBaseAnnonceur({
        telephone: '+33123456789',
        representant_telephone: null,
      })
      const create = jest.fn().mockResolvedValue(createStripeAccount({
        id: 'acct_new',
        details_submitted: false,
        metadata: { scenio_onboarding_started: 'false' },
      }))
      const listPersons = jest.fn().mockResolvedValue({ data: [] })
      const createPerson = jest.fn().mockResolvedValue({ id: 'person_1' })
      const retrieve = jest.fn().mockResolvedValue(createStripeAccount({ id: 'acct_new' }))
      const stripe = { accounts: { create, listPersons, createPerson, retrieve } } as any

      await createExpressAccountForAnnonceur(stripe, annonceur)

      const representativePayload = createPerson.mock.calls[0][1]
      expect(representativePayload.phone).toBeUndefined()
    })

    it('continue la création du compte entreprise même si le sync du représentant Stripe échoue', async () => {
      const annonceur = createBaseAnnonceur()
      const create = jest.fn().mockResolvedValue(createStripeAccount({
        id: 'acct_new',
        details_submitted: false,
        metadata: { scenio_onboarding_started: 'false' },
      }))
      const listPersons = jest.fn().mockResolvedValue({ data: [] })
      const createPerson = jest.fn().mockRejectedValue(
        new Stripe.errors.StripeError({
          message: 'Representative sync failed',
          type: 'invalid_request_error',
        } as any)
      )
      const retrieve = jest.fn().mockResolvedValue(createStripeAccount({ id: 'acct_new' }))
      const stripe = { accounts: { create, listPersons, createPerson, retrieve } } as any

      await expect(createExpressAccountForAnnonceur(stripe, annonceur)).resolves.toMatchObject({
        id: 'acct_new',
      })
      expect(create).toHaveBeenCalled()
      expect(createPerson).toHaveBeenCalled()
      expect(retrieve).toHaveBeenCalledWith('acct_new')
    })

    it('n’essaie pas de remettre business_type/company lors du sync d’un compte express existant', async () => {
      const annonceur = createBaseAnnonceur()
      const update = jest.fn().mockResolvedValue({ id: 'acct_existing' })
      const retrieve = jest.fn().mockResolvedValue(createStripeAccount({ id: 'acct_existing' }))
      const stripe = { accounts: { update, retrieve } } as any

      await syncExpressAccountForAnnonceur(stripe, 'acct_existing', annonceur, {
        syncKycPrefill: false,
        onboardingStarted: true,
      })

      expect(update).toHaveBeenCalledWith('acct_existing', expect.objectContaining({
        metadata: expect.objectContaining({
          annonceur_id: 'ann_1',
          scenio_onboarding_started: 'true',
        }),
        business_profile: expect.objectContaining({
          name: 'Studio Scene',
        }),
      }))

      const payload = update.mock.calls[0][1]
      expect(payload.email).toBeUndefined()
      expect(payload.business_type).toBeUndefined()
      expect(payload.company).toBeUndefined()
      expect(payload.individual).toBeUndefined()
    })

    it('met à jour les champs KYC et le représentant avant le premier onboarding', async () => {
      const annonceur = createBaseAnnonceur({ stripe_account_id: 'acct_existing' })
      const update = jest.fn().mockResolvedValue({ id: 'acct_existing' })
      const listPersons = jest.fn().mockResolvedValue({ data: [] })
      const createPerson = jest.fn().mockResolvedValue({ id: 'person_new' })
      const retrieve = jest.fn().mockResolvedValue(createStripeAccount({
        id: 'acct_existing',
        details_submitted: false,
        metadata: { scenio_onboarding_started: 'false' },
      }))
      const stripe = { accounts: { update, listPersons, createPerson, retrieve } } as any

      await syncExpressAccountForAnnonceur(stripe, 'acct_existing', annonceur, {
        syncKycPrefill: true,
        onboardingStarted: false,
      })

      expect(update).toHaveBeenCalledWith('acct_existing', expect.objectContaining({
        email: 'contact@example.com',
        metadata: expect.objectContaining({
          scenio_onboarding_started: 'false',
        }),
        company: expect.objectContaining({
          name: 'Studio Scene SAS',
          tax_id: '123456789',
        }),
      }))
      expect(listPersons).toHaveBeenCalledWith('acct_existing', {
        limit: 1,
        relationship: { representative: true },
      })
      expect(createPerson).toHaveBeenCalledWith('acct_existing', expect.objectContaining({
        first_name: 'Camille',
        last_name: 'Durand',
        relationship: expect.objectContaining({
          representative: true,
        }),
      }))
      expect(retrieve).toHaveBeenCalledWith('acct_existing')
    })

    it('retente sans email si Stripe refuse la modification de ce champ', async () => {
      const annonceur = createBaseAnnonceur({ stripe_account_id: 'acct_existing' })
      const update = jest.fn()
        .mockRejectedValueOnce(
          new Stripe.errors.StripeError({
            message: "This application is not authorized to edit the parameter 'email'.",
            type: 'invalid_request_error',
            param: 'email',
          } as any)
        )
        .mockResolvedValueOnce({ id: 'acct_existing' })
      const retrieve = jest.fn().mockResolvedValue(createStripeAccount({
        id: 'acct_existing',
        details_submitted: false,
        metadata: { scenio_onboarding_started: 'false' },
      }))
      const stripe = { accounts: { update, retrieve } } as any

      await syncExpressAccountForAnnonceur(stripe, 'acct_existing', annonceur, {
        syncKycPrefill: false,
        onboardingStarted: false,
      })

      expect(update).toHaveBeenCalledTimes(2)
      expect(update).toHaveBeenNthCalledWith(
        1,
        'acct_existing',
        expect.objectContaining({
          email: 'contact@example.com',
        })
      )
      expect(update).toHaveBeenNthCalledWith(
        2,
        'acct_existing',
        expect.not.objectContaining({
          email: expect.anything(),
        })
      )
      expect(retrieve).toHaveBeenCalledWith('acct_existing')
    })
  })

  describe('snapshots', () => {
    it('retourne un snapshot déconnecté cohérent', () => {
      expect(getDisconnectedStripeConnectSnapshot()).toEqual({
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
    })

    it('construit un snapshot Stripe complet avec requirements et dashboard_ready', () => {
      const snapshot = buildStripeConnectSnapshot(
        'acct_1',
        createStripeAccount({
          details_submitted: true,
          charges_enabled: true,
          payouts_enabled: false,
          requirements: {
            currently_due: ['company.tax_id'],
            pending_verification: ['representative.verification.document'],
            eventually_due: ['external_account'],
            disabled_reason: 'requirements.pending_verification',
          },
        })
      )

      expect(snapshot).toEqual({
        connected: true,
        stripe_account_id: 'acct_1',
        stripe_onboarding_complete: true,
        stripe_charges_enabled: true,
        stripe_payouts_enabled: false,
        stripe_details_submitted: true,
        stripe_requirements_currently_due: ['company.tax_id'],
        stripe_requirements_pending_verification: ['representative.verification.document'],
        stripe_requirements_eventually_due: ['external_account'],
        stripe_requirements_disabled_reason: 'requirements.pending_verification',
        stripe_has_pending_representative_verification: true,
        stripe_dashboard_ready: false,
      })
    })

    it('reconstruit un snapshot stocké sans toucher Stripe', () => {
      const snapshot = buildStoredStripeConnectSnapshot({
        stripe_account_id: 'acct_stored',
        stripe_onboarding_complete: false,
        stripe_charges_enabled: true,
        stripe_payouts_enabled: false,
        stripe_details_submitted: false,
      })

      expect(snapshot).toEqual({
        connected: true,
        stripe_account_id: 'acct_stored',
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
    })
  })

  describe('syncStripeConnectForAnnonceur', () => {
    it('ne crée pas de compte si allowCreate=false et aucun compte local n’existe', async () => {
      const annonceur = createBaseAnnonceur({ stripe_account_id: null })
      const create = jest.fn()
      const update = jest.fn()
      const retrieve = jest.fn()

      const result = await syncStripeConnectForAnnonceur(
        {} as any,
        { accounts: { create, update, retrieve } } as any,
        annonceur,
        { allowCreate: false, persist: false }
      )

      expect(create).not.toHaveBeenCalled()
      expect(update).not.toHaveBeenCalled()
      expect(retrieve).not.toHaveBeenCalled()
      expect(result).toEqual({
        account: null,
        created: false,
        snapshot: getDisconnectedStripeConnectSnapshot(),
      })
    })

    it('crée un compte si allowCreate=true et aucun compte local n’existe', async () => {
      const annonceur = createBaseAnnonceur({ stripe_account_id: null })
      const create = jest.fn().mockResolvedValue(createStripeAccount({ id: 'acct_created' }))
      const listPersons = jest.fn().mockResolvedValue({ data: [] })
      const createPerson = jest.fn().mockResolvedValue({ id: 'person_created' })
      const retrieve = jest.fn().mockResolvedValue(createStripeAccount({ id: 'acct_created' }))
      const persistedEq = jest.fn().mockResolvedValue({ error: null })
      const supabase = {
        from: jest.fn(() => ({
          update: jest.fn(() => ({
            eq: persistedEq,
          })),
        })),
      } as any

      const result = await syncStripeConnectForAnnonceur(
        supabase,
        { accounts: { create, listPersons, createPerson, retrieve } } as any,
        annonceur,
        { allowCreate: true, persist: true }
      )

      expect(create).toHaveBeenCalled()
      expect(createPerson).toHaveBeenCalled()
      expect(result.created).toBe(true)
      expect(result.snapshot.stripe_account_id).toBe('acct_created')
      expect(persistedEq).toHaveBeenCalledWith('id', 'ann_1')
    })

    it('synchronise puis récupère le compte existant quand il est encore valide', async () => {
      const annonceur = createBaseAnnonceur({ stripe_account_id: 'acct_existing' })
      const update = jest.fn().mockResolvedValue({ id: 'acct_existing' })
      const retrieve = jest.fn().mockResolvedValue(
        createStripeAccount({
          id: 'acct_existing',
          charges_enabled: false,
          payouts_enabled: false,
        })
      )
      const supabase = {
        from: jest.fn(() => ({
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null }),
          })),
        })),
      } as any

      const result = await syncStripeConnectForAnnonceur(
        supabase,
        { accounts: { update, retrieve } } as any,
        annonceur,
        { allowCreate: true, persist: true }
      )

      expect(update).toHaveBeenCalledWith('acct_existing', expect.any(Object))
      expect(retrieve).toHaveBeenCalledTimes(2)
      expect(retrieve).toHaveBeenCalledWith('acct_existing')
      expect(result.created).toBe(false)
      expect(result.snapshot.stripe_dashboard_ready).toBe(false)
    })

    it('recrée le compte si l’identifiant Stripe local n’existe plus', async () => {
      const missingError = new Stripe.errors.StripeError({
        message: 'No such account',
        type: 'invalid_request_error',
        code: 'resource_missing',
      } as any)

      const annonceur = createBaseAnnonceur({ stripe_account_id: 'acct_missing' })
      const retrieve = jest.fn()
        .mockRejectedValueOnce(missingError)
        .mockResolvedValueOnce(
          createStripeAccount({
            id: 'acct_recreated',
            details_submitted: false,
            charges_enabled: false,
            payouts_enabled: false,
          })
        )
      const create = jest.fn().mockResolvedValue(
        createStripeAccount({
          id: 'acct_recreated',
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
        })
      )
      const createPerson = jest.fn().mockResolvedValue({ id: 'person_recreated' })
      const persistedEq = jest.fn().mockResolvedValue({ error: null })
      const supabase = {
        from: jest.fn(() => ({
          update: jest.fn(() => ({
            eq: persistedEq,
          })),
        })),
      } as any

      const result = await syncStripeConnectForAnnonceur(
        supabase,
        {
          accounts: {
            retrieve,
            create,
            createPerson,
            listPersons: jest.fn().mockResolvedValue({ data: [] }),
          },
        } as any,
        annonceur,
        { allowCreate: true, persist: true }
      )

      expect(create).toHaveBeenCalled()
      expect(createPerson).toHaveBeenCalled()
      expect(result.created).toBe(true)
      expect(result.snapshot.stripe_account_id).toBe('acct_recreated')
      expect(result.snapshot.stripe_dashboard_ready).toBe(false)
      expect(persistedEq).toHaveBeenCalledWith('id', 'ann_1')
    })

    it('recrée aussi le compte si Stripe ne renvoie que le message No such account', async () => {
      const missingError = new Stripe.errors.StripeError({
        message: 'No such account',
        type: 'invalid_request_error',
      } as any)

      const annonceur = createBaseAnnonceur({ stripe_account_id: 'acct_missing' })
      const retrieve = jest.fn()
        .mockRejectedValueOnce(missingError)
        .mockResolvedValueOnce(
          createStripeAccount({
            id: 'acct_recreated',
            details_submitted: false,
            charges_enabled: false,
            payouts_enabled: false,
          })
        )
      const create = jest.fn().mockResolvedValue(
        createStripeAccount({
          id: 'acct_recreated',
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
        })
      )
      const createPerson = jest.fn().mockResolvedValue({ id: 'person_recreated' })
      const persistedEq = jest.fn().mockResolvedValue({ error: null })
      const supabase = {
        from: jest.fn(() => ({
          update: jest.fn(() => ({
            eq: persistedEq,
          })),
        })),
      } as any

      const result = await syncStripeConnectForAnnonceur(
        supabase,
        {
          accounts: {
            retrieve,
            create,
            createPerson,
            listPersons: jest.fn().mockResolvedValue({ data: [] }),
          },
        } as any,
        annonceur,
        { allowCreate: true, persist: true }
      )

      expect(create).toHaveBeenCalled()
      expect(createPerson).toHaveBeenCalled()
      expect(result.created).toBe(true)
      expect(result.snapshot.stripe_account_id).toBe('acct_recreated')
      expect(result.snapshot.stripe_dashboard_ready).toBe(false)
      expect(persistedEq).toHaveBeenCalledWith('id', 'ann_1')
    })

    it('propage l’erreur Stripe si le compte manque et allowCreate=false', async () => {
      const missingError = new Stripe.errors.StripeError({
        message: 'No such account',
        type: 'invalid_request_error',
        code: 'resource_missing',
      } as any)

      const annonceur = createBaseAnnonceur({ stripe_account_id: 'acct_missing' })
      const retrieve = jest.fn().mockRejectedValue(missingError)

      await expect(
        syncStripeConnectForAnnonceur(
          {
            from: jest.fn(() => ({
              update: jest.fn(() => ({
                eq: jest.fn(),
              })),
            })),
          } as any,
          { accounts: { retrieve } } as any,
          annonceur,
          { allowCreate: false, persist: true }
        )
      ).rejects.toBe(missingError)
    })

    it('n’écrit pas en base si persist=false', async () => {
      const annonceur = createBaseAnnonceur({ stripe_account_id: 'acct_existing' })
      const update = jest.fn().mockResolvedValue({ id: 'acct_existing' })
      const retrieve = jest.fn().mockResolvedValue(createStripeAccount({ id: 'acct_existing' }))
      const eq = jest.fn()
      const supabase = {
        from: jest.fn(() => ({
          update: jest.fn(() => ({
            eq,
          })),
        })),
      } as any

      const result = await syncStripeConnectForAnnonceur(
        supabase,
        { accounts: { update, retrieve } } as any,
        annonceur,
        { allowCreate: false, persist: false }
      )

      expect(result.snapshot.stripe_account_id).toBe('acct_existing')
      expect(retrieve).toHaveBeenCalledTimes(2)
      expect(eq).not.toHaveBeenCalled()
    })
  })

  describe('persistStripeConnectSnapshot', () => {
    it('remonte une erreur dédiée si la persistance du statut Stripe échoue', async () => {
      const supabase = {
        from: jest.fn(() => ({
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'db write failed' },
            }),
          })),
        })),
      } as any

      await expect(
        persistStripeConnectSnapshot(supabase, 'ann_1', {
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
        })
      ).rejects.toMatchObject({
        code: 'stripe_status_persist_failed',
      })
    })
  })

  describe('misc', () => {
    it('convertit correctement les pays fréquents vers ISO-2', () => {
      expect(toStripeCountryCode('France')).toBe('FR')
      expect(toStripeCountryCode('belgique')).toBe('BE')
      expect(toStripeCountryCode('CH')).toBe('CH')
      expect(toStripeCountryCode('Canada')).toBe('CA')
      expect(toStripeCountryCode('Pays inventé')).toBe('FR')
    })
  })
})
