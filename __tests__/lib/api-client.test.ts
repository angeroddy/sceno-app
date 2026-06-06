import { apiFetch, ApiError } from '@/app/lib/api/client'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => body,
  } as unknown as Response
}

describe('apiFetch', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('renvoie le JSON typé pour une réponse 2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ value: 42 })) as never

    const data = await apiFetch<{ value: number }>('/api/test')
    expect(data.value).toBe(42)
  })

  it('sérialise json et pose le Content-Type', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ ok: true }))
    global.fetch = fetchMock as never

    await apiFetch('/api/test', { method: 'POST', json: { a: 1 } })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBe(JSON.stringify({ a: 1 }))
    expect(new Headers(init.headers).get('content-type')).toBe('application/json')
  })

  it('lève une ApiError avec le message data.error sur statut non-2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'Interdit' }, 403)) as never

    await expect(apiFetch('/api/test')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Interdit',
    })
  })

  it('expose un message par défaut si pas de data.error', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, 500)) as never

    await expect(apiFetch('/api/test')).rejects.toBeInstanceOf(ApiError)
  })
})
