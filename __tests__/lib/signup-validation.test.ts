import {
  isValidPhone,
  normalizeBusinessId,
  normalizeCountry,
  normalizeHumanText,
  normalizePhone,
  normalizePostalCode,
} from '@/app/lib/signup-validation'

describe('signup-validation phone normalization', () => {
  it('normalise un numéro français local vers le format international', () => {
    expect(normalizePhone('06 12 34 56 78')).toBe('+33612345678')
    expect(normalizePhone('01 23 45 67 89')).toBe('+33123456789')
  })

  it('normalise un préfixe international 00 vers +', () => {
    expect(normalizePhone('0033 6 12 34 56 78')).toBe('+33612345678')
  })

  it('rejette les numéros français invalides une fois normalisés', () => {
    expect(isValidPhone('06 12 34 56 7')).toBe(false)
    expect(isValidPhone('+330612345678')).toBe(false)
  })

  it('accepte les numéros français valides au format Stripe', () => {
    expect(isValidPhone('06 12 34 56 78')).toBe(true)
    expect(isValidPhone('+33612345678')).toBe(true)
  })

  it('normalise les textes identitaires et les pays', () => {
    expect(normalizeHumanText('  Jean   Dupont  ')).toBe('Jean Dupont')
    expect(normalizeCountry(' fr ')).toBe('France')
    expect(normalizeCountry('belgium')).toBe('Belgique')
  })

  it('normalise les codes postaux et identifiants légaux', () => {
    expect(normalizePostalCode('75 001', 'France')).toBe('75001')
    expect(normalizePostalCode('h2z1a4', 'Canada')).toBe('H2Z 1A4')
    expect(normalizeBusinessId('123 456 789 00012')).toBe('12345678900012')
  })
})
