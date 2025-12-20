import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComedianSignupForm } from '../comedian-signup-form'
import { createClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'

// Mock du module supabase-client
jest.mock('@/app/lib/supabase-client', () => ({
  createClient: jest.fn(),
}))

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('ComedianSignupForm', () => {
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
    storage: {
      from: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    // Mock window.location.origin
    delete (window as any).location
    window.location = { origin: 'http://localhost:3000' } as any
  })

  describe('Rendu du formulaire - Étape 1', () => {
    it('devrait afficher l\'étape 1 (Préférences) par défaut', () => {
      render(<ComedianSignupForm />)

      expect(screen.getByText('Inscription Comédien')).toBeInTheDocument()
      expect(screen.getByText(/Quels types d'opportunités voulez-vous recevoir/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Stages \/ Ateliers/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Écoles \/ Conservatoires/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Coachs indépendants/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Suivant/i })).toBeInTheDocument()
    })

    it('ne devrait pas avoir de bouton Précédent à l\'étape 1', () => {
      render(<ComedianSignupForm />)

      const previousButton = screen.getByRole('button', { name: /Précédent/i })
      expect(previousButton).toBeDisabled()
    })
  })

  describe('Validation - Étape 1', () => {
    it('devrait afficher une erreur si aucune préférence n\'est sélectionnée', async () => {
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      const nextButton = screen.getByRole('button', { name: /Suivant/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText(/Veuillez sélectionner au moins un type d'opportunité/i)).toBeInTheDocument()
      })
    })

    it('devrait passer à l\'étape 2 si au moins une préférence est sélectionnée', async () => {
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      const stagesCheckbox = screen.getByLabelText(/Stages \/ Ateliers/i)
      await user.click(stagesCheckbox)

      const nextButton = screen.getByRole('button', { name: /Suivant/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText(/Parlez-nous un peu de vous/i)).toBeInTheDocument()
      })
    })
  })

  describe('Navigation entre les étapes', () => {
    it('devrait permettre de revenir à l\'étape précédente', async () => {
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Sélectionner une préférence et passer à l'étape 2
      const stagesCheckbox = screen.getByLabelText(/Stages \/ Ateliers/i)
      await user.click(stagesCheckbox)

      const nextButton = screen.getByRole('button', { name: /Suivant/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText(/Parlez-nous un peu de vous/i)).toBeInTheDocument()
      })

      // Revenir à l'étape 1
      const previousButton = screen.getByRole('button', { name: /Précédent/i })
      await user.click(previousButton)

      await waitFor(() => {
        expect(screen.getByText(/Quels types d'opportunités voulez-vous recevoir/i)).toBeInTheDocument()
      })
    })

    it('devrait conserver les données lors de la navigation', async () => {
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Étape 1: Sélectionner des préférences
      const stagesCheckbox = screen.getByLabelText(/Stages \/ Ateliers/i) as HTMLInputElement
      await user.click(stagesCheckbox)
      expect(stagesCheckbox).toBeChecked()

      // Passer à l'étape 2
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      // Revenir à l'étape 1
      await user.click(screen.getByRole('button', { name: /Précédent/i }))

      // Vérifier que la préférence est toujours cochée
      const stagesCheckboxAfter = screen.getByLabelText(/Stages \/ Ateliers/i) as HTMLInputElement
      expect(stagesCheckboxAfter).toBeChecked()
    })
  })

  describe('Validation - Étape 2', () => {
    beforeEach(async () => {
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Passer à l'étape 2
      const stagesCheckbox = screen.getByLabelText(/Stages \/ Ateliers/i)
      await user.click(stagesCheckbox)
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => {
        expect(screen.getByText(/Parlez-nous un peu de vous/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher une erreur si le nom est vide', async () => {
      const user = userEvent.setup()

      const nextButton = screen.getByRole('button', { name: /Suivant/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText(/Le nom est obligatoire/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher une erreur si le prénom est vide', async () => {
      const user = userEvent.setup()

      const lastNameInput = screen.getByLabelText(/Nom/i)
      await user.type(lastNameInput, 'Dupont')

      const nextButton = screen.getByRole('button', { name: /Suivant/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText(/Le prénom est obligatoire/i)).toBeInTheDocument()
      })
    })

    it('devrait passer à l\'étape 3 avec des informations valides', async () => {
      const user = userEvent.setup()

      const lastNameInput = screen.getByLabelText(/Nom/i)
      const firstNameInput = screen.getByLabelText(/Prénom/i)

      await user.type(lastNameInput, 'Dupont')
      await user.type(firstNameInput, 'Jean')

      const nextButton = screen.getByRole('button', { name: /Suivant/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText(/Dernière étape/i)).toBeInTheDocument()
      })
    })
  })

  describe('Validation - Étape 3', () => {
    beforeEach(async () => {
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Passer à l'étape 2
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      // Passer à l'étape 3
      await waitFor(() => {
        expect(screen.getByLabelText(/Nom/i)).toBeInTheDocument()
      })
      await user.type(screen.getByLabelText(/Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/Prénom/i), 'Jean')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => {
        expect(screen.getByText(/Dernière étape/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher une erreur si l\'email est vide', async () => {
      const user = userEvent.setup()

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/L'adresse e-mail est obligatoire/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher une erreur si l\'email est invalide', async () => {
      const user = userEvent.setup()

      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Veuillez entrer une adresse e-mail valide/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher une erreur si le mot de passe est trop court', async () => {
      const user = userEvent.setup()

      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), '12345')

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Le mot de passe doit contenir au moins 8 caractères/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher une erreur si les mots de passe ne correspondent pas', async () => {
      const user = userEvent.setup()

      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password456')

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Les mots de passe ne correspondent pas/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher une erreur si les CGU ne sont pas acceptées', async () => {
      const user = userEvent.setup()

      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123')

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Vous devez accepter les conditions générales/i)).toBeInTheDocument()
      })
    })
  })

  describe('Soumission du formulaire', () => {
    it('devrait créer un compte avec succès', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
      }

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{ id: 1, auth_user_id: 'test-user-id' }],
            error: null,
          }),
        }),
      })

      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Étape 1
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      // Étape 2
      await waitFor(() => {
        expect(screen.getByLabelText(/Nom/i)).toBeInTheDocument()
      })
      await user.type(screen.getByLabelText(/Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/Prénom/i), 'Jean')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      // Étape 3
      await waitFor(() => {
        expect(screen.getByLabelText(/Adresse e-mail/i)).toBeInTheDocument()
      })
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/callback',
          },
        })
      })

      await waitFor(() => {
        expect(screen.getByText(/Compte créé avec succès/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher une erreur en cas d\'échec de création de compte', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      })

      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Naviguer jusqu'à l'étape 3 et remplir le formulaire
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Nom/i))
      await user.type(screen.getByLabelText(/Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/Prénom/i), 'Jean')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Erreur d'inscription: User already registered/i)).toBeInTheDocument()
      })
    })

    it('devrait afficher un loader pendant la soumission', async () => {
      mockSupabase.auth.signUp.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { user: null }, error: null }), 100))
      )

      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Naviguer jusqu'à l'étape 3 et remplir le formulaire
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Nom/i))
      await user.type(screen.getByLabelText(/Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/Prénom/i), 'Jean')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      expect(screen.getByText(/Création en cours/i)).toBeInTheDocument()
    })
  })

  describe('Gestion des préférences multiples', () => {
    it('devrait permettre de sélectionner plusieurs préférences', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
      }

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 1, auth_user_id: 'test-user-id' }],
          error: null,
        }),
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Sélectionner plusieurs préférences
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByLabelText(/Coachs indépendants/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Nom/i))
      await user.type(screen.getByLabelText(/Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/Prénom/i), 'Jean')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      await user.click(screen.getByRole('button', { name: /Créer mon compte/i }))

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            preferences_opportunites: expect.arrayContaining(['stages_ateliers', 'coachs_independants']),
          })
        )
      })
    })
  })
})
