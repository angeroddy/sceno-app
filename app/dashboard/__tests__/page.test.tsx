import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardPage from '../page'

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

jest.mock('next/image', () => (props: any) => {
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt || 'image'} />
})

jest.mock('next/link', () => {
  return ({ href, children }: any) => <a href={href}>{children}</a>
})

describe('DashboardPage', () => {
  beforeEach(() => {
    ;(global as any).fetch = jest.fn().mockImplementation((input: string) => {
      if (input.includes('/api/comedien/achats')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            achats: [],
          }),
        })
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          opportunites: [],
          preferences: [],
        }),
      })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('affiche un banner si les préférences ne sont pas configurées', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/Configurez vos préférences/i)).toBeInTheDocument()
    })
  })

  it("affiche le téléphone de contact et un lien vers l'annonce dans Mes Places", async () => {
    ;(global as any).fetch = jest.fn().mockImplementation((input: string) => {
      if (input.includes('/api/comedien/achats')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            achats: [
              {
                id: 'achat-1',
                prix_paye: 40,
                created_at: '2026-03-20T10:15:00.000Z',
                statut: 'confirmee',
                opportunite: {
                  id: 'opp-1',
                  titre: 'Stage caméra',
                  image_url: null,
                  date_evenement: '2026-03-30T18:00:00.000Z',
                  contact_email: 'contact@organisme.fr',
                  contact_telephone: '+33123456789',
                  annonceur: {
                    nom_formation: 'Organisme Test',
                  },
                },
              },
            ],
          }),
        })
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          opportunites: [],
          preferences: ['stages_ateliers'],
        }),
      })
    })

    render(<DashboardPage />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('tab', { name: /Mes Places/i }))

    await waitFor(() => {
      expect(screen.getByText('+33123456789')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /Voir l'annonce/i })).toHaveAttribute(
      'href',
      '/dashboard/opportunites/opp-1'
    )
  })

  it("affiche les statuts expirée, complet et annonce supprimée sur les cards comédien", async () => {
    ;(global as any).fetch = jest.fn().mockImplementation((input: string) => {
      if (input.includes('/api/comedien/achats')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            achats: [],
          }),
        })
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          opportunites: [
            {
              id: 'opp-exp',
              annonceur_id: 'ann-1',
              type: 'stages_ateliers',
              modele: 'derniere_minute',
              titre: 'Stage expiré',
              prix_base: 50,
              prix_reduit: 40,
              reduction_pourcentage: 20,
              places_restantes: 2,
              image_url: null,
              lien_infos: null,
              contact_email: 'contact@orga.fr',
              date_evenement: '2026-03-10T18:00:00.000Z',
              statut: 'expiree',
              annonceur: { nom_formation: 'Org A' },
            },
            {
              id: 'opp-comp',
              annonceur_id: 'ann-2',
              type: 'stages_ateliers',
              modele: 'pre_vente',
              titre: 'Stage complet',
              prix_base: 80,
              prix_reduit: 60,
              reduction_pourcentage: 25,
              places_restantes: 0,
              image_url: null,
              lien_infos: null,
              contact_email: 'contact@orga.fr',
              date_evenement: '2026-04-10T18:00:00.000Z',
              statut: 'complete',
              annonceur: { nom_formation: 'Org B' },
            },
            {
              id: 'opp-del',
              annonceur_id: 'ann-3',
              type: 'stages_ateliers',
              modele: 'pre_vente',
              titre: 'Stage supprimé',
              prix_base: 90,
              prix_reduit: 70,
              reduction_pourcentage: 22,
              places_restantes: 4,
              image_url: null,
              lien_infos: null,
              contact_email: 'contact@orga.fr',
              date_evenement: '2026-04-18T18:00:00.000Z',
              statut: 'supprimee',
              annonceur: { nom_formation: 'Org C' },
            },
          ],
          preferences: ['stages_ateliers'],
        }),
      })
    })

    render(<DashboardPage />)

    expect(await screen.findAllByText('Expirée')).not.toHaveLength(0)
    expect(screen.getAllByText('Complet').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Annonce supprimée').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Non consultable' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Expirée$/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Complet$/i })).toBeDisabled()
  })
})
