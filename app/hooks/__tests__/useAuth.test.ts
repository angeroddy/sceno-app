import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '../useAuth'
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

describe('useAuth', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }

  const mockSupabase = {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(createBrowserSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('Initialisation et authentification', () => {
    it('devrait initialiser avec loading = true et isAuthenticated = false', () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      })
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      const { result } = renderHook(() => useAuth())

      expect(result.current.loading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
      expect(result.current.userType).toBe(null)
    })

    it('devrait définir l\'utilisateur quand une session existe', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
      }

      const mockComedien = { id: 1, auth_user_id: 'test-user-id' }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      // Mock pour la vérification du type d'utilisateur
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockComedien }),
          }),
        }),
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.userType).toBe('comedian')
    })

    it('devrait identifier un utilisateur comme annonceur', async () => {
      const mockUser = {
        id: 'test-advertiser-id',
        email: 'advertiser@example.com',
      }

      const mockAnnonceur = { id: 1, auth_user_id: 'test-advertiser-id' }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      // Mock pour la vérification du type d'utilisateur
      // Premier appel (comedien) retourne null, second (annonceur) retourne l'annonceur
      let callCount = 0
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockImplementation(async () => {
              callCount++
              if (callCount === 1) {
                return { data: null } // Pas un comédien
              }
              return { data: mockAnnonceur } // C'est un annonceur
            }),
          }),
        }),
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.userType).toBe('advertiser')
    })

    it('devrait gérer le cas où l\'utilisateur n\'a pas de profil', async () => {
      const mockUser = {
        id: 'test-no-profile-id',
        email: 'noProfile@example.com',
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      // Mock retournant null pour tous les types d'utilisateurs
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.userType).toBe(null)
    })
  })

  describe('Déconnexion', () => {
    it('devrait déconnecter l\'utilisateur et rediriger vers la page d\'accueil', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      })

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await result.current.logout()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
  })

  describe('Changements d\'état d\'authentification', () => {
    it('devrait réagir aux changements d\'état d\'authentification', async () => {
      let authStateCallback: any

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      })

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)

      // Simuler un changement d'état (connexion)
      const mockUser = {
        id: 'new-user-id',
        email: 'newuser@example.com',
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 1, auth_user_id: 'new-user-id' }
            }),
          }),
        }),
      })

      authStateCallback('SIGNED_IN', { user: mockUser })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.userType).toBe('comedian')
    })
  })

  describe('Cleanup', () => {
    it('devrait se désabonner lors du démontage', () => {
      const unsubscribeMock = jest.fn()

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      })

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeMock } },
      })

      const { unmount } = renderHook(() => useAuth())

      unmount()

      expect(unsubscribeMock).toHaveBeenCalled()
    })
  })
})
