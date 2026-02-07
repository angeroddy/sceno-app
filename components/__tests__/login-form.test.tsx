import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../login-form'
import { createBrowserSupabaseClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'

// Mock du module supabase-client
jest.mock('@/app/lib/supabase-client', () => ({
  createBrowserSupabaseClient: jest.fn(),
}))

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('LoginForm', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }

  const mockSupabase = {
    auth: {
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(createBrowserSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('Rendu du formulaire', () => {
    it('devrait afficher tous les champs du formulaire', () => {
      render(<LoginForm />)

      expect(screen.getByText('Connexion')).toBeInTheDocument()
      expect(screen.getByLabelText(/Adresse e-mail/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Mot de passe/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Se connecter/i })).toBeInTheDocument()
      expect(screen.getByText(/Pas encore de compte/i)).toBeInTheDocument()
      expect(screen.getByText(/Mot de passe oublié/i)).toBeInTheDocument()
    })
  })

  describe('Validation du formulaire', () => {
    it('devrait afficher une erreur si l\'email est vide', async () => {
      render(<LoginForm />)
      const user = userEvent.setup()

      const submitButton = screen.getByRole('button', { name: /Se connecter/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/L'adresse e-mail est obligatoire/i)).toBeInTheDocument()
      })

      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('devrait afficher une erreur si l\'email est invalide', async () => {
      render(<LoginForm />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/Adresse e-mail/i)
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /Se connecter/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Veuillez entrer une adresse e-mail valide/i)).toBeInTheDocument()
      })

      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('devrait afficher une erreur si le mot de passe est vide', async () => {
      render(<LoginForm />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/Adresse e-mail/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /Se connecter/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Le mot de passe est obligatoire/i)).toBeInTheDocument()
      })

      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
    })
  })

  describe('Soumission du formulaire', () => {
    it('devrait se connecter avec succès avec des identifiants valides', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admins') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }
        }
        if (table === 'comediens') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 1, auth_user_id: 'test-user-id' },
                }),
              }),
            }),
          }
        }
        if (table === 'annonceurs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }
        }
        return {}
      })

      render(<LoginForm />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/Adresse e-mail/i)
      const passwordInput = screen.getByLabelText(/Mot de passe/i)
      const submitButton = screen.getByRole('button', { name: /Se connecter/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })

    it('devrait afficher une erreur pour des identifiants incorrects', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      })

      render(<LoginForm />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/Adresse e-mail/i)
      const passwordInput = screen.getByLabelText(/Mot de passe/i)
      const submitButton = screen.getByRole('button', { name: /Se connecter/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Identifiants incorrects/i)).toBeInTheDocument()
      })

      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('devrait afficher une erreur si l\'email n\'est pas confirmé', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email not confirmed' },
      })

      render(<LoginForm />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/Adresse e-mail/i)
      const passwordInput = screen.getByLabelText(/Mot de passe/i)
      const submitButton = screen.getByRole('button', { name: /Se connecter/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Veuillez confirmer votre adresse e-mail/i)).toBeInTheDocument()
      })

      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('devrait afficher un loader pendant la connexion', async () => {
      mockSupabase.auth.signInWithPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { user: null }, error: null }), 100))
      )

      render(<LoginForm />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/Adresse e-mail/i)
      const passwordInput = screen.getByLabelText(/Mot de passe/i)
      const submitButton = screen.getByRole('button', { name: /Se connecter/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(screen.getByText(/Connexion en cours/i)).toBeInTheDocument()
    })

    it('devrait désactiver les champs pendant la soumission', async () => {
      mockSupabase.auth.signInWithPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { user: null }, error: null }), 100))
      )

      render(<LoginForm />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/Adresse e-mail/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/Mot de passe/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /Se connecter/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs inattendues', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Network error'))

      render(<LoginForm />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/Adresse e-mail/i)
      const passwordInput = screen.getByLabelText(/Mot de passe/i)
      const submitButton = screen.getByRole('button', { name: /Se connecter/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Une erreur inattendue s'est produite/i)).toBeInTheDocument()
      })
    })

    it('devrait effacer l\'erreur lorsque l\'utilisateur tape dans un champ', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      })

      render(<LoginForm />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/Adresse e-mail/i)
      const passwordInput = screen.getByLabelText(/Mot de passe/i)
      const submitButton = screen.getByRole('button', { name: /Se connecter/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Identifiants incorrects/i)).toBeInTheDocument()
      })

      // L'utilisateur commence à taper à nouveau
      await user.type(emailInput, 'a')

      expect(screen.queryByText(/Identifiants incorrects/i)).not.toBeInTheDocument()
    })
  })
})
