import { render, screen, waitFor } from '@testing-library/react'
import PublierOpportunitePage from '../publier/page'
import { createBrowserSupabaseClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'

jest.mock('@/app/lib/supabase-client', () => ({
  createBrowserSupabaseClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('PublierOpportunitePage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }

  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(createBrowserSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('affiche un message si le compte annonceur n’est pas vérifié', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { identite_verifiee: false },
            error: null,
          }),
        }),
      }),
    })

    render(<PublierOpportunitePage />)

    expect(screen.getByText(/Vérification de votre compte/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/Vérification du compte requise/i)).toBeInTheDocument()
    })
  })
})
