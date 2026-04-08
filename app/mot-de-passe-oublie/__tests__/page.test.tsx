import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ForgotPasswordPage from '../page'
import { createBrowserSupabaseClient } from '@/app/lib/supabase-client'
import { useRouter, useSearchParams } from 'next/navigation'

jest.mock('@/app/lib/supabase-client', () => ({
  createBrowserSupabaseClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

describe('ForgotPasswordPage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }

  const mockSearchParams = {
    get: jest.fn(),
  }

  const mockSupabase = {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    mockSearchParams.get.mockReturnValue(null)
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
    ;(createBrowserSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it("affiche le formulaire de demande de réinitialisation par défaut", () => {
    render(<ForgotPasswordPage />)

    expect(screen.getByText(/Mot de passe oublié/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Envoyer le lien/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Adresse e-mail/i)).toBeInTheDocument()
  })

  it("envoie une demande de réinitialisation avec l'adresse normalisée", async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })

    render(<ForgotPasswordPage />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Adresse e-mail/i), 'TEST@Example.com')
    await user.click(screen.getByRole('button', { name: /Envoyer le lien/i }))

    await waitFor(() => {
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: `${window.location.origin}/mot-de-passe-oublie?mode=reset`,
        })
      )
    })

    expect(screen.getByText(/Si un compte existe avec cette adresse e-mail/i)).toBeInTheDocument()
  })

  it("affiche un message clair quand Supabase limite l'envoi des e-mails de réinitialisation", async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      error: { message: 'email rate limit exceeded' },
    })

    render(<ForgotPasswordPage />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /Envoyer le lien/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Trop d'e-mails de réinitialisation ont été demandés/i)
      ).toBeInTheDocument()
    })
  })

  it("affiche le formulaire de nouveau mot de passe en mode recovery et met à jour le mot de passe", async () => {
    mockSearchParams.get.mockImplementation((key: string) => (key === 'mode' ? 'reset' : null))
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null })

    render(<ForgotPasswordPage />)
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByLabelText(/^Nouveau mot de passe$/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/^Nouveau mot de passe$/i), 'Password123')
    await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /Mettre à jour le mot de passe/i }))

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'Password123' })
    })

    expect(screen.getByText(/Votre mot de passe a bien été mis à jour/i)).toBeInTheDocument()
  })
})
