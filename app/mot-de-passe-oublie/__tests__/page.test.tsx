import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ForgotPasswordPage from '../page'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { useRouter, useSearchParams } from 'next/navigation'

jest.mock('@/lib/supabase-client', () => ({
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
      signOut: jest.fn(),
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
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })
    ;(createBrowserSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  it("affiche le formulaire de demande de réinitialisation par défaut", () => {
    render(<ForgotPasswordPage />)

    expect(screen.getByText(/Mot de passe oublié/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Envoyer le lien/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Adresse e-mail/i)).toBeInTheDocument()
  })

  it("envoie une demande de réinitialisation avec l'adresse normalisée", async () => {
    render(<ForgotPasswordPage />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Adresse e-mail/i), 'TEST@Example.com')
    await user.click(screen.getByRole('button', { name: /Envoyer le lien/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/password-reset',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            redirectTo: `${window.location.origin}/auth/callback?type=recovery&next=%2Fmot-de-passe-oublie%3Fmode%3Dreset`,
          }),
        })
      )
    })

    expect(screen.getByText(/Si un compte existe avec cette adresse e-mail/i)).toBeInTheDocument()
  })

  it("envoie une demande de réinitialisation contextualisée annonceur", async () => {
    mockSearchParams.get.mockImplementation((key: string) => (key === 'type' ? 'annonceur' : null))

    render(<ForgotPasswordPage />)
    const user = userEvent.setup()

    expect(screen.getByText(/Mot de passe oublié annonceur/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Adresse e-mail/i), 'annonceur@example.com')
    await user.click(screen.getByRole('button', { name: /Envoyer le lien/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/password-reset',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'annonceur@example.com',
            redirectTo: `${window.location.origin}/auth/callback?type=recovery&next=%2Fmot-de-passe-oublie%3Fmode%3Dreset%26type%3Dannonceur`,
          }),
        })
      )
    })

    expect(screen.getByRole('link', { name: /Retour à la connexion/i })).toHaveAttribute(
      'href',
      '/connexion?type=annonceur'
    )
  })

  it("affiche un message clair quand l'envoi de l'e-mail de réinitialisation échoue", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Impossible d'envoyer l'email de réinitialisation. Veuillez réessayer." }),
    })

    render(<ForgotPasswordPage />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Adresse e-mail/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /Envoyer le lien/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Impossible d'envoyer l'email de réinitialisation/i)
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

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    expect(mockRouter.replace).toHaveBeenCalledWith('/connexion')
    expect(screen.queryByText(/Votre mot de passe a bien été mis à jour/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Se connecter maintenant/i })).not.toBeInTheDocument()
  })

  it("ne montre pas d'erreur si le nouveau mot de passe est identique à l'ancien", async () => {
    mockSearchParams.get.mockImplementation((key: string) => (key === 'mode' ? 'reset' : null))
    mockSupabase.auth.updateUser.mockResolvedValue({
      error: { message: 'New password should be different from the old password.' },
    })

    render(<ForgotPasswordPage />)
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByLabelText(/^Nouveau mot de passe$/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/^Nouveau mot de passe$/i), 'Password123')
    await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /Mettre à jour le mot de passe/i }))

    await waitFor(() => {
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })
    expect(mockRouter.replace).toHaveBeenCalledWith('/connexion')
    expect(screen.queryByText(/Impossible de mettre à jour le mot de passe/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Se connecter maintenant/i })).not.toBeInTheDocument()
  })
})
