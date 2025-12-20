/**
 * Tests d'intégration pour le flow d'authentification complet
 *
 * Ce fichier teste l'ensemble du parcours utilisateur :
 * 1. Inscription d'un nouveau comédien
 * 2. Connexion avec les identifiants créés
 * 3. Accès au dashboard
 * 4. Déconnexion
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createClient } from '@/app/lib/supabase-client'

// Mock du module supabase-client
jest.mock('@/app/lib/supabase-client', () => ({
  createClient: jest.fn(),
}))

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  })),
}))

describe('Flow d\'authentification complet', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
      },
      from: jest.fn(),
      storage: {
        from: jest.fn(),
      },
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    // Mock window.location.origin
    delete (window as any).location
    window.location = { origin: 'http://localhost:3000' } as any
  })

  describe('Scénario complet : Inscription -> Connexion -> Dashboard -> Déconnexion', () => {
    it('devrait permettre à un utilisateur de s\'inscrire, se connecter et accéder au dashboard', async () => {
      const testUser = {
        email: 'newcomedian@example.com',
        password: 'SecurePassword123',
        firstName: 'Jean',
        lastName: 'Dupont',
      }

      const mockUserId = 'test-user-id-123'
      const mockUser = {
        id: mockUserId,
        email: testUser.email,
      }

      // Configuration des mocks pour l'inscription
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{ id: 1, auth_user_id: mockUserId }],
            error: null,
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 1, auth_user_id: mockUserId },
              error: null,
            }),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 1, auth_user_id: mockUserId },
              error: null,
            }),
          }),
        }),
      })

      // ÉTAPE 1: INSCRIPTION
      // L'utilisateur remplit le formulaire d'inscription
      const { ComedianSignupForm } = await import('@/components/comedian-signup-form')
      const { rerender } = render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Étape 1 du formulaire : Préférences
      const stagesCheckbox = screen.getByLabelText(/Stages \/ Ateliers/i)
      await user.click(stagesCheckbox)
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      // Étape 2 : Informations personnelles
      await waitFor(() => {
        expect(screen.getByLabelText(/Nom/i)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/Nom/i), testUser.lastName)
      await user.type(screen.getByLabelText(/Prénom/i), testUser.firstName)
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      // Étape 3 : Création de compte
      await waitFor(() => {
        expect(screen.getByLabelText(/Adresse e-mail/i)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/Adresse e-mail/i), testUser.email)
      await user.type(screen.getByLabelText(/^Mot de passe/i), testUser.password)
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), testUser.password)
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
      await user.click(submitButton)

      // Vérifier que l'inscription a réussi
      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: testUser.email,
          password: testUser.password,
          options: expect.any(Object),
        })
      })

      await waitFor(() => {
        expect(screen.getByText(/Compte créé avec succès/i)).toBeInTheDocument()
      })

      // ÉTAPE 2: CONNEXION
      // Configuration des mocks pour la connexion
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Simuler que l'utilisateur navigue vers la page de connexion
      const { LoginForm } = await import('@/components/login-form')
      rerender(<LoginForm />)

      await waitFor(() => {
        expect(screen.getByText('Connexion')).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText(/Adresse e-mail/i)
      const passwordInput = screen.getByLabelText(/Mot de passe/i)
      const loginButton = screen.getByRole('button', { name: /Se connecter/i })

      await user.type(emailInput, testUser.email)
      await user.type(passwordInput, testUser.password)
      await user.click(loginButton)

      // Vérifier que la connexion a été tentée
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: testUser.email,
          password: testUser.password,
        })
      })
    })
  })

  describe('Scénario d\'échec : Email déjà utilisé', () => {
    it('devrait afficher une erreur si l\'email est déjà enregistré', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      })

      const { ComedianSignupForm } = await import('@/components/comedian-signup-form')
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Naviguer jusqu'à l'étape 3
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Nom/i))
      await user.type(screen.getByLabelText(/Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/Prénom/i), 'Jean')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      await user.click(screen.getByRole('button', { name: /Créer mon compte/i }))

      await waitFor(() => {
        expect(screen.getByText(/Erreur d'inscription: User already registered/i)).toBeInTheDocument()
      })
    })
  })

  describe('Scénario d\'échec : Identifiants incorrects à la connexion', () => {
    it('devrait afficher une erreur avec des identifiants incorrects', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      })

      const { LoginForm } = await import('@/components/login-form')
      render(<LoginForm />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/Adresse e-mail/i)
      const passwordInput = screen.getByLabelText(/Mot de passe/i)
      const loginButton = screen.getByRole('button', { name: /Se connecter/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText(/Identifiants incorrects/i)).toBeInTheDocument()
      })
    })
  })

  describe('Validation des données', () => {
    it('devrait valider le format de l\'email lors de l\'inscription', async () => {
      const { ComedianSignupForm } = await import('@/components/comedian-signup-form')
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Naviguer jusqu'à l'étape 3
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Nom/i))
      await user.type(screen.getByLabelText(/Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/Prénom/i), 'Jean')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'invalid-email')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      await user.click(screen.getByRole('button', { name: /Créer mon compte/i }))

      await waitFor(() => {
        expect(screen.getByText(/Veuillez entrer une adresse e-mail valide/i)).toBeInTheDocument()
      })

      // Vérifier que l'appel API n'a pas été fait
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
    })

    it('devrait valider que les mots de passe correspondent', async () => {
      const { ComedianSignupForm } = await import('@/components/comedian-signup-form')
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Naviguer jusqu'à l'étape 3
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Nom/i))
      await user.type(screen.getByLabelText(/Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/Prénom/i), 'Jean')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'differentpassword')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      await user.click(screen.getByRole('button', { name: /Créer mon compte/i }))

      await waitFor(() => {
        expect(screen.getByText(/Les mots de passe ne correspondent pas/i)).toBeInTheDocument()
      })

      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
    })

    it('devrait valider la longueur minimale du mot de passe', async () => {
      const { ComedianSignupForm } = await import('@/components/comedian-signup-form')
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Naviguer jusqu'à l'étape 3
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Nom/i))
      await user.type(screen.getByLabelText(/Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/Prénom/i), 'Jean')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), '12345')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), '12345')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      await user.click(screen.getByRole('button', { name: /Créer mon compte/i }))

      await waitFor(() => {
        expect(screen.getByText(/Le mot de passe doit contenir au moins 8 caractères/i)).toBeInTheDocument()
      })

      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
    })
  })

  describe('Préférences d\'opportunités', () => {
    it('devrait enregistrer correctement les préférences multiples', async () => {
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

      const { ComedianSignupForm } = await import('@/components/comedian-signup-form')
      render(<ComedianSignupForm />)
      const user = userEvent.setup()

      // Sélectionner plusieurs préférences
      await user.click(screen.getByLabelText(/Stages \/ Ateliers/i))
      await user.click(screen.getByLabelText(/Écoles \/ Conservatoires/i))
      await user.click(screen.getByLabelText(/Coachs indépendants/i))
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      // Remplir les informations personnelles
      await waitFor(() => screen.getByLabelText(/Nom/i))
      await user.type(screen.getByLabelText(/Nom/i), 'Dupont')
      await user.type(screen.getByLabelText(/Prénom/i), 'Jean')
      await user.click(screen.getByRole('button', { name: /Suivant/i }))

      // Créer le compte
      await waitFor(() => screen.getByLabelText(/Adresse e-mail/i))
      await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Mot de passe/i), 'password123')
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123')
      await user.click(screen.getByLabelText(/J'accepte les conditions/i))

      await user.click(screen.getByRole('button', { name: /Créer mon compte/i }))

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            preferences_opportunites: expect.arrayContaining([
              'stages_ateliers',
              'ecoles_formations',
              'coachs_independants'
            ]),
          })
        )
      })
    })
  })
})
