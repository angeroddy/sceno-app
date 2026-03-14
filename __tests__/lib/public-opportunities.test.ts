import { getPublicOpportunityDetails } from '@/app/lib/public-opportunities'
import { reconcileOpportunityPlaces } from '@/app/lib/opportunity-availability'

jest.mock('@/app/lib/opportunity-availability', () => ({
  reconcileOpportunityPlaces: jest.fn(),
}))

describe('getPublicOpportunityDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(reconcileOpportunityPlaces as jest.Mock).mockResolvedValue(null)
  })

  it('retourne null si l opportunite n est pas publiable', async () => {
    const maybeSingleMock = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    })
    const inMock = jest.fn(() => ({ maybeSingle: maybeSingleMock }))
    const eqMock = jest.fn(() => ({ in: inMock }))
    const selectMock = jest.fn(() => ({ eq: eqMock }))
    const supabase = {
      from: jest.fn(() => ({ select: selectMock })),
    }

    await expect(getPublicOpportunityDetails(supabase as never, 'opp-404')).resolves.toBeNull()
    expect(inMock).toHaveBeenCalledWith('statut', ['validee', 'complete'])
  })

  it('retourne l opportunite publique avec les places reconcilees', async () => {
    ;(reconcileOpportunityPlaces as jest.Mock).mockResolvedValue({
      id: 'opp-1',
      nombre_places: 10,
      places_restantes: 3,
    })

    const maybeSingleMock = jest.fn().mockResolvedValue({
      data: {
        id: 'opp-1',
        annonceur_id: 'ann-1',
        type: 'stages_ateliers',
        modele: 'pre_vente',
        titre: 'Atelier camera',
        resume: '<p>Contenu</p>',
        image_url: null,
        lien_infos: null,
        prix_base: 100,
        prix_reduit: 70,
        reduction_pourcentage: 30,
        nombre_places: 10,
        places_restantes: 8,
        date_evenement: '2026-05-01T18:00:00.000Z',
        contact_telephone: null,
        contact_email: 'contact@example.com',
        statut: 'validee',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
        annonceur: {
          nom_formation: 'Studio Test',
          email: 'studio@example.com',
        },
      },
      error: null,
    })
    const inMock = jest.fn(() => ({ maybeSingle: maybeSingleMock }))
    const eqMock = jest.fn(() => ({ in: inMock }))
    const selectMock = jest.fn(() => ({ eq: eqMock }))
    const supabase = {
      from: jest.fn(() => ({ select: selectMock })),
    }

    const result = await getPublicOpportunityDetails(supabase as never, 'opp-1')

    expect(result).not.toBeNull()
    expect(result?.places_restantes).toBe(3)
    expect(reconcileOpportunityPlaces).toHaveBeenCalledWith(supabase, 'opp-1')
  })
})
