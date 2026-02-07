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

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(createBrowserSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)

    // window.location.origin is set in jest.setup.ts
  })

  it("affiche une erreur si le type de compte n'est pas sélectionné", async () => {
    render(<AdvertiserSignupForm />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Suivant/i }))

    await waitFor(() => {
      expect(screen.getByText(/Veuillez sélectionner un type de compte/i)).toBeInTheDocument()
    })
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

  it('valide les champs obligatoires personne physique (étape 2)', async () => {
    render(<AdvertiserSignupForm />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Personne physique/i }))
    await user.click(screen.getByRole('button', { name: /Suivant/i }))

    await user.click(screen.getByRole('button', { name: /Suivant/i }))

    await waitFor(() => {
      expect(screen.getByText(/Le nom est obligatoire/i)).toBeInTheDocument()
    })
  })

  const getLabel = (label: string) => {
    // Utiliser une regex pour trouver exactement le label suivi d'une étoile rouge (champ obligatoire)
    const regex = new RegExp(`^${label}\\s*\\*?$`)
    return screen.getByLabelText(regex)
  }

  it('valide l\'étape 3 (email, password, iban, bic)', async () => {
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

    await waitFor(() => {
      expect(screen.getByText(/L'adresse e-mail est obligatoire/i)).toBeInTheDocument()
    })
  })

  it('soumet et crée un annonceur personne physique avec succès', async () => {
    const mockUser = { id: 'user-1', email: 'pp@example.com' }

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const insert = jest.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValue({ insert })

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
    await user.type(screen.getByLabelText(/IBAN/i), 'FR7612345678901234567890123')
    await user.type(screen.getByLabelText(/BIC/i), 'BNPAFRPP')

    await user.click(screen.getByRole('button', { name: /Créer mon compte/i }))

    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'pp@example.com',
        password: 'Password123',
        options: { emailRedirectTo: 'http://localhost:3000/auth/callback' },
      })
    })

    await waitFor(() => {
      expect(insert).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText(/Inscription réussie/i)).toBeInTheDocument()
    })
  })
})
