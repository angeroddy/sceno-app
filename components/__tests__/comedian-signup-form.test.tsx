import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComedianSignupForm } from '../comedian-signup-form'
import { createBrowserSupabaseClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'

// Mock du module supabase-client
jest.mock('@/app/lib/supabase-client', () => ({
  createBrowserSupabaseClient: jest.fn(),
}))

jest.mock('@/components/ui/stepper', () => ({
  Stepper: () => <div data-testid="stepper" />,
}))

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props: any) => (
    <input
      type="checkbox"
      id={props.id}
      checked={props.checked}
      onChange={(e) => props.onCheckedChange?.(e.target.checked)}
      required={props.required}
    />
  ),
}))

jest.mock('react-easy-crop', () => ({
  __esModule: true,
  default: () => <div data-testid="photo-cropper" />,
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

  const createProfileSelectChain = (data: unknown = null) => ({
    eq: jest.fn().mockReturnValue({
      maybeSingle: jest.fn().mockResolvedValue({
        data,
        error: null,
      }),
    }),
  })

  const createComedianFromMock = (insertMock?: jest.Mock) =>
    jest.fn((table: string) => {
      if (table === 'comediens') {
        return {
          select: jest.fn().mockReturnValue(createProfileSelectChain()),
          insert: insertMock ?? jest.fn(),
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
    mockSupabase.from.mockImplementation(createComedianFromMock())

    // window.location.origin is set in jest.setup.ts
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

    it("n'affiche pas d'erreur au simple changement de focus", async () => {
      const user = userEvent.setup()

      const lastNameInput = screen.getByLabelText(/^Nom/i)
      await user.click(lastNameInput)
      await user.tab()

      expect(screen.queryByText(/Le nom est obligatoire/i)).not.toBeInTheDocument()
    })

    it('devrait afficher une erreur si le nom est vide', async () => {
      const user = userEvent.setup()

      const nextButton = screen.getByRole('button', { name: /Suivant/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getAllByText(/Le nom est obligatoire/i).length).toBeGreaterThan(0)
      })
    })

    it('devrait afficher une erreur si le prénom est vide', async () => {
      const user = userEvent.setup()

      const lastNameInput = screen.getByLabelText(/^Nom/i)
      await user.type(lastNameInput, 'Dupont')

      const nextButton = screen.getByRole('button', { name: /Suivant/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getAllByText(/Le prénom est obligatoire/i).length).toBeGreaterThan(0)
      })
    })

    it('devrait passer à l\'étape 3 avec des informations valides', async () => {
      const user = userEvent.setup()

      const lastNameInput = screen.getByLabelText(/^Nom/i)
      const firstNameInput = screen.getByLabelText(/^Prénom/i)
      const birthDateInput = screen.getByLabelText(/Date de naissance/i)

      await user.type(lastNameInput, 'Dupont')
      await user.type(firstNameInput, 'Jean')
      await user.type(birthDateInput, '1990-01-15')
      await user.selectOptions(screen.getByLabelText(/Genre/i), 'masculin')

      const nextButton = screen.getByRole('button', { name: /Suivant/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText(/Dernière étape/i)).toBeInTheDocument()
      })
    })

    it("ouvre le recadreur quand une photo est sélectionnée", async () => {
      const OriginalFileReader = global.FileReader

      class MockFileReader {
        result = 'data:image/png;base64,avatar'
        onloadend: null | (() => void) = null

        readAsDataURL() {
          this.onloadend?.()
        }
      }

      ;(global as any).FileReader = MockFileReader

      try {
        const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
        const photoInput = screen.getByLabelText(/Photo portrait/i)

        fireEvent.change(photoInput, { target: { files: [file] } })

        await waitFor(() => {
          expect(screen.getByText(/Recadrer la photo/i)).toBeInTheDocument()
        })

        expect(screen.getByTestId('photo-cropper')).toBeInTheDocument()
      } finally {
        ;(global as any).FileReader = OriginalFileReader
      }
    })
  })

  describe('Validation - Étape 3', () => {
    async function navigateToStep3() {
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Passer à l'étape 2
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      // Passer à l'étape 3
      await waitFor(() => {
        expect(screen.getByLabelText(/^Nom/i)).toBeInTheDocument()
      })
      await user.type(screen.getByLabelText(/^Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/^Prénom/i), 'Jean')
      await user.type(screen.getByLabelText(/Date de naissance/i), '1990-01-15')
      await user.selectOptions(screen.getByLabelText(/Genre/i), 'masculin')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => {
        expect(screen.getByText(/Dernière étape/i)).toBeInTheDocument()
      })

      return user
    }

    it('devrait afficher une erreur si l\'email est vide', async () => {
      const user = await navigateToStep3()

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getAllByText(/L'adresse e-mail est obligatoire/i).length).toBeGreaterThan(0)
      })
    })

    it('devrait afficher une erreur si l\'email est invalide', async () => {
      const user = await navigateToStep3()

      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getAllByText(/Veuillez entrer une adresse e-mail valide/i).length).toBeGreaterThan(0)
      })
    })

    it('devrait afficher une erreur si le mot de passe est trop court', async () => {
      const user = await navigateToStep3()

      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), '12345')

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getAllByText(/Le mot de passe doit contenir au moins 8 caractères, avec au moins une lettre et un chiffre/i).length).toBeGreaterThan(0)
      })
    })

    it('devrait afficher une erreur si les mots de passe ne correspondent pas', async () => {
      const user = await navigateToStep3()

      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'Password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password456')

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getAllByText(/Les mots de passe ne correspondent pas/i).length).toBeGreaterThan(0)
      })
    })

    it('devrait afficher une erreur si les CGU ne sont pas acceptées', async () => {
      const user = await navigateToStep3()

      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'Password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'Password123')

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('accept-terms-card')).toHaveClass('border-red-500')
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

      mockSupabase.from.mockImplementation(
        createComedianFromMock(
          jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ id: 1, auth_user_id: 'test-user-id' }],
              error: null,
            }),
          })
        )
      )

      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Étape 1
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      // Étape 2
      await waitFor(() => {
        expect(screen.getByLabelText(/^Nom/i)).toBeInTheDocument()
      })
      await user.type(screen.getByLabelText(/^Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/^Prénom/i), 'Jean')
      await user.type(screen.getByLabelText(/Date de naissance/i), '1990-01-15')
      await user.selectOptions(screen.getByLabelText(/Genre/i), 'masculin')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      // Étape 3
      await waitFor(() => {
        expect(screen.getByLabelText(/Adresse e-mail/i)).toBeInTheDocument()
      })
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'Password1234!')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'Password1234!')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      expect(screen.getByText(/Votre mot de passe doit inclure/i)).toBeInTheDocument()
      expect(screen.getByText(/Au moins 8 caractères/i)).toBeInTheDocument()
      expect(screen.getByText(/Au moins une lettre/i)).toBeInTheDocument()
      expect(screen.getByText(/Au moins un chiffre/i)).toBeInTheDocument()

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password1234!',
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              genre: 'masculin',
            },
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

      await waitFor(() => screen.getByLabelText(/^Nom/i))
      await user.type(screen.getByLabelText(/^Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/^Prénom/i), 'Jean')
      await user.type(screen.getByLabelText(/Date de naissance/i), '1990-01-15')
      await user.selectOptions(screen.getByLabelText(/Genre/i), 'masculin')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'Password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'Password123')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Un compte existe déjà avec cet email/i)).toBeInTheDocument()
      })
    })

    it("devrait bloquer l'inscription comédien si l'e-mail existe déjà sur un compte annonceur", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comediens') {
          return {
            select: jest.fn().mockReturnValue(createProfileSelectChain()),
            insert: jest.fn(),
          }
        }

        if (table === 'annonceurs') {
          return {
            select: jest.fn().mockReturnValue(createProfileSelectChain({ id: 'annonceur-1' })),
            insert: jest.fn(),
          }
        }

        return {
          select: jest.fn().mockReturnValue(createProfileSelectChain()),
          insert: jest.fn(),
        }
      })

      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/^Nom/i))
      await user.type(screen.getByLabelText(/^Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/^Prénom/i), 'Jean')
      await user.type(screen.getByLabelText(/Date de naissance/i), '1990-01-15')
      await user.selectOptions(screen.getByLabelText(/Genre/i), 'masculin')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'annonceur@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'Password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'Password123')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))
      await user.click(screen.getByRole('button', { name: /Créer mon compte/i }))

      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
      await waitFor(() => {
        expect(screen.getByText(/Un compte annonceur existe déjà avec cet email/i)).toBeInTheDocument()
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

      await waitFor(() => screen.getByLabelText(/^Nom/i))
      await user.type(screen.getByLabelText(/^Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/^Prénom/i), 'Jean')
      await user.type(screen.getByLabelText(/Date de naissance/i), '1990-01-15')
      await user.selectOptions(screen.getByLabelText(/Genre/i), 'masculin')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'Password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'Password123')
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

      mockSupabase.from.mockImplementation(createComedianFromMock(mockInsert))

      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Sélectionner plusieurs préférences
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByLabelText(/Coachs indépendants/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/^Nom/i))
      await user.type(screen.getByLabelText(/^Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/^Prénom/i), 'Jean')
      await user.type(screen.getByLabelText(/Date de naissance/i), '1990-01-15')
      await user.selectOptions(screen.getByLabelText(/Genre/i), 'masculin')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'Password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'Password123')
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
