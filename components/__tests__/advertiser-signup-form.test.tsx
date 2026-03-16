import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdvertiserSignupForm } from '../advertiser-signup-form'
import { createBrowserSupabaseClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'

jest.mock('@/app/lib/supabase-client', () => ({
  createBrowserSupabaseClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('AdvertiserSignupForm', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }

  const mockSupabase = {
    auth: {
      signUp: jest.fn(),
    },
    from: jest.fn(),
  }

  const createProfileSelectChain = (data: unknown = null) => ({
    eq: jest.fn().mockReturnValue({
      maybeSingle: jest.fn().mockResolvedValue({
        data,
        error: null,
      }),
    }),
  })

  const createAdvertiserFromMock = (insertMock?: jest.Mock) =>
    jest.fn((table: string) => {
      if (table === 'annonceurs') {
        return {
          select: jest.fn().mockReturnValue(createProfileSelectChain()),
          insert: insertMock ?? jest.fn().mockResolvedValue({ error: null }),
        }
      }

      return {
        select: jest.fn().mockReturnValue(createProfileSelectChain()),
        insert: jest.fn(),
      }
    })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(createBrowserSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)
    mockSupabase.from.mockImplementation(createAdvertiserFromMock())
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    // window.location.origin is set in jest.setup.ts
  })

  it("empêche de passer à l'étape 2 tant qu'aucun type de compte n'est sélectionné", async () => {
    render(<AdvertiserSignupForm />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Suivant/i }))

    expect(screen.getByText(/Quel type de compte souhaitez-vous créer/i)).toBeInTheDocument()
    expect(screen.queryByText(/Vos informations personnelles/i)).not.toBeInTheDocument()
  })

  it("passe à l'étape 2 personne physique après sélection", async () => {
    render(<AdvertiserSignupForm />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Personne physique/i }))
    await user.click(screen.getByRole('button', { name: /Suivant/i }))

    await waitFor(() => {
      expect(screen.getByText(/Vos informations personnelles/i)).toBeInTheDocument()
    })
  })

  it("empêche de passer à l'étape 3 tant que les champs personne physique sont incomplets", async () => {
    render(<AdvertiserSignupForm />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Personne physique/i }))
    await user.click(screen.getByRole('button', { name: /Suivant/i }))

    await user.click(screen.getByRole('button', { name: /Suivant/i }))

    expect(screen.getByText(/Vos informations personnelles/i)).toBeInTheDocument()
    expect(screen.queryByText(/Compte et informations bancaires/i)).not.toBeInTheDocument()
  })

  const getLabel = (label: string) => {
    // Utiliser une regex pour trouver exactement le label suivi d'une étoile rouge (champ obligatoire)
    const regex = new RegExp(`^${label}\\s*\\*?$`)
    return screen.getByLabelText(regex)
  }

  it("empêche la création du compte tant que l'étape 3 est incomplète", async () => {
    render(<AdvertiserSignupForm />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Personne physique/i }))
    await user.click(screen.getByRole('button', { name: /Suivant/i }))

    await user.type(getLabel('Nom'), 'Dupont')
    await user.type(getLabel('Prénom'), 'Jean')
    await user.type(screen.getByLabelText(/Date de naissance/i), '1990-01-15')
    await user.type(screen.getByLabelText(/^Adresse/i), '10 rue de Paris')
    await user.type(screen.getByLabelText(/Code postal/i), '75001')
    await user.type(screen.getByLabelText(/^Ville/i), 'Paris')
    await user.type(screen.getByLabelText(/Numéro de téléphone/i), '+33612345678')

    await user.click(screen.getByRole('button', { name: /Suivant/i }))

    await waitFor(() => {
      expect(screen.getByText(/Compte et informations bancaires/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Créer mon compte/i }))

    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
    expect(screen.getByText(/Compte et informations bancaires/i)).toBeInTheDocument()
  })

  it('soumet et crée un annonceur personne physique avec succès', async () => {
    const mockUser = { id: 'user-1', email: 'pp@example.com' }

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const insert = jest.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockImplementation(createAdvertiserFromMock(insert))

    render(<AdvertiserSignupForm />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Personne physique/i }))
    await user.click(screen.getByRole('button', { name: /Suivant/i }))

    await user.type(getLabel('Nom'), 'Dupont')
    await user.type(getLabel('Prénom'), 'Jean')
    await user.type(screen.getByLabelText(/Date de naissance/i), '1990-01-15')
    await user.type(screen.getByLabelText(/^Adresse/i), '10 rue de Paris')
    await user.type(screen.getByLabelText(/Code postal/i), '75001')
    await user.type(screen.getByLabelText(/^Ville/i), 'Paris')
    await user.type(screen.getByLabelText(/Numéro de téléphone/i), '+33612345678')

    await user.click(screen.getByRole('button', { name: /Suivant/i }))

    await user.type(screen.getByLabelText(/Adresse e-mail/i), 'pp@example.com')
    await user.type(screen.getByLabelText(/Mot de passe/i), 'Password123')
    await user.type(screen.getByLabelText(/Nom du titulaire du compte/i), 'Jean Dupont')
    await user.type(screen.getByLabelText(/IBAN/i), 'FR7630006000011234567890189')
    await user.type(screen.getByLabelText(/BIC/i), 'BNPAFRPP')

    expect(screen.getByText(/Votre mot de passe doit inclure/i)).toBeInTheDocument()
    expect(screen.getByText(/Au moins 8 caractères/i)).toBeInTheDocument()
    expect(screen.getByText(/Au moins une lettre/i)).toBeInTheDocument()
    expect(screen.getByText(/Au moins un chiffre/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Créer mon compte/i }))

    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'pp@example.com',
        password: 'Password123',
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
    })

    await waitFor(() => {
      expect(insert).toHaveBeenCalled()
    })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        telephone: '+33612345678',
      })
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/stripe/connect/account', { method: 'POST' })
    })

    await waitFor(() => {
      expect(screen.getByText(/Inscription réussie/i)).toBeInTheDocument()
    })
  })
})
