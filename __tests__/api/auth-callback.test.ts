import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GET } from '@/app/auth/callback/route'

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('GET /auth/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
    ;(cookies as jest.Mock).mockResolvedValue({
      getAll: jest.fn().mockReturnValue([]),
      set: jest.fn(),
    })
  })

  it('redirige vers error=true si aucun code n’est présent', async () => {
    const response = await GET({
      url: 'http://localhost/auth/callback',
    } as any)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/auth/confirm?error=true')
  })

  it('redirige vers success=true&userType=comedian après confirmation', async () => {
    const comedienUpdateEq = jest.fn().mockResolvedValue({ error: null })
    ;(createServerClient as jest.Mock).mockReturnValue({
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'admins') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: null }),
              })),
            })),
          }
        }
        if (table === 'comediens') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'comedien-1' } }),
              })),
            })),
            update: jest.fn(() => ({
              eq: comedienUpdateEq,
            })),
          }
        }
        if (table === 'annonceurs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: null }),
              })),
            })),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const response = await GET({
      url: 'http://localhost/auth/callback?code=abc123',
    } as any)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost/auth/confirm?success=true&userType=comedian'
    )
  })
})
