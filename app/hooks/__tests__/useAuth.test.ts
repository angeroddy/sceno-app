import { renderHook, waitFor, act } from '@testing-library/react'
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
    ;(global as typeof globalThis & { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ userType: null }),
    })

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
  })

  describe('Initialisation et authentification', () => {
    it('devrait initialiser avec loading = true et isAuthenticated = false', () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      })

      const { result } = renderHook(() => useAuth())

      expect(result.current.loading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
      expect(result.current.userType).toBe(null)
      // let async state updates flush to avoid act warnings
      return waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('devrait définir l\'utilisateur quand une session existe', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })
      ;(global as typeof globalThis & { fetch: jest.Mock }).fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ userType: 'comedian' }),
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

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })
      ;(global as typeof globalThis & { fetch: jest.Mock }).fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ userType: 'advertiser' }),
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.userType).toBe('advertiser')
    })

    it("déconnecte l'utilisateur si son compte est marqué comme supprimé", async () => {
      const mockUser = {
        id: 'deleted-user-id',
        email: 'deleted@example.com',
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })
      mockSupabase.auth.signOut.mockResolvedValue({ error: null })
      ;(global as typeof globalThis & { fetch: jest.Mock }).fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ userType: 'deleted' }),
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      })

      expect(result.current.user).toBe(null)
      expect(result.current.userType).toBe(null)
      expect(mockRouter.push).toHaveBeenCalledWith('/connexion')
    })

    it('devrait gérer le cas où l\'utilisateur n\'a pas de profil', async () => {
      const mockUser = {
        id: 'test-no-profile-id',
        email: 'noProfile@example.com',
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      ;(global as typeof globalThis & { fetch: jest.Mock }).fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ userType: null }),
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

      ;(global as typeof globalThis & { fetch: jest.Mock }).fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ userType: 'comedian' }),
      })

      await act(async () => {
        authStateCallback('SIGNED_IN', { user: mockUser })
      })

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
