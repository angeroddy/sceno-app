import '@testing-library/jest-dom'

// Ensure window.location.origin is stable without triggering navigation
if (typeof window !== 'undefined' && window.location) {
  try {
    Object.defineProperty(window.location, 'origin', {
      value: 'http://localhost:3000',
      writable: true,
    })
  } catch {
    // ignore if jsdom blocks redefine
  }
}

// Minimal polyfill for Request/Headers/Response to satisfy Next.js route handlers in tests
if (typeof globalThis.Headers === 'undefined') {
  class HeadersPolyfill {
    private map = new Map<string, string>()
    constructor(init?: Record<string, string> | [string, string][]) {
      if (Array.isArray(init)) {
        init.forEach(([k, v]) => this.map.set(k.toLowerCase(), String(v)))
      } else if (init) {
        Object.entries(init).forEach(([k, v]) => this.map.set(k.toLowerCase(), String(v)))
      }
    }
    get(name: string) {
      return this.map.get(name.toLowerCase()) ?? null
    }
    set(name: string, value: string) {
      this.map.set(name.toLowerCase(), String(value))
    }
  }
  // @ts-expect-error assign polyfill
  globalThis.Headers = HeadersPolyfill
}

if (typeof globalThis.Request === 'undefined') {
  class RequestPolyfill {
    url: string
    method: string
    headers: Headers
    body?: any
    constructor(input: string, init?: { method?: string; headers?: Record<string, string>; body?: any }) {
      this.url = input
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers || {})
      this.body = init?.body
    }
    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body)
      }
      return this.body
    }
  }
  // @ts-expect-error assign polyfill
  globalThis.Request = RequestPolyfill
}

if (typeof globalThis.Response === 'undefined') {
  class ResponsePolyfill {
    status: number
    headers: any
    private _body: any
    constructor(body?: any, init?: { status?: number; headers?: any }) {
      this._body = body
      this.status = init?.status ?? 200
      this.headers = {
        getSetCookie: () => [],
        get: (name: string) => null,
        set: (name: string, value: string) => {},
        ...init?.headers
      }
    }
    async json() {
      return typeof this._body === 'string' ? JSON.parse(this._body) : this._body
    }
    static json(data: any, init?: { status?: number; headers?: any }) {
      return new ResponsePolyfill(JSON.stringify(data), { status: init?.status, headers: init?.headers })
    }
  }
  // @ts-expect-error assign polyfill
  globalThis.Response = ResponsePolyfill
}

// Mock NextResponse pour les tests
jest.mock('next/server', () => {
  const actualModule = jest.requireActual('next/server')
  return {
    ...actualModule,
    NextResponse: {
      json: (data: any, init?: { status?: number; headers?: any }) => {
        const response = new (globalThis.Response as any)(JSON.stringify(data), { status: init?.status, headers: init?.headers })
        response.json = async () => (typeof data === 'string' ? JSON.parse(data) : data)
        return response
      },
      redirect: (url: string, init?: { status?: number }) => {
        const response = new (globalThis.Response as any)(null, { status: init?.status || 307 })
        response.headers = {
          getSetCookie: () => [],
          get: (name: string) => (name.toLowerCase() === 'location' ? url : null),
          set: (name: string, value: string) => {},
        }
        return response
      },
    },
  }
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any
