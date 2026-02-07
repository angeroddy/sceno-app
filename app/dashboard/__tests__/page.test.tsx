import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '../page'

jest.mock('next/image', () => (props: any) => {
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt || 'image'} />
})

jest.mock('next/link', () => {
  return ({ href, children }: any) => <a href={href}>{children}</a>
})

describe('DashboardPage', () => {
  beforeEach(() => {
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        opportunites: [],
        preferences: [],
      }),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('affiche un banner si les préférences ne sont pas configurées', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/Configurez vos préférences/i)).toBeInTheDocument()
    })
  })
})
