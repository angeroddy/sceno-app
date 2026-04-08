import { POST } from '@/app/api/checkout/session/route'
import { createServerSupabaseClient } from '@/app/lib/supabase'
import { getStripe } from '@/app/lib/stripe'
import { reconcileOpportunityPlaces } from '@/app/lib/opportunity-availability'

jest.mock('@/app/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock('@/app/lib/stripe', () => ({
  getStripe: jest.fn(),
}))

jest.mock('@/app/lib/opportunity-availability', () => ({
  reconcileOpportunityPlaces: jest.fn(),
}))

function createRequest(body: unknown) {
  return {
    json: jest.fn().mockResolvedValue(body),
    nextUrl: { origin: 'http://localhost:3000' },
  } as any
}

describe('POST /api/checkout/session', () => {
  const stripeMock = {
    checkout: {
      sessions: {
        retrieve: jest.fn(),
        create: jest.fn(),
      },
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_PLATFORM_FEE_PERCENT = '10'
    ;(getStripe as jest.Mock).mockReturnValue(stripeMock)
    ;(reconcileOpportunityPlaces as jest.Mock).mockResolvedValue(null)
  })

  it('retourne 401 si le comédien n’est pas authentifié', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'auth error' },
        }),
      },
    })

    const response = await POST(createRequest({ opportuniteId: 'opp-1' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Non authentifie' })
  })

  it('retourne 403 si le compte comédien est supprimé', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: { id: 'comedien-1', compte_supprime: true }, error: null }),
          })),
        })),
      })),
    })

    const response = await POST(createRequest({ opportuniteId: 'opp-1' }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Compte supprimé' })
  })

  it('réutilise une session Stripe ouverte déjà en attente', async () => {
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      status: 'open',
      url: 'https://stripe.test/session-open',
    })

    const achatCancelEq = jest.fn().mockReturnThis()
    const achatUpdateEq = jest.fn(() => ({ eq: achatCancelEq }))

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
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
                    titre: 'Formation',
                    prix_reduit: 25,
                    prix_base: 50,
                    places_restantes: 2,
                    date_evenement: '2099-06-15T10:00:00.000Z',
                    statut: 'validee',
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
                  maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                })),
              })),
            })),
          }
        }

        if (table === 'annonceurs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'ann-1',
                    stripe_account_id: 'acct_1',
                    stripe_charges_enabled: true,
                    stripe_payouts_enabled: true,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }

        if (table === 'achats') {
          return {
            select: jest.fn((query: string) => {
              if (query === 'id') {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                      })),
                    })),
                  })),
                }
              }

              if (query === 'id, stripe_checkout_session_id, statut') {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        order: jest.fn(() => ({
                          limit: jest.fn().mockResolvedValue({
                            data: [
                              {
                                id: 'achat-pending',
                                stripe_checkout_session_id: 'cs_open',
                                statut: 'en_attente',
                              },
                            ],
                          }),
                        })),
                      })),
                    })),
                  })),
                }
              }

              throw new Error(`Unexpected achats query: ${query}`)
            }),
            update: jest.fn(() => ({
              eq: achatUpdateEq,
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await POST(createRequest({ opportuniteId: 'opp-1' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ url: 'https://stripe.test/session-open', achatId: 'achat-pending' })
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('retourne 409 quand il n’y a plus de places après réconciliation', async () => {
    ;(reconcileOpportunityPlaces as jest.Mock).mockResolvedValue({
      id: 'opp-1',
      nombre_places: 10,
      places_restantes: 0,
    })

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
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
                    titre: 'Formation',
                    prix_reduit: 25,
                    prix_base: 50,
                    places_restantes: 3,
                    date_evenement: '2099-06-15T10:00:00.000Z',
                    statut: 'validee',
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
                  maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                })),
              })),
            })),
          }
        }

        if (table === 'annonceurs_bloques') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                })),
              })),
            })),
          }
        }

        if (table === 'annonceurs_bloques') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                })),
              })),
            })),
          }
        }

        if (table === 'annonceurs_bloques') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                })),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await POST(createRequest({ opportuniteId: 'opp-1' }))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: 'Cette opportunite est complete' })
  })

  it('retourne 404 si l’annonceur de l’opportunité est bloqué', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
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
                    titre: 'Formation',
                    prix_reduit: 25,
                    prix_base: 50,
                    places_restantes: 3,
                    date_evenement: '2099-06-15T10:00:00.000Z',
                    statut: 'validee',
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
                  maybeSingle: jest.fn().mockResolvedValue({ data: { annonceur_id: 'ann-1' } }),
                })),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await POST(createRequest({ opportuniteId: 'opp-1' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Opportunite indisponible' })
  })

  it('retourne 404 si l’opportunité est supprimée', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
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
                    titre: 'Formation',
                    prix_reduit: 25,
                    prix_base: 50,
                    places_restantes: 3,
                    date_evenement: '2099-06-15T10:00:00.000Z',
                    statut: 'supprimee',
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
                  maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                })),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await POST(createRequest({ opportuniteId: 'opp-1' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Opportunite indisponible' })
  })

  it('crée une session Stripe avec commission et met à jour l’achat', async () => {
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: 'cs_new_1',
      url: 'https://stripe.test/new-session',
    })

    const achatUpdateFinalEq = jest.fn().mockResolvedValue({ error: null })
    const achatUpdateInitialSingle = jest.fn().mockResolvedValue({
      data: { id: 'achat-1' },
      error: null,
    })

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
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
                    titre: 'Masterclass',
                    prix_reduit: 25,
                    prix_base: 50,
                    places_restantes: 4,
                    date_evenement: '2099-06-15T10:00:00.000Z',
                    statut: 'validee',
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
                  maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                })),
              })),
            })),
          }
        }

        if (table === 'annonceurs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'ann-1',
                    stripe_account_id: 'acct_1',
                    stripe_charges_enabled: true,
                    stripe_payouts_enabled: true,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }

        if (table === 'achats') {
          return {
            select: jest.fn((query: string) => {
              if (query === 'id') {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                      })),
                    })),
                  })),
                }
              }

              if (query === 'id, stripe_checkout_session_id, statut') {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        order: jest.fn(() => ({
                          limit: jest.fn().mockResolvedValue({ data: [] }),
                        })),
                      })),
                    })),
                  })),
                }
              }

              if (query === 'id, statut') {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      in: jest.fn(() => ({
                        order: jest.fn(() => ({
                          limit: jest.fn(() => ({
                            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                          })),
                        })),
                      })),
                    })),
                  })),
                }
              }

              throw new Error(`Unexpected achats query: ${query}`)
            }),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: achatUpdateInitialSingle,
              })),
            })),
            update: jest.fn(() => ({
              eq: achatUpdateFinalEq,
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(supabase)

    const response = await POST(createRequest({ opportuniteId: 'opp-1' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      url: 'https://stripe.test/new-session',
      achatId: 'achat-1',
    })
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: 'achat-1',
        success_url: 'http://localhost:3000/dashboard?checkout=success&achat=achat-1',
        cancel_url: 'http://localhost:3000/dashboard/opportunites/opp-1?checkout=cancel',
        payment_intent_data: expect.objectContaining({
          application_fee_amount: 250,
          transfer_data: { destination: 'acct_1' },
        }),
      })
    )
  })
})
