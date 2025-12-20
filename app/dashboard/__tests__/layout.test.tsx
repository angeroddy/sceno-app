import { render, screen, waitFor } from '@testing-library/react'
import DashboardLayout from '../layout'
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter } from 'next/navigation'

// Mock du hook useAuth
jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock des composants enfants
jest.mock('@/components/ui/shadcn-io/navbar-01', () => ({
  Navbar01: ({ isAuthenticated, userType, onLogout }: any) => (
    <div data-testid="navbar">
      <div>Authenticated: {String(isAuthenticated)}</div>
      <div>UserType: {userType}</div>
      <button onClick={onLogout}>Logout</button>
    </div>
  ),
}))

jest.mock('@/app/components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}))

describe('DashboardLayout', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  describe('État de chargement', () => {
    it('devrait afficher un loader pendant le chargement', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        userType: null,
        loading: true,
        logout: jest.fn(),
      })

      render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      expect(screen.getByText('Chargement...')).toBeInTheDocument()
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
    })
  })

  describe('Utilisateur non authentifié', () => {
    it('devrait rediriger vers /connexion si non authentifié', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        userType: null,
        loading: false,
        logout: jest.fn(),
      })

      render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/connexion')
      })

      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
    })

    it('ne devrait pas afficher le contenu si non authentifié', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        userType: null,
        loading: false,
        logout: jest.fn(),
      })

      const { container } = render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Utilisateur authentifié - Comédien', () => {
    it('devrait afficher le layout complet pour un comédien authentifié', () => {
      const mockLogout = jest.fn()

      ;(useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        userType: 'comedian',
        loading: false,
        logout: mockLogout,
      })

      render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      expect(screen.getByTestId('navbar')).toBeInTheDocument()
      expect(screen.getByText('Authenticated: true')).toBeInTheDocument()
      expect(screen.getByText('UserType: comedian')).toBeInTheDocument()
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('devrait appeler la fonction logout quand on clique sur le bouton logout', () => {
      const mockLogout = jest.fn()

      ;(useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        userType: 'comedian',
        loading: false,
        logout: mockLogout,
      })

      render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      const logoutButton = screen.getByText('Logout')
      logoutButton.click()

      expect(mockLogout).toHaveBeenCalled()
    })
  })

  describe('Utilisateur authentifié - Annonceur', () => {
    it('devrait afficher le layout complet pour un annonceur authentifié', () => {
      const mockLogout = jest.fn()

      ;(useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        userType: 'advertiser',
        loading: false,
        logout: mockLogout,
      })

      render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      expect(screen.getByTestId('navbar')).toBeInTheDocument()
      expect(screen.getByText('Authenticated: true')).toBeInTheDocument()
      expect(screen.getByText('UserType: advertiser')).toBeInTheDocument()
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('Transitions d\'état', () => {
    it('devrait passer de loading à authentifié', async () => {
      const mockLogout = jest.fn()

      // Commencer avec loading = true
      const { rerender } = render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      ;(useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        userType: null,
        loading: true,
        logout: mockLogout,
      })

      rerender(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      expect(screen.getByText('Chargement...')).toBeInTheDocument()

      // Passer à authentifié
      ;(useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        userType: 'comedian',
        loading: false,
        logout: mockLogout,
      })

      rerender(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      await waitFor(() => {
        expect(screen.queryByText('Chargement...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
    })

    it('devrait passer de loading à non authentifié et rediriger', async () => {
      // Commencer avec loading = true
      ;(useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        userType: null,
        loading: true,
        logout: jest.fn(),
      })

      const { rerender } = render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      expect(screen.getByText('Chargement...')).toBeInTheDocument()

      // Passer à non authentifié
      ;(useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        userType: null,
        loading: false,
        logout: jest.fn(),
      })

      rerender(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/connexion')
      })
    })
  })

  describe('Rendu des enfants', () => {
    it('devrait afficher plusieurs enfants', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        userType: 'comedian',
        loading: false,
        logout: jest.fn(),
      })

      render(
        <DashboardLayout>
          <div>First Child</div>
          <div>Second Child</div>
        </DashboardLayout>
      )

      expect(screen.getByText('First Child')).toBeInTheDocument()
      expect(screen.getByText('Second Child')).toBeInTheDocument()
    })
  })

  describe('Type d\'utilisateur null', () => {
    it('devrait gérer le cas où userType est null pour un utilisateur authentifié', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        userType: null,
        loading: false,
        logout: jest.fn(),
      })

      render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )

      // Le layout devrait quand même s'afficher
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
      expect(screen.getByTestId('navbar')).toBeInTheDocument()
      // Dans ce cas, userType devrait être 'advertiser' par défaut selon le code
      expect(screen.getByText('UserType: advertiser')).toBeInTheDocument()
    })
  })
})
