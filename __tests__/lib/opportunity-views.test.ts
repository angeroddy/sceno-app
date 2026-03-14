import { countOpportunityViewsForIds } from '@/app/lib/opportunity-views'

describe('countOpportunityViewsForIds', () => {
  it('retourne 0 si aucun id n est fourni', async () => {
    const supabase = {
      from: jest.fn(),
    }

    await expect(countOpportunityViewsForIds(supabase as never, [])).resolves.toBe(0)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('retourne le total de vues sur plusieurs opportunites', async () => {
    const inMock = jest.fn().mockResolvedValue({ count: 14, error: null })
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(),
          in: inMock,
        })),
      })),
    }

    await expect(
      countOpportunityViewsForIds(supabase as never, ['opp-1', 'opp-2'])
    ).resolves.toBe(14)

    expect(inMock).toHaveBeenCalledWith('opportunite_id', ['opp-1', 'opp-2'])
  })

  it('retourne 0 si la requete echoue', async () => {
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(),
          in: jest.fn().mockResolvedValue({ count: null, error: { message: 'boom' } }),
        })),
      })),
    }

    await expect(
      countOpportunityViewsForIds(supabase as never, ['opp-1'])
    ).resolves.toBe(0)
  })
})
