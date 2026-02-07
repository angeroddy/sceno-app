import { POST } from '@/app/api/admin/cron/route'
import { createServerClient } from '@supabase/ssr'

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

describe('POST /api/admin/cron', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retourne 401 si le secret est incorrect', async () => {
    process.env.CRON_SECRET = 'secret'

    const response = await POST(
      new Request('http://localhost/api/admin/cron', {
        method: 'POST',
        headers: { Authorization: 'Bearer wrong' },
      })
    )

    expect(response.status).toBe(401)
  })

  it('retourne 200 même si aucune opportunité à traiter', async () => {
    process.env.CRON_SECRET = 'secret'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'

    const selectChainWithGt = {
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gt: jest.fn().mockResolvedValue({ data: [] }),
    }

    const selectChainWithLt = {
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockResolvedValue({ data: [] }),
    }

    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockReturnValueOnce(selectChainWithGt)
          .mockReturnValueOnce(selectChainWithLt),
        update: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }

    ;(createServerClient as jest.Mock).mockReturnValue(mockSupabase)

    const response = await POST(
      new Request('http://localhost/api/admin/cron', {
        method: 'POST',
        headers: { Authorization: 'Bearer secret' },
      })
    )

    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.prevente_retirees).toBe(0)
    expect(data.expirees).toBe(0)
  })
})
