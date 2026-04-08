import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProfilPage from '../page'
import { useAuth } from '@/app/hooks/useAuth'
import { createBrowserSupabaseClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { PENDING_COMEDIAN_SIGNUP_PHOTO_SYNCED_EVENT } from '@/app/lib/pending-comedian-photo'

jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

jest.mock('@/app/lib/supabase-client', () => ({
  createBrowserSupabaseClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('ProfilPage', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  const single = jest.fn()
  const eq = jest.fn(() => ({ single }))
  const select = jest.fn(() => ({ eq }))
  const updateEq = jest.fn()
  const update = jest.fn(() => ({ eq: updateEq }))
  const from = jest.fn(() => ({ select, update }))

  const mockSupabase = {
    from,
    auth: {
      signInWithPassword: jest.fn(),
      updateUser: jest.fn(),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()

    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
    })
    ;(createBrowserSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it("recharge le profil quand la photo du signup est synchronisée après l'arrivée sur la page", async () => {
    single
      .mockResolvedValueOnce({
        data: {
          prenom: 'Test',
          nom: 'User',
          email: 'test@example.com',
          photo_url: null,
          lien_demo: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          prenom: 'Test',
          nom: 'User',
          email: 'test@example.com',
          photo_url: 'https://cdn.example.com/avatar.webp',
          lien_demo: null,
        },
        error: null,
      })

    render(<ProfilPage />)

    await screen.findByText('Modification du Profil')
    expect(screen.queryByAltText('Photo de profil')).not.toBeInTheDocument()

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(PENDING_COMEDIAN_SIGNUP_PHOTO_SYNCED_EVENT, {
          detail: {
            userId: 'user-1',
            photoUrl: 'https://cdn.example.com/avatar.webp',
          },
        })
      )
    })

    await waitFor(() => {
      expect(single).toHaveBeenCalledTimes(2)
    })

    const photo = await screen.findByAltText('Photo de profil')
    expect(photo).toHaveAttribute('src', expect.stringContaining('https://cdn.example.com/avatar.webp'))
  })

  it("réessaie le chargement de la photo avec un cache-buster quand le premier rendu échoue", async () => {
    jest.useFakeTimers()

    single.mockResolvedValue({
      data: {
        prenom: 'Test',
        nom: 'User',
        email: 'test@example.com',
        photo_url: 'https://cdn.example.com/avatar.webp',
        lien_demo: null,
      },
      error: null,
    })

    render(<ProfilPage />)

    const photo = await screen.findByAltText('Photo de profil')
    const firstSrc = photo.getAttribute('src')

    fireEvent.error(photo)

    await act(async () => {
      jest.advanceTimersByTime(350)
    })

    await waitFor(() => {
      expect(screen.getByAltText('Photo de profil')).toBeInTheDocument()
      expect(screen.getByAltText('Photo de profil').getAttribute('src')).not.toBe(firstSrc)
    })
  })

  it("ouvre une modale pour changer le mot de passe et exige l'ancien mot de passe", async () => {
    single.mockResolvedValue({
      data: {
        prenom: 'Test',
        nom: 'User',
        email: 'test@example.com',
        photo_url: null,
        lien_demo: null,
      },
      error: null,
    })

    render(<ProfilPage />)

    await screen.findByText('Sécurité')
    fireEvent.click(screen.getByRole('button', { name: /Changer mon mot de passe/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/Mot de passe actuel/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Nouveau mot de passe$/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe$/i), { target: { value: 'Password123' } })
    fireEvent.change(screen.getByLabelText(/Confirmer le mot de passe/i), { target: { value: 'Password123' } })
    fireEvent.click(screen.getByRole('button', { name: /^Mettre à jour$/i }))

    expect(await screen.findByText(/mot de passe actuel est obligatoire/i)).toBeInTheDocument()
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it("vérifie l'ancien mot de passe avant de mettre à jour le nouveau", async () => {
    single.mockResolvedValue({
      data: {
        prenom: 'Test',
        nom: 'User',
        email: 'test@example.com',
        photo_url: null,
        lien_demo: null,
      },
      error: null,
    })

    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null })
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null })

    render(<ProfilPage />)

    await screen.findByText('Sécurité')
    fireEvent.click(screen.getByRole('button', { name: /Changer mon mot de passe/i }))

    fireEvent.change(screen.getByLabelText(/Mot de passe actuel/i), { target: { value: 'AncienPass123' } })
    fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe$/i), { target: { value: 'Password123' } })
    fireEvent.change(screen.getByLabelText(/Confirmer le mot de passe/i), { target: { value: 'Password123' } })
    fireEvent.click(screen.getByRole('button', { name: /^Mettre à jour$/i }))

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'AncienPass123',
      })
    })

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'Password123' })
    })

    expect(await screen.findByText(/Votre mot de passe a bien été mis à jour/i)).toBeInTheDocument()
  })
})
