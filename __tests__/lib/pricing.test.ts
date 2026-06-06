import {
  calculateDiscountPercent,
  calculateRoundedDiscountPercent,
  toStripeCents,
  fromStripeCents,
  calculatePlatformFee,
} from '@/lib/pricing'

describe('pricing', () => {
  describe('calculateDiscountPercent', () => {
    it('calcule la réduction brute en pourcentage', () => {
      expect(calculateDiscountPercent(100, 75)).toBe(25)
      expect(calculateDiscountPercent(80, 60)).toBe(25)
    })

    it('ne pré-arrondit pas le résultat', () => {
      expect(calculateDiscountPercent(90, 60)).toBeCloseTo(33.333, 2)
    })
  })

  describe('calculateRoundedDiscountPercent', () => {
    it('arrondit à l’entier le plus proche', () => {
      expect(calculateRoundedDiscountPercent(90, 60)).toBe(33)
    })

    it('renvoie null si le prix de base est invalide', () => {
      expect(calculateRoundedDiscountPercent(0, 0)).toBeNull()
      expect(calculateRoundedDiscountPercent(-10, 5)).toBeNull()
    })
  })

  describe('toStripeCents / fromStripeCents', () => {
    it('convertit euros <-> centimes', () => {
      expect(toStripeCents(12.34)).toBe(1234)
      expect(toStripeCents(10)).toBe(1000)
      expect(fromStripeCents(1234)).toBe(12.34)
    })

    it('arrondit les imprécisions flottantes', () => {
      expect(toStripeCents(19.99)).toBe(1999)
    })
  })

  describe('calculatePlatformFee', () => {
    it('calcule la commission en centimes', () => {
      expect(calculatePlatformFee(1000, 10)).toBe(100)
      expect(calculatePlatformFee(1999, 15)).toBe(300)
    })
  })
})
